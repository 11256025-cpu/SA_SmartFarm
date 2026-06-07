/*
 * backend/server.js - Express 伺服器入口，包含 SQLite 連線、資料表初始化、背景寫入與 API 路由設定。
 * 這個檔案是智慧農場後端的核心，負責處理所有來自前端的請求，並與 SQLite 資料庫互動。
 */
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

// 建立 Express 應用程式實例
const app = express();
const port = 3000;

// 啟用 CORS (跨來源資源共享) 中介軟體，允許來自不同網域的請求。
app.use(cors());
// 配置 Express 使用 JSON 格式的請求體解析器。
// `limit: '10mb'` 限制請求體最大為 10MB，以處理可能較大的圖片 Base64 字串。
app.use(express.json({ limit: '10mb' }));

// 輔助函數：將輸入值解析為整數型的 user ID。
// 如果解析失敗或不是有效的整數，則返回 null。
// 這是為了避免 SQL 注入等安全問題，並確保 user ID 格式正確。
const parseUserId = (value) => {
    const id = Number(value);
    return Number.isInteger(id) ? id : null;
};

// ==========================================
// 💡 模擬環境變數記憶體暫存區 (全域變數)
// ==========================================
// `currentFarmStates` 是一個物件，用於在記憶體中快速存取每個使用者的最新環境數據。
// 初始不預先建立任何使用者狀態，避免未登入就自動觸發定時寫入
let currentFarmStates = {};

// --- 連線到 SQLite 資料庫 ---
// 連線到 SQLite 資料庫檔案 'farm.db'。
// 如果檔案不存在，則會自動建立。
const db = new sqlite3.Database('./farm.db', (err) => {
    if (err) {
        // 如果連線失敗，輸出錯誤訊息到控制台。
        console.error("資料庫連線失敗:", err.message);
    } else {
        // 如果連線成功，輸出成功訊息。
        console.log("成功連線到 SQLite 資料庫 (farm.db)！");
        // 連線成功後，調用 `initializeDatabase` 函數，確保所有必要的資料表都存在。
        initializeDatabase(); // 連線成功後，啟動初始化資料表
    }
});

// 💡 確保所有專案需要的資料表都存在
function initializeDatabase() {
    db.serialize(() => {
        // 1. 建立歷史數據表
        // 儲存智能農場環境感測器的歷史數據，如溫度、土壤濕度、光照和二氧化碳濃度。
        // `record_time` 欄位用於記錄數據寫入時間。
        db.run(`CREATE TABLE IF NOT EXISTS HISTORY (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            history_temp REAL,
            history_soil_moisture REAL,
            history_light REAL,
            history_co2 REAL,
            record_time DATETIME
        )`);

        // 2. 建立警報設定範圍表
        // 儲存使用者自定義的各項環境參數（溫度、濕度、二氧化碳、光照）的警示上下限。
        // `user_id` 作為主鍵，保證每個使用者只有一組警示設定。
        db.run(`CREATE TABLE IF NOT EXISTS WARNING_RANGE (
            user_id INTEGER PRIMARY KEY,
            temp_warning TEXT,
            soil_warning TEXT,
            co2_warning TEXT,
            light_warning TEXT
        )`);

        // 3. 建立警報紀錄表 (解決你目前報錯的核心問題)
        // 記錄系統觸發的所有警示訊息，包含觸發警示的使用者ID、訊息內容和紀錄時間。
        // `record_time` 欄位用於記錄警示發生時間。
        db.run(`CREATE TABLE IF NOT EXISTS ALERT_LOGS (
            log_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            message TEXT,
            record_time DATETIME
        )`);

        // 4. 建立灌溉紀錄表：手動/自動灌溉事件都會記錄
        // 記錄每一次灌溉事件的詳細資訊，包括灌溉類型（手動/自動）、目標濕度、實際濕度變化、觸發條件和紀錄時間。
        // `record_time` 欄位用於記錄灌溉發生時間。
        db.run(`CREATE TABLE IF NOT EXISTS IRRIGATION_LOGS (
            irrigation_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            irrigation_type TEXT,
            target_humidity REAL,
            new_humidity REAL,
            condition TEXT,
            record_time DATETIME
        )`);

        // 5. 建立使用者表 (配合你的 /api/login 和 /api/register)
        // 儲存使用者帳戶的基本資料，例如暱稱、帳號、密碼和頭像。
        // `account` 欄位設定為 `UNIQUE`，確保帳號的唯一性。
        db.run(`CREATE TABLE IF NOT EXISTS USER (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nickname TEXT,
            account TEXT UNIQUE,
            password TEXT,
            avatar TEXT
        )`);

        // 5. 建立排程設定表
        // 儲存使用者的自動灌溉排程設定，包含灌溉頻率和持續時間。
        // `updated_at` 記錄最後更新時間。
        db.run(`CREATE TABLE IF NOT EXISTS SCHEDULE_SETTINGS (
            user_id INTEGER PRIMARY KEY,
            frequency TEXT,
            duration TEXT,
            updated_at DATETIME DEFAULT (datetime('now', '+8 hours'))
        )`);

        // 6. 建立作物資料表
        // 儲存使用者種植的作物資訊，包括名稱、生長階段、狀態、圖片以及作物的歷史狀態變更紀錄（以 JSON 字串形式儲存）。
        // `history` 欄位用於儲存 JSON 格式的歷史紀錄。
        db.run(`CREATE TABLE IF NOT EXISTS CROPS (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            stage TEXT,
            status TEXT,
            image TEXT,
            history TEXT
        )`);

        console.log("📋 資料庫資料表檢查與初始化完成！");
        // 資料表初始化完成後，預載所有使用者的狀態到記憶體中。
        preloadAllUsersState(); // 💡 伺服器啟動時，自動把所有使用者載入記憶體
    });
}

