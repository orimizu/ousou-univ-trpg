# 桜創大学テーブルトーク 詳細設計書

## 1. プロジェクト概要

桜創大学テーブルトーク（Ousou University Tabletop RPG）は、AI言語モデル（LLM）をゲームマスターとして使用する、日本の大学生活を舞台にしたテーブルトークRPGアプリケーションです。プレイヤーは新入生として架空の「桜創大学」での生活を送り、「学業」「友情」「趣味・特技」「恋愛」「将来への展望」の5つのステータスを成長させていきます。

## 2. システムアーキテクチャ

### 2.1 技術スタック

- **バックエンド**: Python 3.8以上 + Flask
- **フロントエンド**: HTML + CSS + JavaScript（クライアントサイドレンダリング）
- **AI/LLM連携**:
  - Ollama API（ローカルLLM）
  - Google Gemini API
  - Anthropic Claude API

### 2.2 システム構成図

```
+------------------+        +-------------------+        +---------------+
|                  |        |                   |        |  LLM Services |
|   Web Browser    | <----> |  Flask Server    | <----> |  - Ollama     |
|   (HTML/CSS/JS)  |        |  (Python)        |        |  - Gemini     |
|                  |        |                   |        |  - Claude     |
+------------------+        +-------------------+        +---------------+
```

## 3. コア機能仕様

### 3.1 ゲームロジック

#### 3.1.1 ステータスシステム

- **ステータス種類**: 「学業」「友情」「趣味・特技」「恋愛」「将来への展望」の5種類
- **ステータス値範囲**: 各ステータス1〜5の整数値
- **初期ステータス設定**: 合計12ポイントをプレイヤーが自由に割り振り（最小値1）

#### 3.1.2 ゲーム進行

- **時間進行**: 1ターンが大学生活の1週間に相当
- **学期制**: 1学期15週間、全4学期（2年間）で完結
- **選択の影響**: プレイヤーの選択によってイベント発生し、ステータス変動
- **ステータス更新**: LLMが状況とプレイヤーの選択に基づいて判断

### 3.2 LLM連携

#### 3.2.1 プロンプト設計

- ゲームマスターとしての役割と世界観設定を提示
- プレイヤー情報（名前、学部、ステータス値）を含む
- 会話履歴を維持し、一貫性のある物語を提供
- ステータス更新用の特殊タグ形式を指定
  - `<GameMaster></GameMaster>`: ゲームマスターの発言用
  - `<stats></stats>`: ステータス更新用JSON情報

#### 3.2.2 サポートされるLLMモデル

- **ローカルLLM**: Ollama経由の各種モデル（llama3など）
- **Gemini**: 「gemini-2.0-flash」および「gemini-2.0-pro-exp-02-05」
- **Claude**: 「claude-3-7-sonnet-20250219」

### 3.3 セーブ/ロード機能

- **セーブデータ形式**: JSON
- **保存内容**: キャラクター情報、ステータス、会話履歴、設定情報
- **エクスポート/インポート**: ローカルファイルへの保存と読み込み

## 4. モジュール詳細設計

### 4.1 バックエンド (ousou-univ-trpg.py)

#### 4.1.1 メインモジュール構成

- **環境設定**: 環境変数読み込み、APIキー設定
- **Flaskアプリケーション初期化**: ルート設定、静的ファイル提供
- **APIエンドポイント**: ゲーム応答、モデル情報、セーブ/ロード処理
- **LLM連携関数**: 各LLMサービス（Ollama, Gemini, Claude）への接続処理
- **ユーティリティ関数**: プロンプト生成、レスポンス解析

#### 4.1.2 主要APIエンドポイント

