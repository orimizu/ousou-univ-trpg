# 桜創大学テーブルトーク（Ousou University Tabletop RPG）

AI言語モデル（LLM）をゲームマスターとして使用する日本の大学生活を舞台にしたテーブルトークRPGです。プレイヤーは新入生として桜創大学での生活を送り、「学業」「友情」「趣味・特技」「恋愛」「将来への展望」の5つのステータスを成長させていきます。

![桜創大学テーブルトーク](https://github.com/orimizu/ousou-univ-trpg/blob/main/img/OusouUniversityTRPG.jpg)

上記画像は、イメージです。現状、画像は表示されません。

### 開始画面

![桜創大学テーブルトーク 開始画面](https://github.com/orimizu/ousou-univ-trpg/blob/main/img/OusouUniversityTRPG-Start.png)

### ゲーム中の画面

![桜創大学テーブルトーク ゲーム画面](https://github.com/orimizu/ousou-univ-trpg/blob/main/img/OusouUniversityTRPG-Play.png)

## 機能

- 🎮 AIがゲームマスターを担当するテーブルトークRPG
- 🏫 日本の大学を舞台にしたリアルな学園生活シミュレーション
- 📊 プレイヤーの選択によって変動する5つのステータス
- 🔄 AIによる自動ステータス更新機能
- 💾 ゲームデータのセーブ・ロード機能
- 🤖 複数のAIモデル対応（ローカルLLM、Gemini、Claude）

## 技術スタック

- **バックエンド**: Python + Flask
- **フロントエンド**: HTML + CSS + JavaScript
- **AI・LLM**: 
  - ローカルLLM（[Ollama](https://ollama.ai/)）
  - Google Gemini
  - Anthropic Claude

## インストール方法

### 前提条件

- Python 3.8以上
- [Ollama](https://ollama.ai/)（ローカルLLM利用時）
- Google GeminiまたはAnthropic Claude API（オプション）

### 1. リポジトリのクローン

```bash
git clone https://github.com/orimizu/ousou-univ-trpg.git
cd ousou-univ-trpg
```

### 2. 仮想環境のセットアップと依存パッケージのインストール

```bash
python -m venv venv
source venv/bin/activate  # Windowsの場合: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. 環境変数の設定

`dotenv_orig.sh`をコピーして、`dotenv.sh` ファイルを作成します。

```
cp dotenv_orig.sh dotenv.sh
```

`dot_env.sh`ファイルを編集し、必要なAPI設定を行います：

```
# Ollama API Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3

# Google Gemini API Key
GOOGLE_API_KEY=your_gemini_api_key_here

# Anthropic Claude API Key
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## 実行方法

### 1. Ollamaの起動（ローカルLLM利用時）

```bash
ollama serve
```

別のターミナルで使用したいモデルがインストールされていることを確認：

```bash
ollama list
```

必要に応じて、使いたいモデルをダウンロード：

```bash
ollama pull llama3
```

### 2. アプリケーションの起動

```bash
python ousou-univ-trpg.py
```

### 3. ブラウザでアクセス

ブラウザで以下のURLにアクセスします：

```
http://＜＜起動したサーバーのIPアドレス＞＞:5000
```

※ブラウザを使用するPCと同じPCで起動している場合は、`http:localhost:5000` でも問題ありません。

## ゲームの内容

### 基本設定

**舞台**: 東京都内の「桜創大学」（架空）。文系・理系を含む総合大学で、広大なキャンパスと多様なサークル活動で知られています。

**時期**: 4月初旬、新学期が始まったばかり。桜が満開の季節。

**ゲームの目的**: プレイヤーは主人公となり、大学生活を通じて5つのステータスを高めていきます。バランス良く成長するか、特定の分野に特化するかはプレイヤー次第です。

**ステータス**:
- 学業: 授業や研究での成績
- 友情: 友人関係の深さと広さ
- 趣味・特技: 自分の興味や能力の発展
- 恋愛: 恋愛関係の充実度
- 将来への展望: キャリアや人生設計

**ゲームの流れ**: 
1. 各ターンは1週間を表します
2. プレイヤーは週に取る行動を選択します（授業に集中する、サークル活動に参加する、アルバイトをする、友人と交流するなど）
3. 選択によってイベントが発生し、ステータスが変動します
4. 1学期（15週間）を終えるとひとつの章が完結します
5. 全4学期（2年間）でゲーム完結します

### 重要NPCたち

- **佐藤健太**: 同じ寮に住む先輩。大学のことを何でも知っていて頼りになる人物。
- **田中美咲**: 同じ学部の明るい性格の女子学生。交友関係が広く、様々なイベント情報に詳しい。
- **山本教授**: 主人公が所属する学部の教授。厳格だが学生想いで、将来のキャリアについてのアドバイスをくれる。
- **鈴木浩二**: サークルの先輩。情熱的でサークル活動に全力を注いでいる。
- **中村さくら**: 図書館でよく見かける別学部の学生。物静かだが、特定の分野について詳しい。

## 操作方法

### キャラクター作成

1. **名前を入力**: キャラクターの名前を入力します。
2. **学部を選択**: 「文学部」「経済学部」「理工学部」「医学部」「芸術学部」から選びます。
3. **初期ステータスの設定**: 5つのステータスに合計12ポイントを振り分けます（各ステータス最低1、最高5）。
4. **決定ボタン**を押してゲームを開始します。

### ゲームプレイ

1. **テキストでコミュニケーション**: テキスト入力によってゲームマスター（AI）と会話しながらゲームを進めます。
2. **ステータス更新の確認**: AIがプレイヤーの選択に応じてステータスを更新すると、右上に通知が表示されます。
3. **セーブ/ロード**: 「セーブ」ボタンでゲームの状態を保存、「ロード」ボタンで保存したゲームを読み込めます。

### AIモデルの選択

画面下部のドロップダウンメニューから使用するAIモデルを選択できます：

- **ローカルLLM (Ollama)**: ローカルで動作するLLMモデルを使用します。
- **Gemini 2.0 Flash**: Google Geminiの高速モデルを使用します。
- **Gemini 2.0 Pro Exp**: Google Geminiの高性能モデルを使用します。
- **Claude 3.7 Sonnet**: Anthropic Claudeの高性能モデルを使用します。

「ローカルLLM」選択時には、使用するOllamaモデルを選択することもできます。

## ライセンス

MIT License

## 作者

りゅうり/織水流離(Ryuuri Orimizu)

Twitter(X): @ryuuri_tweet
Youtube: https://www.youtube.com/@ryuuri
GitHub: https://github.com/orimizu

---

カスタマイズやフィードバックは大歓迎です！問題や提案があれば、GitHubのIssueやPull Requestでお知らせください。