// 預載所有使用者的狀態到 `currentFarmStates` 記憶體物件中。
// 這使得伺服器啟動時，所有已註冊使用者的環境狀態可以立即被追蹤和更新。
function preloadAllUsersState() {
    db.all(`SELECT id FROM USER`, [], (err, users) => {
        if (err) return console.error("❌ 預載使用者資料失敗:", err.message);
        if (users && users.length > 0) {
            // 遍歷所有使用者，為每個使用者初始化其狀態。
            users.forEach(user => initializeUserState(String(user.id)));
            console.log(`🚀 伺服器啟動：已自動掛載 ${users.length} 位使用者的狀態至記憶體！開始自動背景紀錄...`);
        }
        // 如果沒有使用者，則輸出提示。
        else {
             console.log("🚀 伺服器啟動：目前沒有任何使用者，等待新使用者註冊以初始化狀態。");
        }
    });
}

// ==========================================
// 💡 使用者狀態初始化輔助函數
// ==========================================
const initializeUserState = (uid, callback) => {
    // 如果該使用者的狀態已經在記憶體中，直接返回。
    if (currentFarmStates[uid]) {
        return callback && callback(null, currentFarmStates[uid]);
    }
    // 從 HISTORY 表中查詢該使用者最近一筆環境數據，用於初始化記憶體狀態。
    // 將欄位名稱進行轉換，使其與 `currentFarmStates` 的結構一致。
    db.get(`SELECT history_temp as temperature, history_soil_moisture as humidity, history_co2 as co2, history_light as light FROM HISTORY WHERE user_id = ? ORDER BY record_time DESC LIMIT 1`, [uid], (err, row) => {
        if (err) return callback && callback(err);
        // 如果找到歷史數據，則用其初始化 `currentFarmStates`。
        if (row) {
            currentFarmStates[uid] = {
                temperature: Number(row.temperature),
                humidity: Number(row.humidity),
                co2: Number(row.co2),
                light: Number(row.light)
            };
            console.log(`[${new Date().toLocaleString('zh-TW', { hour12: false })}] 🔄 成功從 HISTORY 還原使用者 ${uid} 的環境狀態暫存`);
        } else {
            currentFarmStates[uid] = { temperature: 25, humidity: 25, co2: 800, light: 100000 };
            console.log(`[${new Date().toLocaleString('zh-TW', { hour12: false })}] 🔄 為使用者 ${uid} 建立預設環境狀態暫存`);
        }
        return callback && callback(null, currentFarmStates[uid]);
    });
};

// ==========================================
// 💡 背景自動寫入機制 (每 10 秒自動紀錄)
// ==========================================
let lastAlertTimes = {}; // 紀錄各類警報最後發送時間，避免洗版 { "1_temp": timestamp }
let lastAutoIrrigationTimes = {}; // 紀錄自動灌溉執行時間，避免重複觸發
let lastEmptyStateLogTime = 0; // 避免空 state 日誌過於頻繁

