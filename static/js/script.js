document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const gameSetupPane = document.getElementById('game-setup');
    const characterSetupPane = document.getElementById('character-setup');
    const conversationPane = document.getElementById('conversation');
    const characterNameInput = document.getElementById('character-name');
    const departmentSelect = document.getElementById('department');
    const remainingPointsDisplay = document.getElementById('remaining-points');
    const resetStatsButton = document.getElementById('reset-stats');
    const confirmCharacterButton = document.getElementById('confirm-character');
    const chatMessagesContainer = document.getElementById('chat-messages');
    const playerInputField = document.getElementById('player-input');
    const sendMessageButton = document.getElementById('send-message');
    
    // セーブ/ロード要素
    const exportGameButton = document.getElementById('export-game');
    const importGameFileInput = document.getElementById('import-game-file');
    
    // モデル選択要素
    const modelTypeSelect = document.getElementById('model-type');
    const ollamaModelSelect = document.getElementById('ollama-model');
    const ollamaModelContainer = document.getElementById('ollama-model-container');

    // Game State
    const gameState = {
        characterName: '',
        department: '',
        stats: {
            academics: 1,
            friendship: 1,
            hobbies: 1,
            romance: 1,
            future: 1
        },
        remainingPoints: 7,
        conversation: [],
        loading: false,
        modelType: 'local',
        ollamaModel: '' // 選択されたOllamaモデル
    };

    // ページロード時にOllamaモデル一覧を取得
    async function fetchOllamaModels() {
        try {
            // Ollamaモデルを読み込み中の表示
            ollamaModelSelect.innerHTML = '<option value="">読み込み中...</option>';
            
            const response = await fetch('/api/ollama-models');
            if (!response.ok) {
                throw new Error(`Failed to fetch Ollama models: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            const models = data.models || [];
            
            // モデルセレクトをクリアして新しいオプションを追加
            ollamaModelSelect.innerHTML = '';
            
            // デフォルトオプションを最初に追加
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'デフォルト';
            ollamaModelSelect.appendChild(defaultOption);
            
            if (models.length === 0) {
                // モデルが見つからない場合のメッセージを追加
                const noModelsOption = document.createElement('option');
                noModelsOption.value = 'no-models';
                noModelsOption.textContent = 'モデルが見つかりません';
                noModelsOption.disabled = true;
                ollamaModelSelect.appendChild(noModelsOption);
            } else {
                // 利用可能なモデルを追加
                models.forEach(modelName => {
                    const option = document.createElement('option');
                    option.value = modelName;
                    option.textContent = modelName;
                    ollamaModelSelect.appendChild(option);
                });
            }
            
            // デフォルトを選択
            gameState.ollamaModel = '';
            ollamaModelSelect.value = '';
            
            console.log('Fetched Ollama models:', models);
        } catch (error) {
            console.error('Error fetching Ollama models:', error);
            
            // エラーの場合もデフォルトオプションを追加
            ollamaModelSelect.innerHTML = '';
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'デフォルト';
            ollamaModelSelect.appendChild(defaultOption);
            
            // エラーメッセージを表示
            const errorOption = document.createElement('option');
            errorOption.value = 'error';
            errorOption.textContent = 'エラー: モデルを取得できません';
            errorOption.disabled = true;
            ollamaModelSelect.appendChild(errorOption);
        }
    }
    
    // ページ読み込み時にOllamaモデルを取得
    fetchOllamaModels();
    
    // モデルタイプの変更イベントリスナー
    modelTypeSelect.addEventListener('change', () => {
        gameState.modelType = modelTypeSelect.value;
        
        // Localモデル選択時のみOllamaモデル選択を表示
        if (gameState.modelType === 'local') {
            ollamaModelContainer.style.display = 'flex';
        } else {
            ollamaModelContainer.style.display = 'none';
        }
        
        console.log('Model type changed to:', gameState.modelType);
    });
    
    // Ollamaモデル選択イベントリスナー
    ollamaModelSelect.addEventListener('change', () => {
        gameState.ollamaModel = ollamaModelSelect.value;
        console.log('Ollama model changed to:', gameState.ollamaModel);
    });
    
    // 初期表示設定（ページロード時）
    if (gameState.modelType === 'local') {
        ollamaModelContainer.style.display = 'flex';
    } else {
        ollamaModelContainer.style.display = 'none';
    }

    // コンソールにステータス初期値を出力して確認
    console.log('Initial game state:', gameState);

    // Initialize stat controls
    const plusButtons = document.querySelectorAll('.plus-btn');
    const minusButtons = document.querySelectorAll('.minus-btn');
    
    // コンソールに選択されたボタン要素を出力して確認
    console.log('Plus buttons:', plusButtons);
    console.log('Minus buttons:', minusButtons);

    // プラスボタンのイベントリスナー
    plusButtons.forEach(btn => {
        btn.addEventListener('click', (event) => {
            // イベント伝播を停止
            event.preventDefault();
            event.stopPropagation();
            
            const stat = btn.getAttribute('data-stat');
            console.log('Plus button clicked for stat:', stat);
            incrementStat(stat);
        });
    });

    // マイナスボタンのイベントリスナー
    minusButtons.forEach(btn => {
        btn.addEventListener('click', (event) => {
            // イベント伝播を停止
            event.preventDefault();
            event.stopPropagation();
            
            const stat = btn.getAttribute('data-stat');
            console.log('Minus button clicked for stat:', stat);
            decrementStat(stat);
        });
    });

    // Stat Manipulation Functions
    function incrementStat(stat) {
        if (gameState.remainingPoints > 0 && gameState.stats[stat] < 5) {
            gameState.stats[stat]++;
            gameState.remainingPoints--;
            console.log(`Incremented ${stat} to ${gameState.stats[stat]}, remaining points: ${gameState.remainingPoints}`);
            updateStatsDisplay();
        } else {
            console.log(`Cannot increment ${stat}: remaining points = ${gameState.remainingPoints}, current value = ${gameState.stats[stat]}`);
        }
    }

    function decrementStat(stat) {
        if (gameState.stats[stat] > 1) {
            gameState.stats[stat]--;
            gameState.remainingPoints++;
            console.log(`Decremented ${stat} to ${gameState.stats[stat]}, remaining points: ${gameState.remainingPoints}`);
            updateStatsDisplay();
        } else {
            console.log(`Cannot decrement ${stat}: current value = ${gameState.stats[stat]}`);
        }
    }

    function resetStats() {
        Object.keys(gameState.stats).forEach(stat => {
            gameState.stats[stat] = 1;
        });
        gameState.remainingPoints = 7;
        updateStatsDisplay();
        console.log('Stats reset. Current state:', gameState);
    }

    function updateStatsDisplay() {
        Object.keys(gameState.stats).forEach(stat => {
            const element = document.getElementById(`${stat}-value`);
            if (element) {
                element.textContent = gameState.stats[stat];
                console.log(`Updated ${stat} display to ${gameState.stats[stat]}`);
            } else {
                console.error(`Element with id ${stat}-value not found!`);
            }
        });
        
        if (remainingPointsDisplay) {
            remainingPointsDisplay.textContent = `(残りポイント: ${gameState.remainingPoints})`;
            console.log(`Updated remaining points display to ${gameState.remainingPoints}`);
        } else {
            console.error('Remaining points display element not found!');
        }
    }

    // Reset Button Event
    resetStatsButton.addEventListener('click', resetStats);

    // Confirm Character Event
    confirmCharacterButton.addEventListener('click', () => {
        gameState.characterName = characterNameInput.value.trim();
        gameState.department = departmentSelect.value;

        if (!gameState.characterName) {
            alert('名前を入力してください');
            return;
        }

        console.log('Character confirmed:', gameState);

        // Hide setup panes, show conversation
        gameSetupPane.classList.add('hidden');
        characterSetupPane.classList.add('hidden');
        conversationPane.classList.remove('hidden');

        // Add first GM message (fixed)
        addGameMasterMessage(`桜の花びらが舞う4月初旬の朝。あなたは新しい生活への期待と不安が入り混じる気持ちで目を覚まします。窓の外からは、まだ慣れない東京の街の音が聞こえてきます。

今日はついに桜創大学の入学式。地方から憧れの東京の大学に進学し、学生寮での新生活が始まったばかり。昨日は引っ越しで疲れて早々に眠ってしまいましたが、今日からが本当の大学生活の始まりです。

寮の小さな窓から見える桜並木は満開で、新しい出会いと可能性を予感させます。机の上には昨日までに届いた大学からの書類や案内が積まれています。入学式の案内、学部のオリエンテーション情報、サークル勧誘のチラシなど...あなたの選択次第で、これからの大学生活は大きく変わるでしょう。

さあ、あなたはどんな大学生活を送りたいですか？まずは自己紹介から始めましょうか。あなたの名前、選んだ学部、そして大学生活で特に力を入れたいことを教えてください。`);

        // Enable player input
        playerInputField.disabled = false;
        sendMessageButton.disabled = false;
        playerInputField.focus();
    });

    // Chat Functionality
    sendMessageButton.addEventListener('click', sendPlayerMessage);
    playerInputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendPlayerMessage();
        }
    });

    function sendPlayerMessage() {
        const message = playerInputField.value.trim();
        if (!message || gameState.loading) return;

        // Add player message to chat
        addPlayerMessage(message);
        
        // Disable input while waiting for response
        gameState.loading = true;
        playerInputField.disabled = true;
        sendMessageButton.disabled = true;
        playerInputField.value = '';

        // Request response from server/LLM
        requestGameMasterResponse(message)
            .then(response => {
                // Add GM response to chat
                addGameMasterMessage(response);
                
                // Re-enable input
                gameState.loading = false;
                playerInputField.disabled = false;
                sendMessageButton.disabled = false;
                playerInputField.focus();
            })
            .catch(error => {
                console.error('Error getting GM response:', error);
                addGameMasterMessage('申し訳ありません、エラーが発生しました。もう一度お試しください。');
                
                // Re-enable input
                gameState.loading = false;
                playerInputField.disabled = false;
                sendMessageButton.disabled = false;
                playerInputField.focus();
            });
    }

    function addPlayerMessage(text) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message player-message';
        messageElement.textContent = text;
        
        chatMessagesContainer.appendChild(messageElement);
        scrollToBottom();
        
        // Add to game state
        gameState.conversation.push({
            speaker: 'player',
            text: text
        });
    }

    function addGameMasterMessage(text) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message gamemaster-message';
        
        // Replace newlines with <br> tags
        messageElement.innerHTML = text.replace(/\n/g, '<br>');
        
        chatMessagesContainer.appendChild(messageElement);
        scrollToBottom();
        
        // Add to game state
        gameState.conversation.push({
            speaker: 'gamemaster',
            text: text
        });
    }

    function scrollToBottom() {
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }

    // API Communication
    async function requestGameMasterResponse(playerMessage) {
        try {
            console.log('Sending request to server with game state:', {
                playerName: gameState.characterName,
                department: gameState.department,
                stats: gameState.stats,
                playerMessage: playerMessage,
                modelType: gameState.modelType,
                ollamaModel: gameState.ollamaModel
            });
            
            const response = await fetch('/api/game-response', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    playerName: gameState.characterName,
                    department: gameState.department,
                    stats: gameState.stats,
                    playerMessage: playerMessage,
                    conversation: gameState.conversation,
                    modelType: gameState.modelType,
                    ollamaModel: gameState.ollamaModel
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed with status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Received response from server:', data);
            
            // ステータス更新がある場合は適用
            if (data.statsUpdate) {
                updatePlayerStats(data.statsUpdate);
            }
            
            return data.gameMasterResponse;
        } catch (error) {
            console.error('Error in API request:', error);
            throw error;
        }
    }

    // ステータス更新処理
    function updatePlayerStats(statsUpdate) {
        console.log('Updating player stats:', statsUpdate);
        
        // 各ステータスを更新
        Object.keys(statsUpdate).forEach(stat => {
            if (gameState.stats.hasOwnProperty(stat)) {
                // 値を1〜5の範囲に制限
                const newValue = Math.max(1, Math.min(5, statsUpdate[stat]));
                gameState.stats[stat] = newValue;
            }
        });
        
        // 残りポイントを再計算
        gameState.remainingPoints = 12 - Object.values(gameState.stats).reduce((sum, value) => sum + value, 0);
        
        // UIを更新
        updateStatsDisplay();
        
        // ステータス変更通知
        displayStatsChangeNotification();
    }

    // ステータス変更通知の表示
    function displayStatsChangeNotification() {
        const notification = document.createElement('div');
        notification.className = 'stats-notification';
        notification.innerHTML = `
            <div class="stats-notification-header">ステータスが更新されました</div>
            <div class="stats-notification-content">
                <div>学業: ${gameState.stats.academics}</div>
                <div>友情: ${gameState.stats.friendship}</div>
                <div>趣味・特技: ${gameState.stats.hobbies}</div>
                <div>恋愛: ${gameState.stats.romance}</div>
                <div>将来への展望: ${gameState.stats.future}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 3秒後に通知を消す
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, 3000);
    }

    // ゲームデータのエクスポート機能
    exportGameButton.addEventListener('click', async () => {
        try {
            // エクスポートするデータを準備
            const exportData = {
                characterName: gameState.characterName,
                department: gameState.department,
                stats: gameState.stats,
                conversation: gameState.conversation,
                modelType: gameState.modelType,
                ollamaModel: gameState.ollamaModel
            };
            
            console.log('Exporting game data:', exportData);
            
            // サーバーにデータを送信してファイルとして保存
            const response = await fetch('/api/export-game', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(exportData)
            });
            
            if (!response.ok) {
                throw new Error('Export failed');
            }
            
            // レスポンスからBlobを作成
            const blob = await response.blob();
            
            // ブラウザでダウンロードを開始
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `sakura_ttrpg_save_${timestamp}.json`;
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            // クリーンアップ
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            console.log('Game data exported successfully');
        } catch (error) {
            console.error('Error exporting game data:', error);
            alert('ゲームデータのエクスポートに失敗しました');
        }
    });
    
    // ゲームデータのインポート機能
    importGameFileInput.addEventListener('change', async (event) => {
        try {
            const file = event.target.files[0];
            if (!file) return;
            
            // ファイル名の確認
            if (!file.name.endsWith('.json')) {
                alert('JSONファイルを選択してください');
                return;
            }
            
            console.log('Importing game data from file:', file.name);
            
            // FormDataオブジェクトを作成
            const formData = new FormData();
            formData.append('gameFile', file);
            
            // サーバーにファイルを送信
            const response = await fetch('/api/import-game', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Import failed');
            }
            
            const data = await response.json();
            
            if (!data.success || !data.gameData) {
                throw new Error('Invalid game data');
            }
            
            // ゲームデータを復元
            const importedData = data.gameData;
            
            // ゲーム状態を更新
            gameState.characterName = importedData.characterName || '';
            gameState.department = importedData.department || '';
            gameState.stats = importedData.stats || {
                academics: 1,
                friendship: 1,
                hobbies: 1,
                romance: 1,
                future: 1
            };
            gameState.conversation = importedData.conversation || [];
            gameState.modelType = importedData.modelType || 'local';
            gameState.ollamaModel = importedData.ollamaModel || '';
            
            // UIを更新
            updateUIFromImportedData();
            
            console.log('Game data imported successfully:', gameState);
        } catch (error) {
            console.error('Error importing game data:', error);
            alert('ゲームデータのインポートに失敗しました: ' + error.message);
        } finally {
            // ファイル選択をリセット
            importGameFileInput.value = '';
        }
    });
    
    // インポートされたデータからUIを更新する関数
    function updateUIFromImportedData() {
        // キャラクター設定画面を非表示、会話画面を表示
        gameSetupPane.classList.add('hidden');
        characterSetupPane.classList.add('hidden');
        conversationPane.classList.remove('hidden');
        
        // モデル選択を更新
        modelTypeSelect.value = gameState.modelType;
        
        // Ollamaモデル選択の表示/非表示を更新
        if (gameState.modelType === 'local') {
            ollamaModelContainer.style.display = 'flex';
            
            // インポートされたOllamaモデルの処理
            if (gameState.ollamaModel && gameState.ollamaModel.trim() !== '') {
                // モデルがリストに存在するか確認
                let modelExists = false;
                for (let i = 0; i < ollamaModelSelect.options.length; i++) {
                    if (ollamaModelSelect.options[i].value === gameState.ollamaModel) {
                        modelExists = true;
                        break;
                    }
                }
                
                // モデルがリストにない場合は追加
                if (!modelExists) {
                    const option = document.createElement('option');
                    option.value = gameState.ollamaModel;
                    option.textContent = gameState.ollamaModel;
                    ollamaModelSelect.appendChild(option);
                }
                
                ollamaModelSelect.value = gameState.ollamaModel;
            } else {
                // 空のモデル名ならデフォルトを選択
                ollamaModelSelect.value = '';
            }
        } else {
            ollamaModelContainer.style.display = 'none';
        }
        
        // 会話履歴をクリアして再構築
        chatMessagesContainer.innerHTML = '';
        
        // 会話履歴を再構築
        gameState.conversation.forEach(message => {
            if (message.speaker === 'player') {
                const messageElement = document.createElement('div');
                messageElement.className = 'message player-message';
                messageElement.textContent = message.text;
                chatMessagesContainer.appendChild(messageElement);
            } else {
                const messageElement = document.createElement('div');
                messageElement.className = 'message gamemaster-message';
                messageElement.innerHTML = message.text.replace(/\n/g, '<br>');
                chatMessagesContainer.appendChild(messageElement);
            }
        });
        
        // スクロールを一番下に移動
        scrollToBottom();
        
        // 入力フィールドを有効化
        playerInputField.disabled = false;
        sendMessageButton.disabled = false;
        playerInputField.focus();
    }
});