| エンドポイント | メソッド | 機能 |
|--------------|---------|------|
| `/` | GET | メインアプリケーションページ表示 |
| `/static/<path>` | GET | 静的ファイル提供 |
| `/api/ollama-models` | GET | 利用可能なOllamaモデル一覧取得 |
| `/api/game-response` | POST | プレイヤーメッセージに対するAI応答取得 |
| `/api/export-game` | POST | ゲーム状態をJSONファイルにエクスポート |
| `/api/import-game` | POST | JSONファイルからゲーム状態をインポート |

#### 4.1.3 LLM連携処理

- **Ollama**: ローカルサーバー上のOllamaモデルと通信
  - `/api/generate`エンドポイントにJSONデータを送信
  - 非ストリーミングモードでレスポンス取得

- **Gemini**: Google Gemini APIとの通信
  - `google.generativeai`ライブラリ使用
  - 指定されたモデル名で生成リクエスト

- **Claude**: Anthropic Claude APIとの通信
  - クライアントライブラリまたは直接APIリクエスト
  - エラー発生時のフォールバック対応

#### 4.1.4 ユーティリティ関数

- **create_prompt**: ゲームのプロンプトを生成
  - 基本設定、キャラクター情報、会話履歴を含む
  - LLM用の特殊タグを追加

- **extract_game_master_response**: LLMの応答から情報を抽出
  - `<GameMaster></GameMaster>`から応答テキスト抽出
  - `<stats></stats>`からJSONステータス情報抽出

### 4.2 フロントエンド

#### 4.2.1 HTMLレイアウト (index.html)

- **ゲーム設定画面**: 基本ルール、世界観、NPCリスト表示
- **キャラクター作成画面**: 名前、学部選択、ステータス設定
- **会話画面**: チャットインターフェース、メッセージ表示、入力欄
- **モデル選択インターフェース**: LLMモデル切り替えUI
- **セーブ/ロード機能**: ボタンとファイル選択UI

#### 4.2.2 スタイル設計 (styles.css)

- **レスポンシブデザイン**: モバイル対応レイアウト
- **テーマデザイン**: 桜をモチーフとした配色
  - プライマリカラー: `#e85a71`（桜ピンク）
  - セカンダリカラー: `#4ea1d3`（空色）
- **UIコンポーネント**:
  - メッセージバブル（プレイヤー/GM）
  - ステータス調整コントロール
  - 通知表示

#### 4.2.3 スクリプト機能 (script.js)

- **ゲーム状態管理**: キャラクター情報、ステータス、会話履歴保持
- **UI制御**: 画面切り替え、ボタン状態管理、メッセージ表示
- **ステータス操作**: 値増減、上限チェック、残りポイント計算
- **API通信**: サーバーとの非同期通信処理
- **セーブ/ロード処理**: ゲームデータのJSON操作
- **モデル選択**: LLMモデル切り替え、Ollamaモデル一覧取得

## 5. データモデル

### 5.1 ゲーム状態オブジェクト

```javascript
gameState = {
    characterName: string,       // プレイヤーキャラクター名
    department: string,          // 所属学部
    stats: {                     // ステータス値
        academics: number,       // 学業 (1-5)
        friendship: number,      // 友情 (1-5)
        hobbies: number,         // 趣味・特技 (1-5)
        romance: number,         // 恋愛 (1-5)
        future: number           // 将来への展望 (1-5)
    },
    remainingPoints: number,     // ステータス割り振り残ポイント
    conversation: [              // 会話履歴
        {
            speaker: string,     // "player" または "gamemaster"
            text: string         // メッセージ内容
        }
    ],
    loading: boolean,            // 読み込み中フラグ
    modelType: string,           // 使用中のLLMタイプ
    ollamaModel: string          // 選択されたOllamaモデル名
}
```

### 5.2 APIリクエスト/レスポンス形式

#### 5.2.1 ゲーム応答リクエスト（/api/game-response）