setInterval(() => {
    // 💡 自動偵測：每 10 秒去資料庫檢查一次，如果有手動新增的使用者，立刻自動掛載，免重啟！
    db.all(`SELECT id FROM USER`, [], (err, users) => {
        if (!err && users) {
            users.forEach(user => {
                const uid = String(user.id);
                if (!currentFarmStates[uid]) {
                    console.log(`✨ [自動偵測] 發現資料庫有新使用者 ${uid}，已自動加入背景紀錄排程！`);
                    initializeUserState(uid);
                }
            });
        }
    });

    const userIds = Object.keys(currentFarmStates);

    if (userIds.length === 0) {
        const now = Date.now();
        if (now - lastEmptyStateLogTime >= 60000) {
            const timeStr = new Date().toLocaleString('zh-TW', { hour12: false });
            console.log(`[${timeStr}] ℹ️ 目前 currentFarmStates 為空，暫無歷史數據可寫入。請登入或啟動模擬器以開始保存環境數據。`);
            lastEmptyStateLogTime = now;
        }
        return;
    }

    userIds.forEach((uid) => {
        const state = currentFarmStates[uid];
        
        // 💡 寫入歷史數據
        const sql = `
            INSERT INTO HISTORY (user_id, history_temp, history_soil_moisture, history_light, history_co2, record_time) 
            VALUES (?, ?, ?, ?, ?, datetime('now', '+8 hours'))
        `;
        
        db.run(sql, [
            String(uid), 
            state.temperature, 
            state.humidity, 
            state.light,
            state.co2
        ], (err) => {
            const now = new Date().toLocaleString('zh-TW', { hour12: false });
            if (err) {
                console.error(`[${now}] ❌ 定時寫入使用者 ${uid} 失敗:`, err.message);
            } else {
                const stateStr = `{ temperature: \x1b[33m${state.temperature}\x1b[0m, humidity: \x1b[33m${state.humidity}\x1b[0m, co2: \x1b[33m${state.co2}\x1b[0m, light: \x1b[33m${state.light}\x1b[0m }`;
                console.log(`[${now}] 🕒 [定時紀錄] 成功幫使用者 ${uid} 寫入歷史數據: ${stateStr}`);
            }
        });

        // 💡 檢查警示設定並產生紀錄
        db.get(`SELECT * FROM WARNING_RANGE WHERE user_id = ?`, [uid], (err, row) => {
            if (err || !row) return;

            const checkAndAlert = (type, value, rangeStr, unit) => {
                if (!rangeStr) return;
                
                let range;
                try {
                    range = JSON.parse(rangeStr);
                } catch (e) {
                    range = rangeStr.split(',').map(Number); // 相容先前的純逗號字串格式
                }
                
                if (value < range[0] || value > range[1]) {
                    const alertKey = `${uid}_${type}`;
                    const now = Date.now();
                    // 60秒內不重複發送同類型警報
                    if (!lastAlertTimes[alertKey] || now - lastAlertTimes[alertKey] > 60000) {
                        // 將使用者 id 加入警示文字，方便後續查閱與過濾
                        const msg = `🚨 [警示觸發] 使用者 ${uid} ⚠️ ${type}異常！當前數值 ${value}${unit} (允許範圍: ${range[0]}~${range[1]})`;
                        db.run(`INSERT INTO ALERT_LOGS (user_id, message, record_time) VALUES (?, ?, datetime('now', '+8 hours'))`, [uid, msg]);
                        lastAlertTimes[alertKey] = now;
                        const timeStr = new Date().toLocaleString('zh-TW', { hour12: false });
                        console.log(`[${timeStr}] ${msg}`);
                    }
                }
            };

            checkAndAlert('環境溫度', state.temperature, row.temp_warning, '°C');
            checkAndAlert('土壤濕度', state.humidity, row.soil_warning, '%');
            checkAndAlert('二氧化碳', state.co2, row.co2_warning, 'ppm');
            checkAndAlert('光照強度', state.light, row.light_warning, 'lux');

            // 自動灌溉排程：當土壤濕度低於設定下限時，按照使用者排程觸發一次灌溉
            db.get(`SELECT * FROM SCHEDULE_SETTINGS WHERE user_id = ?`, [uid], (err2, scheduleRow) => {
                // 若沒有排程設定，則直接跳出不執行自動灌溉
                if (err2 || !scheduleRow) return;

                // 取得使用者設定的「灌溉頻率 (分鐘)」，若未設定則為 0
                const intervalMinutes = Number(scheduleRow.frequency) || 0;
                // 若頻率小於等於 0，代表使用者可能關閉了自動灌溉功能
                if (intervalMinutes <= 0) return;

                // 準備解析土壤濕度的安全範圍 [下限, 上限]
                let range;
                try {
                    // 嘗試解析 JSON 格式 (例如 "[30, 80]")
                    range = JSON.parse(row.soil_warning);
                } catch (e) {
                    // 為了相容舊資料庫，如果解析失敗，則嘗試用逗號分割字串
                    range = row.soil_warning ? row.soil_warning.split(',').map(Number) : null;
                }
                
                // 防呆：確保範圍陣列存在且有包含下限與上限兩個數值
                if (!Array.isArray(range) || range.length < 2) return;

                const lower = Number(range[0]);
                const upper = Number(range[1]);
                if (isNaN(lower) || isNaN(upper)) return;

                // === 判斷冷卻時間 (頻率) ===
                const now = Date.now();
                // 取得上一次自動灌溉的時間戳，若沒有紀錄則視為 0 (一定會觸發)
                const lastRun = lastAutoIrrigationTimes[uid] || 0;
                // due (到期)：計算距離上次灌溉是否已經超過了設定的頻率 (將分鐘轉為毫秒)
                const due = now - lastRun >= intervalMinutes * 60000;

                // 詳細排程檢查日誌，幫助診斷為何未觸發灌溉
                const checkTime = new Date().toLocaleString('zh-TW', { hour12: false });
                console.log(`[${checkTime}] [排程檢查] 使用者 ${uid} | humidity=${state.humidity} | lower=${lower} | upper=${upper} | frequency=${intervalMinutes} | lastRun=${lastRun} | due=${due}`);

                // === 觸發自動灌溉的核心條件 ===
                // 1. 目前土壤濕度 < 安全範圍下限
                // 2. 距離上次灌溉已達到設定的頻率時間
                if (state.humidity < lower && due) {
                    // 計算目標濕度 (最高不會超過 100%，以安全上限為基準)
                    const targetHumidity = Math.min(100, upper);
                    // 確保灌溉後的濕度只增不減
                    const newHumidity = Math.max(state.humidity, targetHumidity);
                    
                    // 更新記憶體中的模擬器暫存狀態，讓前端馬上能拉到新數據
                    currentFarmStates[uid].humidity = newHumidity;
                    // 更新最後一次自動灌溉的時間，重新計算冷卻
                    lastAutoIrrigationTimes[uid] = now;

                    // 將本次自動灌溉紀錄實體寫入資料庫
                    db.run(`INSERT INTO IRRIGATION_LOGS (user_id, irrigation_type, target_humidity, new_humidity, condition, record_time) VALUES (?, ?, ?, ?, ?, datetime('now', '+8 hours'))`,
                        [uid, 'auto', targetHumidity, newHumidity, `humidity<${lower}`],
                        (err3) => {
                            const timeStr = new Date().toLocaleString('zh-TW', { hour12: false });
                            if (err3) {
                                console.error(`[${timeStr}] ❌ 自動灌溉紀錄儲存失敗 (user ${uid}):`, err3.message);
                            } else {
                                // 讀取今日灌溉次數並列印詳細資訊（包含使用者排程 frequency/duration）
                                db.get(`SELECT COUNT(*) AS total FROM IRRIGATION_LOGS WHERE user_id = ? AND DATE(record_time) = DATE('now', '+8 hours')`, [uid], (countErr, countRow) => {
                                    const todayCount = countErr ? 'unknown' : countRow.total;
                                    const freq = intervalMinutes || (scheduleRow && scheduleRow.frequency) || 'n/a';
                                    const dur = (scheduleRow && scheduleRow.duration) || 'n/a';
                                    // 預估並計算下一次可能的執行時間
                                    const nextRun = new Date(Date.now() + (Number(freq) * 60000));
                                    const nextRunStr = isNaN(nextRun.getTime()) ? 'n/a' : nextRun.toLocaleString('zh-TW', { hour12: false });
                                    console.log(`[${timeStr}] 💧 [自動灌溉] 使用者 ${uid} 已執行灌溉 (頻率: ${freq} 分鐘, 時長: ${dur} 分鐘) 目標濕度: ${targetHumidity}%, 新濕度: ${newHumidity}%, 今日灌溉次數: ${todayCount}, 下一次預計: ${nextRunStr}`);
                                });
                            }
                        }
                    );
                }
            });
        });
    });
}, 10000); 


