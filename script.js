// ==================== キャンバスのセットアップ ====================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d'); // 2D描画コンテキストを取得

const scoreDisplay = document.getElementById('scoreDisplay');

// ★変更: 画面要素の取得と新しい要素の取得
const mainMenu = document.getElementById('mainMenu');
const gameScreen = document.getElementById('gameScreen');
const startButtonStage1 = document.getElementById('startButtonStage1');
const startButtonStage2 = document.getElementById('startButtonStage2');

const gameStatusDiv = document.getElementById('gameStatus');
const statusMessage = document.getElementById('statusMessage');
const restartButton = document.getElementById('restartButton');
const nextStageButton = document.getElementById('nextStageButton');
const backToMenuButton = document.getElementById('backToMenuButton');

// ★追加: 音声要素の取得
const breakSound = document.getElementById('breakSound');

const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;

// ==================== ゲーム変数 ====================
let score = 0;
let gameOver = false; // 初期状態ではfalse
let gameWon = false;
let animationFrameId; // requestAnimationFrameのIDを保持
let currentStage = 1; // 現在のステージ数 (選択されたステージによって変わる)

// ==================== パドルの設定 ====================
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 20;
const PADDLE_COLOR = '#3498db'; // 青
let paddleX = (CANVAS_WIDTH - PADDLE_WIDTH) / 2; // パドルのX座標
const PADDLE_Y = CANVAS_HEIGHT - PADDLE_HEIGHT - 10; // パドルのY座標 (固定)
let rightPressed = false;
let leftPressed = false;

// ==================== ボールの設定 ====================
const BALL_RADIUS = 10;
const BALL_COLOR = '#e74c3c'; // 赤
let ballX = CANVAS_WIDTH / 2;
let ballY = PADDLE_Y - BALL_RADIUS;
let ballDx = 5; // ボールのX方向速度
let ballDy = -5; // ボールのY方向速度 (上向き)

// ==================== ブロックの設定 ====================
const BRICK_ROW_COUNT = 5;
const BRICK_COLUMN_COUNT = 8;
const BRICK_WIDTH = 75;
const BRICK_HEIGHT = 20;
const BRICK_PADDING = 10;
const BRICK_OFFSET_TOP = 30;
const BRICK_OFFSET_LEFT = (CANVAS_WIDTH - (BRICK_COLUMN_COUNT * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING)) / 2; // 中央揃え

let bricks = []; // ブロックの配列

// ==================== 障害物の設定 ====================
const OBSTACLE_WIDTH = 150;
const OBSTACLE_HEIGHT = 25;
const OBSTACLE_COLOR = '#7f8c8d'; // 灰色
let obstacles = []; // 障害物の配列

// ==================== 初期化関数 ====================

// ブロックを初期化
function initBricks() {
    bricks = []; // 既存のブロックをクリア
    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        bricks[c] = [];
        for (let r = 0; r < BRICK_ROW_COUNT; r++) {
            // status: 1 は表示、0 は非表示 (破壊済み)
            bricks[c][r] = { x: 0, y: 0, status: 1 };
        }
    }
}

// 障害物を初期化
function initObstacles(stage) {
    obstacles = []; // 既存の障害物をクリア

    if (stage === 1) {
        // ステージ1では障害物なし
    } else if (stage === 2) {
        // ステージ2で障害物を配置
        obstacles.push({
            x: CANVAS_WIDTH / 2 - OBSTACLE_WIDTH / 2,
            y: CANVAS_HEIGHT / 2 + 50, // パドルとブロックの間くらいのY座標
            width: OBSTACLE_WIDTH,
            height: OBSTACLE_HEIGHT
        });
        // 必要なら、ここに別の障害物を追加できます。
        obstacles.push({
            x: 50,
            y: CANVAS_HEIGHT / 2,
            width: 100,
            height: OBSTACLE_HEIGHT
        });
        obstacles.push({
            x: CANVAS_WIDTH - 150,
            y: CANVAS_HEIGHT / 2,
            width: 100,
            height: OBSTACLE_HEIGHT
        });
    }
    // ステージが増えるごとに、ここに条件を追加して障害物の配置を変えられます。
}

// ==================== 描画関数 ====================

// パドルを描画
function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddleX, PADDLE_Y, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillStyle = PADDLE_COLOR;
    ctx.fill();
    ctx.closePath();
}

