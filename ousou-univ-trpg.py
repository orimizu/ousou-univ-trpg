import os
import re
import json
import requests
from flask import Flask, render_template, request, jsonify, send_from_directory, Response
from dotenv import load_dotenv
import google.generativeai as genai
import anthropic
from datetime import datetime

# Load environment variables
load_dotenv()

# Initialize the Flask application - 静的ファイルとテンプレートのパスを明示的に設定
app = Flask(__name__, 
            static_folder='static', 
            template_folder='templates')

# API Keys configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_API_URL = f"{OLLAMA_BASE_URL}/api/generate"
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# Initialize Google Gemini API if key is available
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# Initialize Anthropic client if key is available
claude_client = None
if ANTHROPIC_API_KEY:
    try:
        # 直接Anthropicのクライアントを初期化せず、get_claude_response内で必要に応じて初期化する
        # または、以下のようにhttpxのプロキシ設定を回避する方法も考えられる
        import httpx
        # 古いバージョンのanthropicを使用している場合は以下の方法でも可能
        # claude_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        
        # 新しいバージョンのanthropicを使用している場合は、次のように試してみてください
        claude_client = anthropic.Anthropic(
            api_key=ANTHROPIC_API_KEY,
            # proxiesパラメータを指定しない
        )
    except Exception as e:
        print(f"Error initializing Anthropic client: {e}")
        print("Claude API will not be available through client. Will use direct API calls instead.")

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

# 新しいエンドポイント: 利用可能なOllamaモデルを取得
@app.route('/api/ollama-models', methods=['GET'])
def get_ollama_models():
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags")
        if response.status_code != 200:
            print(f"Error fetching Ollama models: {response.status_code} - {response.text}")
            return jsonify({"error": "Failed to fetch Ollama models"}), 500
            
        # ollamaのレスポンスからモデル情報を抽出
        models = response.json().get('models', [])
        model_names = [model.get('name') for model in models]
        
        return jsonify({"models": model_names})
    except Exception as e:
        print(f"Error fetching Ollama models: {e}")
        return jsonify({"error": "Failed to fetch Ollama models"}), 500

@app.route('/api/game-response', methods=['POST'])
def game_response():
    data = request.json
    
    player_name = data.get('playerName', '')
    department = data.get('department', '')
    stats = data.get('stats', {})
    player_message = data.get('playerMessage', '')
    conversation = data.get('conversation', [])
    model_type = data.get('modelType', 'local')  # local, gemini-flash, gemini-pro, claude
    ollama_model = data.get('ollamaModel', '')  # 選択されたOllamaモデル
    
    # フロントエンドから送信されたAPIキー
    google_api_key = data.get('googleApiKey', '')
    
    # Create prompt for the LLM based on the conversation history
    prompt = create_prompt(player_name, department, stats, player_message, conversation)
    
    # Get response from the appropriate LLM
    if model_type == 'local':
        # 選択されたOllamaモデルを使用
        game_master_response = get_ollama_response(prompt, ollama_model)
    elif model_type == 'gemini-flash':
        game_master_response = get_gemini_response(prompt, "gemini-2.0-flash", google_api_key)
    elif model_type == 'gemini-pro':
        game_master_response = get_gemini_response(prompt, "gemini-2.0-pro-exp-02-05", google_api_key)
    elif model_type == 'claude':
        game_master_response = get_claude_response(prompt)
    else:
        return jsonify({"error": "Invalid model selection"}), 400
    
    # Extract the game master's response and stats from the LLM output
    extracted_data = extract_game_master_response(game_master_response)
    
    return jsonify({
        "gameMasterResponse": extracted_data["text"],
        "statsUpdate": extracted_data["stats_update"]
    })

# 新しいエンドポイント: ゲームデータのエクスポート
@app.route('/api/export-game', methods=['POST'])
def export_game():
    # クライアントから送信されたゲームデータを取得
    game_data = request.json
    
    # ゲームデータをJSON形式に変換
    game_json = json.dumps(game_data, ensure_ascii=False, indent=2)
    
    # 現在の日時をファイル名に含める
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"sakura_ttrpg_save_{timestamp}.json"
    
    # レスポンスとしてJSONファイルを送信
    response = Response(
        game_json,
        mimetype='application/json',
        headers={'Content-Disposition': f'attachment;filename={filename}'}
    )
    
    return response

# 新しいエンドポイント: ゲームデータのインポート
@app.route('/api/import-game', methods=['POST'])
def import_game():
    try:
        # アップロードされたファイルを取得
        if 'gameFile' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
            
        file = request.files['gameFile']
        
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
            
        # ファイルの内容を読み込む
        game_data = json.loads(file.read().decode('utf-8'))
        
        # インポートが成功したことをクライアントに返す
        return jsonify({"success": True, "gameData": game_data})
        
    except Exception as e:
        print(f"Error importing game data: {e}")
        return jsonify({"error": f"Failed to import game data: {str(e)}"}), 500