// ==========================================
//                 API 路由區塊
// ==========================================

// 💡 1. 偵錯專用 API (優化：使用 substr 切割日期展示)
app.get('/api/debug/history', (req, res) => {
    db.all("SELECT *, substr(record_time, 1, 10) as datePart FROM HISTORY ORDER BY record_time DESC LIMIT 20", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            total_states_in_memory: currentFarmStates,
            database_rows: rows
        });
    });
});

// 取得使用者當前模擬器狀態：先從記憶體 currentFarmStates，若沒有則回溯 HISTORY 最近一筆
app.get('/api/simulator/state', (req, res) => {
    const userId = parseUserId(req.query.userId);
    if (userId === null) return res.status(400).json({ success: false, message: '缺少或無效的 userId' });
    const uid = String(userId);

    if (currentFarmStates[uid]) {
        return res.json({ success: true, state: currentFarmStates[uid] });
    }

    const sql = `SELECT history_temp as temperature, history_soil_moisture as humidity, history_co2 as co2, history_light as light, record_time FROM HISTORY WHERE user_id = ? ORDER BY record_time DESC LIMIT 1`;
    db.get(sql, [userId], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: '資料庫查詢錯誤' });
        if (!row) return res.json({ success: true, state: null });

        const state = {
            temperature: Number(row.temperature),
            humidity: Number(row.humidity),
            co2: Number(row.co2),
            light: Number(row.light),
            record_time: row.record_time
        };
        // 初始化記憶體狀態，後續可被模擬器更新
        currentFarmStates[uid] = state;
        const timeStr = new Date().toLocaleString('zh-TW', { hour12: false });
        console.log(`[${timeStr}] 🔄 從 HISTORY 初始化使用者 ${uid} 的 currentFarmStates: ${JSON.stringify(state)}`);
        return res.json({ success: true, state });
    });
});

// 💡 2. 控制面板滑軌放開時更新暫存
app.post('/api/simulator/update', (req, res) => {
    let { userId, temperature, humidity, co2, light } = req.body;
    const parsedUserId = parseUserId(userId);

    if (parsedUserId === null) return res.status(400).json({ success: false, message: "缺少或無效的 userId" });
    const uidStr = String(parsedUserId);

    if (!currentFarmStates[uidStr]) {
        currentFarmStates[uidStr] = { temperature: 25, humidity: 25, co2: 800, light: 100000 };
    }

    if (temperature !== undefined) currentFarmStates[uidStr].temperature = Number(temperature);
    if (humidity !== undefined) currentFarmStates[uidStr].humidity = Number(humidity);
    if (co2 !== undefined) currentFarmStates[uidStr].co2 = Number(co2);
    if (light !== undefined) currentFarmStates[uidStr].light = Number(light);

    const timeStr = new Date().toLocaleString('zh-TW', { hour12: false });
    const state = currentFarmStates[uidStr];
    const coloredStateStr = `{ temperature: \x1b[33m${state.temperature}\x1b[0m, humidity: \x1b[33m${state.humidity}\x1b[0m, co2: \x1b[33m${state.co2}\x1b[0m, light: \x1b[33m${state.light}\x1b[0m }`;
    console.log(`[${timeStr}] 🎛️ 使用者 ${uidStr} 更新了控制面板暫存: ${coloredStateStr}`);

    res.json({ success: true, currentState: currentFarmStates[uidStr] });
});