// ボールを描画
function drawBall() {
    ctx.beginPath();
    ctx.arc(ballX, ballY, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = BALL_COLOR;
    ctx.fill();
    ctx.closePath();
}

// ブロックを描画
function drawBricks() {
    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        for (let r = 0; r < BRICK_ROW_COUNT; r++) {
            if (bricks[c][r].status === 1) { // ブロックが表示状態なら描画
                const brickX = (c * (BRICK_WIDTH + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
                const brickY = (r * (BRICK_HEIGHT + BRICK_PADDING)) + BRICK_OFFSET_TOP;
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                ctx.beginPath();
                ctx.rect(brickX, brickY, BRICK_WIDTH, BRICK_HEIGHT);
                // ブロックの色を列によって変える
                if (r === 0) ctx.fillStyle = '#f1c40f'; // 1列目
                else if (r === 1) ctx.fillStyle = '#9b59b6'; // 2列目
                else if (r === 2) ctx.fillStyle = '#3498db'; // 3列目
                else if (r === 3) ctx.fillStyle = '#e67e22'; // 4列目
                else if (r === 4) ctx.fillStyle = '#c0392b'; // 5列目
                else ctx.fillStyle = '#2ecc71'; // デフォルト

                ctx.fill();
                ctx.closePath();
            }
        }
    }
}

// 障害物を描画
function drawObstacles() {
    for (const obstacle of obstacles) {
        ctx.beginPath();
        ctx.rect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        ctx.fillStyle = OBSTACLE_COLOR;
        ctx.fill();
        ctx.closePath();
    }
}


// ==================== 衝突判定 ====================

// ボールとブロックの衝突判定
function collisionDetection() {
    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        for (let r = 0; r < BRICK_ROW_COUNT; r++) {
            const b = bricks[c][r];
            if (b.status === 1) { // ブロックが表示状態の場合のみ判定
                // ボールがブロックの範囲内にあるか
                if (ballX + BALL_RADIUS > b.x && ballX - BALL_RADIUS < b.x + BRICK_WIDTH &&
                    ballY + BALL_RADIUS > b.y && ballY - BALL_RADIUS < b.y + BRICK_HEIGHT) {
                    ballDy = -ballDy; // ボールのY方向速度を反転
                    b.status = 0; // ブロックを破壊済み（非表示）にする
                    score++; // スコアを増やす
                    scoreDisplay.textContent = score; // スコア表示を更新
                    
                    // ★追加: ブロック破壊音の再生
                    if (breakSound) { // audio要素が存在するか確認
                        breakSound.currentTime = 0; // 再生位置を先頭に戻す (連続再生用)
                        breakSound.play(); // 音を再生
                    }

                    // 全てのブロックを破壊したかチェック
                    let allBricksBroken = true;
                    for (let col = 0; col < BRICK_COLUMN_COUNT; col++) {
                        for (let row = 0; row < BRICK_ROW_COUNT; row++) {
                            if (bricks[col][row].status === 1) {
                                allBricksBroken = false;
                                break;
                            }
                        }
                        if (!allBricksBroken) break;
                    }

                    if (allBricksBroken) {
                        gameWon = true; // ステージクリアのフラグ
                        cancelAnimationFrame(animationFrameId); // ゲームループ停止
                        gameOver = true; // ゲームを一時停止状態にする

                        if (currentStage === 1) {
                            // ステージ1クリア時
                            statusMessage.textContent = 'ステージ1クリア！次のステージに進みますか？';
                            restartButton.textContent = 'もう一度プレイ';
                            nextStageButton.classList.remove('hidden'); // 次のステージボタンを表示
                            backToMenuButton.classList.remove('hidden'); // メニューに戻るボタンも表示
                            gameStatusDiv.classList.remove('hidden'); // メッセージとボタンを表示
                        } else {
                            // ステージ2以降のクリア時、または最終ステージクリア時
                            currentStage++; // ステージ数を増やす
                            if (currentStage > 2) { // ここでは仮に2ステージでゲームクリアとする
                                statusMessage.textContent = `全${currentStage - 1}ステージクリア！おめでとう！`;
                                // 最終ステージクリア後は「ステージ2へ進む」は不要
                                nextStageButton.classList.add('hidden');
                                restartButton.textContent = 'もう一度プレイ'; // テキストを戻す
                                backToMenuButton.classList.remove('hidden'); // メニューに戻るボタン表示
                                gameStatusDiv.classList.remove('hidden');
                            } else {
                                // 次のステージに進む（自動遷移）
                                statusMessage.textContent = `ステージ${currentStage - 1}クリア！ 次のステージへ...`;
                                gameStatusDiv.classList.remove('hidden');
                                // 自動遷移の場合、選択肢ボタンは隠す
                                restartButton.classList.add('hidden'); // リスタートボタンを一時的に隠す
                                nextStageButton.classList.add('hidden');
                                backToMenuButton.classList.add('hidden'); // メニューに戻るボタンも隠す
                                
                                setTimeout(() => {
                                    gameOver = false; // 自動遷移時もgameOverをリセット
                                    restartButton.classList.remove('hidden'); // リスタートボタンを戻す
                                    resetForNextStage();
                                }, 2000); // 2秒後に次のステージへ
                            }
                        }
                    }
                }
            }
        }
    }
}

// ボールとパドルの衝突判定
function ballPaddleCollision() {
    if (ballY + BALL_RADIUS > PADDLE_Y &&
        ballY - BALL_RADIUS < PADDLE_Y + PADDLE_HEIGHT &&
        ballX + BALL_RADIUS > paddleX &&
        ballX - BALL_RADIUS < paddleX + PADDLE_WIDTH) {

        ballDy = -ballDy; // ボールのY方向の速度を反転

        // パドルのどこに当たったかでX方向の速度を変える
        const hitPoint = ballX - (paddleX + PADDLE_WIDTH / 2);
        ballDx = hitPoint * 0.3; // 0.3は調整可能な係数
    }
}

// ボールと障害物の衝突判定
function ballObstacleCollision() {
    for (const obstacle of obstacles) {
        if (ballX + BALL_RADIUS > obstacle.x && ballX - BALL_RADIUS < obstacle.x + obstacle.width &&
            ballY + BALL_RADIUS > obstacle.y && ballY - BALL_RADIUS < obstacle.y + obstacle.height) {

            // どちらの方向から衝突したかによってボールの跳ね返りを調整
            const prevBallX = ballX - ballDx;
            const prevBallY = ballY - ballDy;

            // X方向からの衝突 (左右の壁)
            if (prevBallX - BALL_RADIUS >= obstacle.x + obstacle.width || prevBallX + BALL_RADIUS <= obstacle.x) {
                ballDx = -ballDx;
            }
            // Y方向からの衝突 (上下の壁)
            if (prevBallY - BALL_RADIUS >= obstacle.y + obstacle.height || prevBallY + BALL_RADIUS <= obstacle.y) {
                ballDy = -ballDy;
            }
            // ボールが障害物の中にめり込むのを防ぐための簡易的な位置調整
            if (ballDy > 0) { // ボールが下に進んでいた場合 (障害物の上面に当たった)
                ballY = obstacle.y - BALL_RADIUS;
            } else { // ボールが上に進んでいた場合 (障害物の下面に当たった)
                ballY = obstacle.y + obstacle.height + BALL_RADIUS;
            }
        }
    }
}

// ==================== キーボード操作 ====================
document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);

function keyDownHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = true;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = true;
    }
}

function keyUpHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = false;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = false;
    }
}

// ==================== ゲームのメインループ ====================
function draw() {
    if (gameOver) {
        return; // ゲームオーバーなら描画・更新を停止
    }

    // キャンバスをクリア
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawBricks();
    drawBall();
    drawPaddle();
    drawObstacles(); // 障害物の描画

    collisionDetection(); // ブロックとの衝突判定
    ballPaddleCollision(); // パドルとの衝突判定
    ballObstacleCollision(); // 障害物との衝突判定

    // ボールの移動
    ballX += ballDx;
    ballY += ballDy;

    // 壁との衝突判定
    if (ballX + BALL_RADIUS > CANVAS_WIDTH || ballX - BALL_RADIUS < 0) {
        ballDx = -ballDx; // 左右の壁
    }
    if (ballY - BALL_RADIUS < 0) {
        ballDy = -ballDy; // 上の壁
    } else if (ballY + BALL_RADIUS > CANVAS_HEIGHT) {
        // ボールが画面下部に到達したらゲームオーバー
        gameOver = true;
        statusMessage.textContent = 'ゲームオーバー！';
        restartButton.textContent = 'もう一度プレイ'; // テキストを戻す
        nextStageButton.classList.add('hidden'); // 次のステージボタンを非表示
        backToMenuButton.classList.remove('hidden'); // メニューに戻るボタン表示
        gameStatusDiv.classList.remove('hidden'); // メッセージ表示
        cancelAnimationFrame(animationFrameId); // ゲームループ停止
    }

    // パドルの移動
    if (rightPressed && paddleX < CANVAS_WIDTH - PADDLE_WIDTH) {
        paddleX += 7; // パドルの移動速度
    } else if (leftPressed && paddleX > 0) {
        paddleX -= 7; // パドルの移動速度
    }

    // 次のフレームを要求
    animationFrameId = requestAnimationFrame(draw);
}