def create_prompt(player_name, department, stats, player_message, conversation):
    # ステータス値を事前に取得
    academics = stats.get('academics', 1)
    friendship = stats.get('friendship', 1)
    hobbies = stats.get('hobbies', 1)
    romance = stats.get('romance', 1)
    future = stats.get('future', 1)
    
    # Base story content
    base_story = """# 「キャンパスライフ：新たな一歩」

## 基本設定
**舞台**: 東京都内の「桜創大学」（架空）。文系・理系を含む総合大学で、広大なキャンパスと多様なサークル活動で知られている。

**時期**: 4月初旬、新学期が始まったばかり。桜が満開の季節。

**ゲームの目的**: プレイヤーは主人公となり、大学生活を通じて「学業」「友情」「趣味・特技」「恋愛」「将来への展望」の5つのステータスを高めていく。バランス良く成長するか、特定の分野に特化するかはプレイヤー次第。

**ゲームの流れ**: 
1. 各ターンは1週間を表す
2. プレイヤーは週に取る行動を選択（授業に集中する、サークル活動に参加する、アルバイトをする、友人と交流するなど）
3. 選択によってイベントが発生し、ステータスが変動する
4. 1学期（15週間）を終えるとひとつの章が完結
5. 全4学期（2年間）でゲーム完結

**主人公設定**:
- 名前: {player_name}
- 年齢: 18歳（大学1年生）
- 出身: 地方から上京してきたばかり
- 住居: 大学の学生寮
- 学部・学科: {department}
- 初期ステータス: 学業({academics})、友情({friendship})、趣味・特技({hobbies})、恋愛({romance})、将来への展望({future})

**重要NPCたち**:
- 佐藤健太: 同じ寮に住む先輩。大学のことを何でも知っていて頼りになる人物。
- 田中美咲: 同じ学部の明るい性格の女子学生。交友関係が広く、様々なイベント情報に詳しい。
- 山本教授: 主人公が所属する学部の教授。厳格だが学生想いで、将来のキャリアについてのアドバイスをくれる。
- 鈴木浩二: サークルの先輩。情熱的でサークル活動に全力を注いでいる。
- 中村さくら: 図書館でよく見かける別学部の学生。物静かだが、特定の分野について詳しい。

**主なイベント場所**:
- 大学キャンパス（講義棟、図書館、食堂、中庭など）
- 学生寮
- 大学周辺の飲食店街
- サークル活動場所（体育館、音楽室、アトリエなど）
- アルバイト先（カフェ、書店、塾など）"""

    # 個別の変数を使用してフォーマット
    base_story = base_story.format(
        player_name=player_name,
        department=department,
        academics=academics,
        friendship=friendship,
        hobbies=hobbies,
        romance=romance,
        future=future
    )
    
    # Initial setup for the prompt
    prompt = f"""<Description>
あなたはゲームマスターです。
日本の大学生活を舞台としたテーブルトークゲームを管理します。
まずは、大雑把なストーリーラインと、主人公の設定を考えてください。
考察後、<BaseStory></BaseStory>タグの中に、シナリオを進めるのに必要な基本設定を表示してください。
その後、<GameMaster></GameMaster>タグの中にゲームマスターがプレイヤーに語り掛けるようにプレイヤーに対する状況説明を表示してください。
</Description>

まず、日本の大学生活を舞台としたテーブルトークゲームのストーリーラインと主人公の設定を考えてみましょう。

<BaseStory>
{base_story}
</BaseStory>
"""

    # Add initial game master message
    first_gm_message = """<GameMaster>
桜の花びらが舞う4月初旬の朝。あなたは新しい生活への期待と不安が入り混じる気持ちで目を覚まします。窓の外からは、まだ慣れない東京の街の音が聞こえてきます。

今日はついに桜創大学の入学式。地方から憧れの東京の大学に進学し、学生寮での新生活が始まったばかり。昨日は引っ越しで疲れて早々に眠ってしまいましたが、今日からが本当の大学生活の始まりです。

寮の小さな窓から見える桜並木は満開で、新しい出会いと可能性を予感させます。机の上には昨日までに届いた大学からの書類や案内が積まれています。入学式の案内、学部のオリエンテーション情報、サークル勧誘のチラシなど...あなたの選択次第で、これからの大学生活は大きく変わるでしょう。

さあ、あなたはどんな大学生活を送りたいですか？まずは自己紹介から始めましょうか。あなたの名前、選んだ学部、そして大学生活で特に力を入れたいことを教えてください。
</GameMaster>"""
    
    prompt += first_gm_message
    
    # Add conversation history
    for message in conversation:
        if message['speaker'] == 'player':
            prompt += f"\n\n<PC name=\"{player_name}\">\n{message['text']}\n</PC>"
        else:
            prompt += f"\n\n<GameMaster>\n{message['text']}\n</GameMaster>"
    
    # Add the latest player message
    prompt += f"\n\n<PC name=\"{player_name}\">\n{player_message}\n</PC>"
    
    # Final instructions - ステータス更新の指示を追加
    prompt += f"""

<Description>
上記は、テーブルトーク学園ゲームの「桜創大学テーブルトーク」のやりとりのログです。
あなたの役割はゲームマスターです。
<Player>タグは、キャラクターではなくプレイヤーとしての発言を示します。
<PC> タグは、プレイヤーが操るキャラクターの発言や動作を示します。
今、プレイヤーが、PCとして発言したところまでシナリオが進んでいます。
この続きをゲームマスターとして、管理してください。
なお、ゲームマスターとしての発言は、すべて<GameMaster></GameMaster>タグの中で発言するようにお願いします。
もしも、ステータスを更新した場合は、以下のように、<stats></stats>タグの中に、jsonの辞書形式で更新後のステータスの値を記載してください。
<stats>
{{
    "academics": {academics},
    "friendship": {friendship},
    "hobbies": {hobbies},
    "romance": {romance},
    "future": {future}
}}
</stats>
</Description>"""
    
    return prompt