// 💡 3. 報表分頁查詢歷史數據
app.get('/api/reports/history', (req, res) => {
    let { startDate, endDate, date } = req.query;
    const userId = parseUserId(req.query.userId);
    if (userId === null) return res.status(400).json({ success: false, historyData: [], message: "缺少或無效的 userId" });
    
    // 💡 核心相容轉換：如果前端傳過來的是舊版參數 date，我們自動幫它映射到 start 變數上
    const start = startDate || date;
    const end = endDate || start;

    if (!start) {
        console.log("⚠️ 收到一個未包含任何日期參數的非法請求，拒絕查詢以免噴錯。");
        return res.json({ success: false, historyData: [] }); // 安全回傳空陣列防爆
    }

    console.log(`📊 [API 歷史查詢] 使用者 ${userId} 正在查詢 ${start} 到 ${end} 的數據...`);

    // 💡 這裡已修正：將 history_soil 改為 history_soil_moisture，維持輸出別名為 humidity 讓前端無感對接
    const sql = `
        SELECT 
            history_temp as temperature, 
            history_soil_moisture as humidity, 
            history_co2 as co2, 
            history_light as light, 
            CASE 
                WHEN ? = ? THEN substr(record_time, 12, 5)
                ELSE substr(record_time, 6, 11)
            END as timeStr 
        FROM HISTORY 
        WHERE substr(record_time, 1, 10) BETWEEN ? AND ? AND user_id = ?
        ORDER BY record_time ASC
    `;

    db.all(sql, [start, end, start, end, userId], (err, rows) => {
        if (err) {
            console.error("❌ 查詢歷史報表失敗:", err.message);
            return res.status(500).json({ success: false, historyData: [], message: "資料庫查詢錯誤" });
        }
        
        const safeRows = rows || [];
        console.log(`📊 查詢結果：成功找到 ${safeRows.length} 筆資料，即將發送回前端。`);
        res.json({ success: true, historyData: safeRows });
    });
});


// ==========================================
// 4. 使用者註冊 API (POST /api/register)
// ==========================================
app.post('/api/register', (req, res) => {
    // 從請求主體提取註冊資訊
    const { nickname, username, password, confirmPassword } = req.body;
    // 驗證欄位是否齊全
    if (!nickname || !username || !password || !confirmPassword) return res.status(400).json({ success: false, message: "請填寫所有欄位" });
    // 驗證兩次密碼是否一致
    if (password !== confirmPassword) return res.status(400).json({ success: false, message: "兩次輸入的密碼不一致" });
    
    // 將新使用者資料插入資料庫
    const sql = `INSERT INTO USER (nickname, account, password) VALUES (?, ?, ?)`;
    db.run(sql, [nickname, username, password], function(err) {
        if (err) {
            // 處理帳號重複的錯誤 (UNIQUE constraint 違反)
            if (err.message.includes('UNIQUE constraint failed: USER.account')) return res.status(409).json({ success: false, message: "這個帳號已經有人使用了，請換一個！" });
            return res.status(500).json({ success: false, message: "伺服器發生未知的錯誤" });
        }
        // 註冊成功後，也在 currentFarmStates 為該使用者建立初始暫存
        const newId = String(this.lastID);
        if (!currentFarmStates[newId]) {
            currentFarmStates[newId] = { temperature: 25, humidity: 25, co2: 800, light: 100000 };
            console.log(`🆕 註冊後已為使用者 ${newId} 建立初始暫存`);
        }
        // 回傳成功狀態與新使用者的基本資料
        res.json({ success: true, message: "註冊成功！", user: { id: this.lastID, nickname: nickname, account: username } });
    });
});

// ==========================================
// 5. 使用者登入 API (POST /api/login)
// ==========================================
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const timeStr = new Date().toLocaleString('zh-TW', { hour12: false });
    console.log(`[${timeStr}] 🔐 /api/login request received for username=${username}`);
    // 檢查是否有輸入帳密
    if (!username || !password) return res.status(400).json({ success: false, message: "請輸入帳號與密碼" });

    // 先檢查帳號是否存在，再確認密碼（debug 日誌已縮減）
    db.get(`SELECT rowid as id, nickname, account, password, avatar FROM USER WHERE account = ?`, [username], (err, row) => {
            if (err) console.error('[/api/login] db.get error:', err.message);
            if (err) return res.status(500).json({ success: false, message: "資料庫查詢發生錯誤" });
            const handleNotFound = () => {
                // 若輸入為純數字，嘗試以 rowid 或 id 查詢（支援直接輸入 userId 登入）
                if (/^\d+$/.test(username)) {
                    db.get(`SELECT rowid as id, nickname, account, password, avatar FROM USER WHERE rowid = ? OR id = ?`, [username, username], (err2, row2) => {
                        if (err2) return res.status(500).json({ success: false, message: "資料庫查詢發生錯誤" });
                        if (!row2) return res.status(404).json({ success: false, message: "帳號不存在" });
                        // 檢查密碼是否正確
                        if (row2.password !== password) return res.status(401).json({ success: false, message: "帳號或密碼錯誤" });
                        const uidStr2 = String(row2.id);
                        // 登入成功後，為使用者初始化狀態
                        initializeUserState(uidStr2, (initErr) => {
                            if (initErr) console.error(`[/api/login] 初始化使用者 ${uidStr2} 狀態時錯誤:`, initErr.message);
                            return res.json({ success: true, message: "登入成功！", user: row2 });
                        });
                    });
                } else {
                    return res.status(404).json({ success: false, message: "帳號不存在" });
                }
            };

            // 如果一般帳號查詢不到，進入把帳號當 userId 的後備查詢
            if (!row) return handleNotFound();
            // 檢查密碼是否正確
            if (row.password !== password) return res.status(401).json({ success: false, message: "帳號或密碼錯誤" });
            const uidStr = String(row.id);
            // 登入成功後，為使用者初始化環境狀態暫存
            initializeUserState(uidStr, (initErr) => {
                if (initErr) console.error(`[/api/login] 初始化使用者 ${uidStr} 狀態時錯誤:`, initErr.message);
                return res.json({ success: true, message: "登入成功！", user: row });
            });
        });
});