```javascript
{
    playerName: string,          // プレイヤー名
    department: string,          // 所属学部
    stats: {                     // 現在のステータス
        academics: number,
        friendship: number,
        hobbies: number,
        romance: number,
        future: number
    },
    playerMessage: string,       // プレイヤーからの最新メッセージ
    conversation: array,         // 会話履歴配列
    modelType: string,           // 使用するLLMタイプ
    ollamaModel: string          // 選択されたOllamaモデル名（ローカルLLM使用時）
}
```

#### 5.2.2 ゲーム応答レスポンス

```javascript
{
    gameMasterResponse: string,  // ゲームマスターの応答テキスト
    statsUpdate: {               // 更新されたステータス（null = 更新なし）
        academics: number,
        friendship: number,
        hobbies: number,
        romance: number,
        future: number
    }
}
```

#### 5.2.3 セーブデータ形式

```javascript
{
    characterName: string,       // プレイヤー名
    department: string,          // 所属学部
    stats: object,               // ステータス値
    conversation: array,         // 会話履歴
    modelType: string,           // 使用中のLLMタイプ
    ollamaModel: string          // 選択されたOllamaモデル名
}
```

## 6. 拡張性と今後の展望

### 6.1 拡張可能な機能

- **追加LLMサポート**: 新たなLLMサービスの追加
- **マルチプレイヤー**: 複数プレイヤーによる共同プレイ
- **イベントシステム**: 事前定義されたイベントとランダムイベント
- **UIテーマカスタマイズ**: 季節や状況に合わせた背景変更

### 6.2 潜在的な改善点

- **ストリーミングレスポンス**: リアルタイムでの応答表示機能
- **キャラクター画像生成**: AIによるキャラクターアバター生成
- **音声インターフェース**: 音声入力と音声出力サポート
- **データ分析ダッシュボード**: プレイ統計、選択傾向の可視化

## 7. 開発・運用関連

### 7.1 必要依存パッケージ

- Flask==2.3.3
- python-dotenv==1.0.0
- requests==2.31.0
- google-generativeai==0.3.1
- anthropic==0.5.0

### 7.2 環境変数設定

- `OLLAMA_BASE_URL`: Ollama APIのベースURL
- `OLLAMA_MODEL`: デフォルトのOllamaモデル名
- `GOOGLE_API_KEY`: Google Gemini APIキー
- `ANTHROPIC_API_KEY`: Anthropic Claude APIキー

### 7.3 デプロイメント

- ローカル開発環境: Python仮想環境 + Ollama
- 本番環境オプション: クラウドサーバー + 外部LLM API

## 8. ゲームコンテンツ設計

### 8.1 世界観設定

- **舞台**: 東京都内の「桜創大学」（架空）
- **時期**: 4月初旬（新学期開始、桜満開）
- **環境**: 大学キャンパス、学生寮、周辺施設

### 8.2 NPCキャラクター

| 名前 | 役割 | 特徴 |
|------|------|------|
| 佐藤健太 | 先輩寮生 | 大学情報に詳しい、頼りになる |
| 田中美咲 | 同学部学生 | 明るい性格、交友関係が広い |
| 山本教授 | 学部教授 | 厳格だが学生想い、キャリア相談可能 |
| 鈴木浩二 | サークル先輩 | 情熱的、サークル活動熱心 |
| 中村さくら | 別学部学生 | 物静か、特定分野に詳しい |

### 8.3 プレイヤーキャラクター設定

- **年齢**: 18歳（大学1年生）
- **出身**: 地方から上京してきたばかり
- **住居**: 大学の学生寮
- **学部選択肢**: 文学部、経済学部、理工学部、医学部、芸術学部

## 9. ライセンスと著作権情報

- **ライセンス**: MIT License
- **著作権**: Copyright (c) 2025 orimizu
- **作者情報**:
  - 名前: りゅうり/織水流離(Ryuuri Orimizu)
  - Twitter(X): @ryuuri_tweet
  - YouTube: https://www.youtube.com/@ryuuri
  - GitHub: https://github.com/orimizu