def get_ollama_response(prompt, model=None):
    try:
        # modelパラメータが空または指定なしの場合はデフォルトモデルを使用
        model_to_use = model if model and model.strip() else OLLAMA_MODEL
        
        print(f"Using Ollama model: {model_to_use}")
        
        response = requests.post(
            OLLAMA_API_URL,
            json={
                "model": model_to_use,
                "prompt": prompt,
                "stream": False
            }
        )
        response.raise_for_status()
        return response.json().get('response', '')
    except Exception as e:
        print(f"Error with Ollama API: {e}")
        return "申し訳ありません、LLMとの通信に問題が発生しました。"

def get_gemini_response(prompt, model_name="gemini-2.0-flash", api_key=None):
    try:
        # APIキーの優先順位: 引数 > 環境変数
        used_api_key = api_key or GOOGLE_API_KEY
        
        if not used_api_key:
            return "Gemini API Key not configured. Please provide an API key in the settings."
        
        # 使用するAPIキーで設定を更新
        genai.configure(api_key=used_api_key)
        
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Error with Gemini API: {e}")
        return f"申し訳ありません、LLMとの通信に問題が発生しました: {str(e)}"

def get_claude_response(prompt):
    try:
        if not ANTHROPIC_API_KEY:
            return "Claude API Key not configured."
        
        # クライアントが初期化されていない場合は直接APIを呼び出す
        if not claude_client:
            # 直接APIを呼び出す代替方法
            headers = {
                "Content-Type": "application/json",
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01"
            }
            
            payload = {
                "model": "claude-3-7-sonnet-20250219",
                "max_tokens": 4000,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            }
            
            response = requests.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=payload
            )
            
            if response.status_code != 200:
                print(f"Error from Claude API: {response.status_code} - {response.text}")
                return "申し訳ありません、ClaudeのAPIとの通信に問題が発生しました。"
            
            response_data = response.json()
            return response_data.get("content", [{}])[0].get("text", "")
        
        # クライアントが正常に初期化されている場合はそれを使用
        try:
            response = claude_client.messages.create(
                model="claude-3-7-sonnet-20250219",
                max_tokens=2000,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            return response.content[0].text
        except Exception as client_error:
            print(f"Error using Claude client: {client_error}. Falling back to direct API call.")
            # クライアントエラーの場合、直接APIを呼び出す
            headers = {
                "Content-Type": "application/json",
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01"
            }
            
            payload = {
                "model": "claude-3-7-sonnet-20250219",
                "max_tokens": 4000,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            }
            
            response = requests.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=payload
            )
            
            if response.status_code != 200:
                print(f"Error from Claude API: {response.status_code} - {response.text}")
                return "申し訳ありません、ClaudeのAPIとの通信に問題が発生しました。"
            
            response_data = response.json()
            return response_data.get("content", [{}])[0].get("text", "")
    except Exception as e:
        print(f"Error with Claude API: {e}")
        return "申し訳ありません、ClaudeのAPIとの通信に問題が発生しました。"

def extract_game_master_response(response):
    # Try to extract content between <GameMaster> and </GameMaster> tags
    pattern = r'<GameMaster>(.*?)</GameMaster>'
    matches = re.findall(pattern, response, re.DOTALL)
    
    # Try to extract stats between <stats> and </stats> tags
    stats_pattern = r'<stats>\s*(\{.*?\})\s*</stats>'
    stats_matches = re.findall(stats_pattern, response, re.DOTALL)
    
    stats_update = None
    if stats_matches:
        try:
            # 最後のstatsタグを使用
            stats_json = stats_matches[-1].strip()
            stats_update = json.loads(stats_json)
            print(f"Extracted stats update: {stats_update}")
        except json.JSONDecodeError as e:
            print(f"Error parsing stats JSON: {e}")
    
    if matches:
        # Return the last match (most recent GM response)
        return {
            "text": matches[-1].strip(),
            "stats_update": stats_update
        }
    else:
        # If no tags found, return a fallback message
        return {
            "text": "ゲームマスターからの応答を解析できませんでした。もう一度お試しください。",
            "stats_update": None
        }

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