// ==========================================
// 6. 設定警示範圍 API (POST /api/alerts/settings)
// ==========================================
app.post('/api/alerts/settings', (req, res) => {
    const { userId, tempRange, humidRange, co2Range, lightRange } = req.body;
    const parsedUserId = parseUserId(userId);
    if (parsedUserId === null) return res.status(400).json({ success: false, message: "缺少或無效的使用者 ID" });
    
    // 將陣列範圍轉為 JSON 字串存入資料庫
    const tempStr = JSON.stringify(tempRange);
    const soilStr = JSON.stringify(humidRange);
    const co2Str = JSON.stringify(co2Range);
    const lightStr = JSON.stringify(lightRange);
    
    // 檢查使用者是否已經有設定紀錄
    const checkSql = `SELECT * FROM WARNING_RANGE WHERE user_id = ?`;
    db.get(checkSql, [parsedUserId], (err, row) => {
        if (row) {
            // 若已有紀錄，執行更新操作 (UPDATE)
            const updateSql = `UPDATE WARNING_RANGE SET temp_warning = ?, soil_warning = ?, co2_warning = ?, light_warning = ? WHERE user_id = ?`;
            db.run(updateSql, [tempStr, soilStr, co2Str, lightStr, userId], () => res.json({ success: true, message: "設定更新成功！" }));
        } else {
            // 若無紀錄，執行插入操作 (INSERT)
            const insertSql = `INSERT INTO WARNING_RANGE (user_id, temp_warning, soil_warning, co2_warning, light_warning) VALUES (?, ?, ?, ?, ?)`;
            db.run(insertSql, [userId, tempStr, soilStr, co2Str, lightStr], () => res.json({ success: true, message: "設定新增成功！" }));
        }
    });
});

// ==========================================
// 7. 取得警示範圍設定 API (GET /api/alerts/settings)
// ==========================================
app.get('/api/alerts/settings', (req, res) => {
    const userId = parseUserId(req.query.userId);
    if (userId === null) return res.status(400).json({ success: false, message: "缺少或無效的 userId" });
    db.get(`SELECT * FROM WARNING_RANGE WHERE user_id = ?`, [userId], (err, row) => {
        if (!row) return res.json({ success: true, settings: null });
        
        // 防呆解析函數：同時支援 JSON 陣列與逗號字串
        const safeParse = (str) => {
            if (!str) return null;
            try {
                return JSON.parse(str);
            } catch (e) {
                return str.split(',').map(Number);
            }
        };

        // 將資料庫的字串格式轉回前端需要的陣列格式回傳
        res.json({
            success: true,
            settings: {
                tempRange: safeParse(row.temp_warning),
                humidRange: safeParse(row.soil_warning),
                co2Range: safeParse(row.co2_warning),
                // 光照預設範圍
                lightRange: safeParse(row.light_warning) || [500, 50000]
            }
        });
    });
});

// ==========================================
// 8. 新增警示紀錄 API (POST /api/alerts/logs)
// ==========================================
app.post('/api/alerts/logs', (req, res) => {
    const { userId, message } = req.body;
    const parsedUserId = parseUserId(userId);
    if (parsedUserId === null || !message) return res.status(400).json({ success: false, message: "缺少必要參數或 userId 格式錯誤" });
    // 將新產生的警示紀錄寫入 ALERT_LOGS 表
    db.run(`INSERT INTO ALERT_LOGS (user_id, message, record_time) VALUES (?, ?, datetime('now', '+8 hours'))`, [parsedUserId, message], function(err) {
        if (err) return res.status(500).json({ success: false, message: "新增紀錄失敗" });
        res.json({ success: true, message: "新增紀錄成功", id: this.lastID });
    });
});

// ==========================================
// 9. 手動灌溉 API (POST /api/irrigation/manual)
// ==========================================
app.post('/api/irrigation/manual', (req, res) => {
    const { userId, targetHumidity } = req.body;
    const parsedUserId = parseUserId(userId);
    if (parsedUserId === null || targetHumidity === undefined) return res.status(400).json({ success: false, message: "缺少必要參數或 userId 格式錯誤" });
    const uid = String(parsedUserId);
    const target = Number(targetHumidity);
    // 驗證目標濕度範圍
    if (isNaN(target) || target < 0 || target > 100) return res.status(400).json({ success: false, message: "目標濕度需介於 0~100" });

    // 確保使用者的記憶體狀態存在
    if (!currentFarmStates[uid]) {
        currentFarmStates[uid] = { temperature: 25, humidity: 25, co2: 800, light: 100000 };
    }

    // 計算新的濕度值 (取目標濕度與目前濕度的較大值，代表只會澆水增加濕度)
    const currentHumidity = Number(currentFarmStates[uid].humidity || 0);
    const newHumidity = target > currentHumidity ? target : currentHumidity;
    currentFarmStates[uid].humidity = newHumidity;

    // 寫入手動灌溉紀錄到 IRRIGATION_LOGS 表
    db.run(`INSERT INTO IRRIGATION_LOGS (user_id, irrigation_type, target_humidity, new_humidity, condition, record_time) VALUES (?, ?, ?, ?, ?, datetime('now', '+8 hours'))`,
        [uid, 'manual', target, newHumidity, `manual target ${target}`], function(err) {
            if (err) return res.status(500).json({ success: false, message: "儲存灌溉紀錄失敗" });
            db.get(`SELECT COUNT(*) AS total FROM IRRIGATION_LOGS WHERE user_id = ? AND DATE(record_time) = DATE('now', '+8 hours')`, [uid], (countErr, countRow) => {
                const todayCount = countErr ? 'unknown' : countRow.total;
                const timeStr = new Date().toLocaleString('zh-TW', { hour12: false });
                console.log(`[${timeStr}] 💧 [灌溉紀錄] 成功幫使用者 ${uid} 進行手動灌溉 今日灌溉次數：${todayCount}`);
            });
            res.json({ success: true, message: "手動灌溉紀錄已儲存", targetHumidity: target, newHumidity });
        }
    );
});