// ==================== ゲームのリセット/開始関連関数 ====================

function resetGame() {
    score = 0;
    scoreDisplay.textContent = score;
    gameOver = false;
    gameWon = false;
    // currentStageはstartGameWithStage()で設定されるためここでは触らない

    // UI要素を全て非表示に戻す
    gameStatusDiv.classList.add('hidden');
    nextStageButton.classList.add('hidden');
    backToMenuButton.classList.add('hidden');
    restartButton.classList.remove('hidden'); // restartButtonは常に必要なのでhiddenを解除しておく

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId); // 念のため既存のアニメーションをキャンセル
    }
    // ボールとパドルの初期位置もリセット
    ballX = CANVAS_WIDTH / 2;
    ballY = PADDLE_Y - BALL_RADIUS;
    ballDx = 5;
    ballDy = -5;
    paddleX = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;

    initBricks(); // ブロックを初期化
    initObstacles(currentStage); // 現在のステージに合わせて障害物を初期化
}

// 次のステージに進むためのリセット関数
function resetForNextStage() {
    gameOver = false; // ステージ遷移時にもgameOverフラグをリセット
    // ボールとパドルの位置、速度をリセット
    ballX = CANVAS_WIDTH / 2;
    ballY = PADDLE_Y - BALL_RADIUS;
    ballDx = 5 + (currentStage - 1); // ステージが進むごとにボールを速くする
    ballDy = -(5 + (currentStage - 1)); // 上向きに再スタート
    paddleX = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;

    // UIを隠す
    gameStatusDiv.classList.add('hidden');
    nextStageButton.classList.add('hidden');
    backToMenuButton.classList.add('hidden'); // メニューに戻るボタンも隠す

    // ブロックと障害物を新しいステージに合わせて初期化
    initBricks();
    initObstacles(currentStage); // 次のステージの障害物を読み込む

    // ゲームループを再開
    draw();
}

// 特定のステージでゲームを開始する関数
function startGameWithStage(stageNumber) {
    currentStage = stageNumber; // 選択されたステージを設定
    resetGame(); // ゲームの状態をリセット
    mainMenu.classList.add('hidden'); // メニュー画面を隠す
    gameScreen.classList.remove('hidden'); // ゲーム画面を表示
    draw(); // ゲームループを開始
}

// 次のステージに進むボタンが押された時の処理
function proceedToNextStage() {
    // currentStageはcollisionDetectionで既にインクリメントされているのでここでは不要
    // currentStage++; // これは不要、collisionDetectionですでにインクリメント済み
    resetForNextStage(); // 次のステージの設定でリセット
}

// メニュー画面に戻る関数
function showMainMenu() {
    cancelAnimationFrame(animationFrameId); // 現在のゲームループを停止
    mainMenu.classList.remove('hidden'); // メニュー画面を表示
    gameScreen.classList.add('hidden'); // ゲーム画面を隠す
    gameStatusDiv.classList.add('hidden'); // ゲームステータスも隠す
    nextStageButton.classList.add('hidden'); // ボタンも隠す
    backToMenuButton.classList.add('hidden'); // ボタンも隠す
    restartButton.classList.remove('hidden'); // リスタートボタンは表示状態に戻しておく
    
    // ゲームの状態を完全にリセット
    score = 0;
    scoreDisplay.textContent = score;
    gameOver = false;
    gameWon = false;
    currentStage = 1; // メニューに戻る際はステージを1にリセット
    // ボールとパドルの位置もリセット (これはresetGameがやってくれるが、念のため)
    ballX = CANVAS_WIDTH / 2;
    ballY = PADDLE_Y - BALL_RADIUS;
    ballDx = 5;
    ballDy = -5;
    paddleX = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;

    // ゲームループは停止しているので、drawは呼び出さない
}


// ==================== DOMの読み込み完了後に実行する処理 ====================
document.addEventListener('DOMContentLoaded', () => {
    // メニューからの開始ボタンにイベントリスナーを設定
    startButtonStage1.addEventListener('click', () => startGameWithStage(1));
    startButtonStage2.addEventListener('click', () => startGameWithStage(2)); // ステージ2も追加

    // ゲーム内ボタンにイベントリスナーを設定
    restartButton.addEventListener('click', () => startGameWithStage(currentStage)); // 現在のステージでリスタート
    nextStageButton.addEventListener('click', proceedToNextStage);
    backToMenuButton.addEventListener('click', showMainMenu); // メニューに戻るボタン

    // 初期表示はメニュー画面
    showMainMenu();
});