// ==========================================
// 10. 自動灌溉手動觸發 API (POST /api/irrigation/auto)
// ==========================================
app.post('/api/irrigation/auto', (req, res) => {
    const { userId, targetHumidity } = req.body;
    const parsedUserId = parseUserId(userId);
    if (parsedUserId === null) return res.status(400).json({ success: false, message: "缺少或無效的使用者 ID" });
    const uid = String(parsedUserId);
    
    // 確保使用者的記憶體狀態存在
    if (!currentFarmStates[uid]) {
        currentFarmStates[uid] = { temperature: 25, humidity: 25, co2: 800, light: 100000 };
    }

    const currentHumidity = Number(currentFarmStates[uid].humidity || 0);
    const target = targetHumidity !== undefined ? Number(targetHumidity) : currentHumidity;
    if (isNaN(target) || target < 0 || target > 100) return res.status(400).json({ success: false, message: "目標濕度需介於 0~100" });

    // 更新濕度
    const newHumidity = target > currentHumidity ? target : currentHumidity;
    currentFarmStates[uid].humidity = newHumidity;
    // 記錄最後自動灌溉時間，防止背景排程在短時間內重複觸發
    lastAutoIrrigationTimes[uid] = Date.now();

    // 寫入自動灌溉紀錄到 IRRIGATION_LOGS 表
    db.run(`INSERT INTO IRRIGATION_LOGS (user_id, irrigation_type, target_humidity, new_humidity, condition, record_time) VALUES (?, ?, ?, ?, ?, datetime('now', '+8 hours'))`,
        [uid, 'auto', target, newHumidity, `manual trigger or schedule`], function(err) {
            if (err) return res.status(500).json({ success: false, message: "儲存自動灌溉紀錄失敗" });
            db.get(`SELECT COUNT(*) AS total FROM IRRIGATION_LOGS WHERE user_id = ? AND DATE(record_time) = DATE('now', '+8 hours')`, [uid], (countErr, countRow) => {
                const todayCount = countErr ? 'unknown' : countRow.total;
                const timeStr = new Date().toLocaleString('zh-TW', { hour12: false });
                console.log(`[${timeStr}] 💧 [灌溉紀錄] 成功幫使用者 ${uid} 進行自動灌溉 今日灌溉次數：${todayCount}`);
            });
            res.json({ success: true, message: "自動灌溉紀錄已儲存", targetHumidity: target, newHumidity });
        }
    );
});

// ==========================================
// 11. 取得灌溉統計次數報表 API (GET /api/reports/irrigation-count)
// ==========================================
app.get('/api/reports/irrigation-count', (req, res) => {
    const userId = parseUserId(req.query.userId);
    const startDate = req.query.startDate;
    const endDate = req.query.endDate || startDate;
    if (userId === null || !startDate) return res.status(400).json({ success: false, message: '缺少必要參數或 userId 無效' });

    const fromDate = startDate;
    const toDate = endDate || startDate;
    
    // 統計各個日期的總灌溉次數、手動灌溉次數、自動灌溉次數
    const sql = `
        SELECT substr(record_time, 1, 10) as date,
               COUNT(*) as count,
               SUM(CASE WHEN irrigation_type = 'manual' THEN 1 ELSE 0 END) as manual_count,
               SUM(CASE WHEN irrigation_type = 'auto' THEN 1 ELSE 0 END) as auto_count
        FROM IRRIGATION_LOGS
        WHERE user_id = ? AND substr(record_time, 1, 10) BETWEEN ? AND ?
        GROUP BY date
        ORDER BY date ASC
    `;

    db.all(sql, [userId, fromDate, toDate], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: '查詢灌溉統計失敗' });
        // 將查詢結果整理成前端 Chart.js 容易使用的陣列格式
        const labels = rows.map(row => row.date);
        const counts = rows.map(row => Number(row.count));
        const totalCount = counts.reduce((sum, cur) => sum + cur, 0);
        const manualCount = rows.reduce((sum, row) => sum + Number(row.manual_count || 0), 0);
        const autoCount = rows.reduce((sum, row) => sum + Number(row.auto_count || 0), 0);
        res.json({ success: true, labels, counts, totalCount, manualCount, autoCount });
    });
});

// ==========================================
// 12. 取得警示歷史紀錄 API (GET /api/alerts/logs)
// ==========================================
app.get('/api/alerts/logs', (req, res) => {
    const userId = parseUserId(req.query.userId);
    if (userId === null) return res.status(400).json({ success: false, message: "缺少或無效的 userId" });
    // 查詢最新的 20 筆警示紀錄，並將日期與時間拆分
    db.all(`SELECT log_id as id, message as msg, substr(record_time, 1, 10) as date, substr(record_time, 12, 5) as time FROM ALERT_LOGS WHERE user_id = ? ORDER BY record_time DESC LIMIT 20`, [userId], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: "查詢紀錄失敗" });
        res.json({ success: true, logs: rows || [] });
    });
});

// ==========================================
// 13. 設定自動灌溉排程 API (POST /api/schedule)
// ==========================================
app.post('/api/schedule', (req, res) => {
    const { userId, frequency, duration } = req.body;
    const parsedUserId = parseUserId(userId);
    if (parsedUserId === null) return res.status(400).json({ success: false, message: "缺少或無效的 userId" });
    // 檢查是否已有設定
    db.get(`SELECT * FROM SCHEDULE_SETTINGS WHERE user_id = ?`, [parsedUserId], (err, row) => {
        if (row) {
            // 更新既有排程
            db.run(`UPDATE SCHEDULE_SETTINGS SET frequency = ?, duration = ?, updated_at = datetime('now', '+8 hours') WHERE user_id = ?`, [frequency, duration, parsedUserId], () => res.json({ success: true }));
        } else {
            // 插入新排程
            db.run(`INSERT INTO SCHEDULE_SETTINGS (user_id, frequency, duration, updated_at) VALUES (?, ?, ?, datetime('now', '+8 hours'))`, [parsedUserId, frequency, duration], () => res.json({ success: true }));
        }
    });
});

// 💡 新增：處理清空特定使用者警示紀錄的 DELETE API
// ==========================================
// 14. 清空警示紀錄 API (DELETE /api/alerts/logs)
// ==========================================
app.delete('/api/alerts/logs', (req, res) => {
    const userId = parseUserId(req.query.userId);
    const timeStr = new Date().toLocaleString('zh-TW', { hour12: false });
    
    // 檢查有沒有帶 userId
    if (userId === null) {
        console.log(`[${timeStr}] ⚠️ 清空紀錄失敗：前端未提供 userId`);
        return res.status(400).json({ success: false, message: "缺少或無效的 userId 參數" });
    }

    const sql = `DELETE FROM ALERT_LOGS WHERE user_id = ?`;

    db.run(sql, [userId], function(err) {
        if (err) {
            console.error(`[${timeStr}] ❌ 幫使用者 ${userId} 清空警示紀錄時發生 SQL 錯誤:`, err.message);
            return res.status(500).json({ success: false, message: "資料庫刪除失敗" });
        }

        // this.changes 代表這句 SQL 實際影響（刪除）了幾筆資料
        console.log(`[${timeStr}] 🗑️  [清空紀錄] 成功幫使用者 ${userId} 刪除了 ${this.changes} 筆警示紀錄`);
        
        // 回傳前端預期的資料結構
        res.json({ 
            success: true, 
            message: "警示紀錄已成功清空", 
            deletedCount: this.changes 
        });
    });
});

// ==========================================
// 15. 取得使用者排程設定 API (GET /api/schedule)
// ==========================================
app.get('/api/schedule', (req, res) => {
    const userId = parseUserId(req.query.userId);
    if (userId === null) return res.status(400).json({ success: false, message: '缺少或無效的 userId' });
    db.get(`SELECT user_id, frequency, duration, updated_at FROM SCHEDULE_SETTINGS WHERE user_id = ?`, [userId], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: '資料庫查詢錯誤' });
        if (!row) return res.json({ success: true, schedule: null });
        return res.json({ success: true, schedule: { frequency: Number(row.frequency), duration: Number(row.duration), updated_at: row.updated_at } });
    });
});

// ==========================================
// 16. 取得使用者基本資訊 API (GET /api/users/:id)
// ==========================================
app.get('/api/users/:id', (req, res) => {
    db.get(`SELECT rowid as id, nickname, account, avatar FROM USER WHERE rowid = ?`, [req.params.id], (err, row) => {
        if (row) res.json({ success: true, user: row });
        else res.status(404).json({ success: false });
    });
});

// ==========================================
// 17. 更新使用者暱稱 API (PUT /api/users/:id)
// ==========================================
app.put('/api/users/:id', (req, res) => {
    db.run(`UPDATE USER SET nickname = ? WHERE rowid = ?`, [req.body.nickname, req.params.id], () => res.json({ success: true }));
});

// ==========================================
// 18. 更新使用者頭像 API (PUT /api/users/:id/avatar)
// ==========================================
app.put('/api/users/:id/avatar', (req, res) => {
    db.run(`UPDATE USER SET avatar = ? WHERE rowid = ?`, [req.body.avatar, req.params.id], () => res.json({ success: true }));
});

// ==========================================
// 掛載其他路由器
// ==========================================
// 將 crops.js 檔案中定義的所有路由掛載在 /api/crops 之下
app.use('/api/crops', require('./routes/crops'));

// ==========================================
// 啟動伺服器
// ==========================================
app.listen(port, () => {
    console.log(`🚀 後端多使用者架構伺服器已啟動：http://localhost:${port}`);
});