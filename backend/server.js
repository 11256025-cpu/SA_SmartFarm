const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ==========================================
// 💡 模擬環境變數記憶體暫存區 (全域變數)
// ==========================================
// 初始不預先建立任何使用者狀態，避免未登入就自動觸發定時寫入
let currentFarmStates = {};

// --- 連線到 SQLite 資料庫 ---
const db = new sqlite3.Database('./farm.db', (err) => {
    if (err) {
        console.error("資料庫連線失敗:", err.message);
    } else {
        console.log("成功連線到 SQLite 資料庫 (farm.db)！");
        initializeDatabase(); // 連線成功後，啟動初始化資料表
    }
});

// 💡 確保所有專案需要的資料表都存在
function initializeDatabase() {
    db.serialize(() => {
        // 1. 建立歷史數據表
        db.run(`CREATE TABLE IF NOT EXISTS HISTORY (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            history_temp REAL,
            history_soil_moisture REAL,
            history_light REAL,
            history_co2 REAL,
            record_time TEXT
        )`);

        // 2. 建立警報設定範圍表
        db.run(`CREATE TABLE IF NOT EXISTS WARNING_RANGE (
            user_id TEXT PRIMARY KEY,
            temp_warning TEXT,
            soil_warning TEXT,
            co2_warning TEXT,
            light_warning TEXT
        )`);

        // 3. 建立警報紀錄表 (解決你目前報錯的核心問題)
        db.run(`CREATE TABLE IF NOT EXISTS ALERT_LOGS (
            log_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            message TEXT,
            record_time TEXT
        )`);

        // 4. 建立灌溉紀錄表：手動/自動灌溉事件都會記錄
        db.run(`CREATE TABLE IF NOT EXISTS IRRIGATION_LOGS (
            irrigation_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            irrigation_type TEXT,
            target_humidity REAL,
            new_humidity REAL,
            condition TEXT,
            record_time TEXT
        )`);

        // 5. 建立使用者表 (配合你的 /api/login 和 /api/register)
        db.run(`CREATE TABLE IF NOT EXISTS USER (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nickname TEXT,
            account TEXT UNIQUE,
            password TEXT,
            avatar TEXT
        )`);

        // 5. 建立排程設定表
        db.run(`CREATE TABLE IF NOT EXISTS schedule_settings (
            user_id TEXT PRIMARY KEY,
            frequency TEXT,
            duration TEXT,
            updated_at TEXT
        )`);

        console.log("📋 資料庫資料表檢查與初始化完成！");
        preloadAllUsersState(); // 💡 伺服器啟動時，自動把所有使用者載入記憶體
    });
}

function preloadAllUsersState() {
    db.all(`SELECT id FROM USER`, [], (err, users) => {
        if (err) return console.error("❌ 預載使用者資料失敗:", err.message);
        if (users && users.length > 0) {
            users.forEach(user => initializeUserState(String(user.id)));
            console.log(`🚀 伺服器啟動：已自動掛載 ${users.length} 位使用者的狀態至記憶體！開始自動背景紀錄...`);
        }
    });
}

// ==========================================
// 💡 使用者狀態初始化輔助函數
// ==========================================
const initializeUserState = (uid, callback) => {
    if (currentFarmStates[uid]) {
        return callback && callback(null, currentFarmStates[uid]);
    }
    db.get(`SELECT history_temp as temperature, history_soil_moisture as humidity, history_co2 as co2, history_light as light FROM HISTORY WHERE user_id = ? ORDER BY record_time DESC LIMIT 1`, [uid], (err, row) => {
        if (err) return callback && callback(err);
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
            db.get(`SELECT * FROM schedule_settings WHERE user_id = ?`, [uid], (err2, scheduleRow) => {
                if (err2 || !scheduleRow) return;

                const intervalMinutes = Number(scheduleRow.frequency) || 0;
                if (intervalMinutes <= 0) return;

                let range;
                try {
                    range = JSON.parse(row.soil_warning);
                } catch (e) {
                    range = row.soil_warning ? row.soil_warning.split(',').map(Number) : null;
                }
                if (!Array.isArray(range) || range.length < 2) return;

                const lower = Number(range[0]);
                const upper = Number(range[1]);
                if (isNaN(lower) || isNaN(upper)) return;

                const now = Date.now();
                const lastRun = lastAutoIrrigationTimes[uid] || 0;
                const due = now - lastRun >= intervalMinutes * 60000;

                // 詳細排程檢查日誌，幫助診斷為何未觸發灌溉
                const checkTime = new Date().toLocaleString('zh-TW', { hour12: false });
                console.log(`[${checkTime}] [排程檢查] 使用者 ${uid} | humidity=${state.humidity} | lower=${lower} | upper=${upper} | frequency=${intervalMinutes} | lastRun=${lastRun} | due=${due}`);

                if (state.humidity < lower && due) {
                    const targetHumidity = Math.min(100, upper);
                    const newHumidity = Math.max(state.humidity, targetHumidity);
                    currentFarmStates[uid].humidity = newHumidity;
                    lastAutoIrrigationTimes[uid] = now;

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
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ success: false, message: '缺少 userId' });
    const uid = String(userId);

    if (currentFarmStates[uid]) {
        return res.json({ success: true, state: currentFarmStates[uid] });
    }

    const sql = `SELECT history_temp as temperature, history_soil_moisture as humidity, history_co2 as co2, history_light as light, record_time FROM HISTORY WHERE user_id = ? ORDER BY record_time DESC LIMIT 1`;
    db.get(sql, [uid], (err, row) => {
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

    if (!userId) return res.status(400).json({ success: false, message: "缺少 userId" });
    const uidStr = String(userId);

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

// 💡 3. 報表分頁查詢歷史數據 (🔥 終極相容防爆版)
app.get('/api/reports/history', (req, res) => {
    let { startDate, endDate, date, userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, historyData: [], message: "缺少 userId" });
    
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

    db.all(sql, [start, end, start, end, String(userId)], (err, rows) => {
        if (err) {
            console.error("❌ 查詢歷史報表失敗:", err.message);
            return res.status(500).json({ success: false, historyData: [], message: "資料庫查詢錯誤" });
        }
        
        const safeRows = rows || [];
        console.log(`📊 查詢結果：成功找到 ${safeRows.length} 筆資料，即將發送回前端。`);
        res.json({ success: true, historyData: safeRows });
    });
});

// === 以下維持不變 ===
app.post('/api/register', (req, res) => {
    const { nickname, username, password, confirmPassword } = req.body;
    if (!nickname || !username || !password || !confirmPassword) return res.status(400).json({ success: false, message: "請填寫所有欄位" });
    if (password !== confirmPassword) return res.status(400).json({ success: false, message: "兩次輸入的密碼不一致" });
    const sql = `INSERT INTO USER (nickname, account, password) VALUES (?, ?, ?)`;
    db.run(sql, [nickname, username, password], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed: USER.account')) return res.status(409).json({ success: false, message: "這個帳號已經有人使用了，請換一個！" });
            return res.status(500).json({ success: false, message: "伺服器發生未知的錯誤" });
        }
        // 註冊成功後，也在 currentFarmStates 為該使用者建立初始暫存
        const newId = String(this.lastID);
        if (!currentFarmStates[newId]) {
            currentFarmStates[newId] = { temperature: 25, humidity: 25, co2: 800, light: 100000 };
            console.log(`🆕 註冊後已為使用者 ${newId} 建立初始暫存`);
        }
        res.json({ success: true, message: "註冊成功！", user: { id: this.lastID, nickname: nickname, account: username } });
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const timeStr = new Date().toLocaleString('zh-TW', { hour12: false });
    console.log(`[${timeStr}] 🔐 /api/login request received for username=${username}`);
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
                        if (row2.password !== password) return res.status(401).json({ success: false, message: "帳號或密碼錯誤" });
                        const uidStr2 = String(row2.id);
                        initializeUserState(uidStr2, (initErr) => {
                            if (initErr) console.error(`[/api/login] 初始化使用者 ${uidStr2} 狀態時錯誤:`, initErr.message);
                            return res.json({ success: true, message: "登入成功！", user: row2 });
                        });
                    });
                } else {
                    return res.status(404).json({ success: false, message: "帳號不存在" });
                }
            };

            if (!row) return handleNotFound();
            if (row.password !== password) return res.status(401).json({ success: false, message: "帳號或密碼錯誤" });
            const uidStr = String(row.id);
            initializeUserState(uidStr, (initErr) => {
                if (initErr) console.error(`[/api/login] 初始化使用者 ${uidStr} 狀態時錯誤:`, initErr.message);
                return res.json({ success: true, message: "登入成功！", user: row });
            });
        });
});

app.post('/api/alerts/settings', (req, res) => {
    const { userId, tempRange, humidRange, co2Range, lightRange } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: "缺少使用者 ID" });
    const tempStr = JSON.stringify(tempRange);
    const soilStr = JSON.stringify(humidRange);
    const co2Str = JSON.stringify(co2Range);
    const lightStr = JSON.stringify(lightRange);
    const checkSql = `SELECT * FROM WARNING_RANGE WHERE user_id = ?`;
    db.get(checkSql, [userId], (err, row) => {
        if (row) {
            const updateSql = `UPDATE WARNING_RANGE SET temp_warning = ?, soil_warning = ?, co2_warning = ?, light_warning = ? WHERE user_id = ?`;
            db.run(updateSql, [tempStr, soilStr, co2Str, lightStr, userId], () => res.json({ success: true, message: "設定更新成功！" }));
        } else {
            const insertSql = `INSERT INTO WARNING_RANGE (user_id, temp_warning, soil_warning, co2_warning, light_warning) VALUES (?, ?, ?, ?, ?)`;
            db.run(insertSql, [userId, tempStr, soilStr, co2Str, lightStr], () => res.json({ success: true, message: "設定新增成功！" }));
        }
    });
});

app.get('/api/alerts/settings', (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ success: false, message: "缺少 userId" });
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

        res.json({
            success: true,
            settings: {
                tempRange: safeParse(row.temp_warning),
                humidRange: safeParse(row.soil_warning),
                co2Range: safeParse(row.co2_warning),
                lightRange: safeParse(row.light_warning) || [500, 50000]
            }
        });
    });
});

app.post('/api/alerts/logs', (req, res) => {
    const { userId, message } = req.body;
    if (!userId || !message) return res.status(400).json({ success: false, message: "缺少必要參數" });
    db.run(`INSERT INTO ALERT_LOGS (user_id, message, record_time) VALUES (?, ?, datetime('now', '+8 hours'))`, [userId, message], function(err) {
        if (err) return res.status(500).json({ success: false, message: "新增紀錄失敗" });
        res.json({ success: true, message: "新增紀錄成功", id: this.lastID });
    });
});

app.post('/api/irrigation/manual', (req, res) => {
    const { userId, targetHumidity } = req.body;
    if (!userId || targetHumidity === undefined) return res.status(400).json({ success: false, message: "缺少必要參數" });
    const uid = String(userId);
    const target = Number(targetHumidity);
    if (isNaN(target) || target < 0 || target > 100) return res.status(400).json({ success: false, message: "目標濕度需介於 0~100" });

    if (!currentFarmStates[uid]) {
        currentFarmStates[uid] = { temperature: 25, humidity: 25, co2: 800, light: 100000 };
    }

    const currentHumidity = Number(currentFarmStates[uid].humidity || 0);
    const newHumidity = target > currentHumidity ? target : currentHumidity;
    currentFarmStates[uid].humidity = newHumidity;

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

app.post('/api/irrigation/auto', (req, res) => {
    const { userId, targetHumidity } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: "缺少使用者 ID" });
    const uid = String(userId);
    if (!currentFarmStates[uid]) {
        currentFarmStates[uid] = { temperature: 25, humidity: 25, co2: 800, light: 100000 };
    }

    const currentHumidity = Number(currentFarmStates[uid].humidity || 0);
    const target = targetHumidity !== undefined ? Number(targetHumidity) : currentHumidity;
    if (isNaN(target) || target < 0 || target > 100) return res.status(400).json({ success: false, message: "目標濕度需介於 0~100" });

    const newHumidity = target > currentHumidity ? target : currentHumidity;
    currentFarmStates[uid].humidity = newHumidity;
    lastAutoIrrigationTimes[uid] = Date.now();

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

app.get('/api/reports/irrigation-count', (req, res) => {
    const userId = req.query.userId;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate || startDate;
    if (!userId || !startDate) return res.status(400).json({ success: false, message: '缺少必要參數' });

    const fromDate = startDate;
    const toDate = endDate || startDate;
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

    db.all(sql, [String(userId), fromDate, toDate], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: '查詢灌溉統計失敗' });
        const labels = rows.map(row => row.date);
        const counts = rows.map(row => Number(row.count));
        const totalCount = counts.reduce((sum, cur) => sum + cur, 0);
        const manualCount = rows.reduce((sum, row) => sum + Number(row.manual_count || 0), 0);
        const autoCount = rows.reduce((sum, row) => sum + Number(row.auto_count || 0), 0);
        res.json({ success: true, labels, counts, totalCount, manualCount, autoCount });
    });
});

app.get('/api/alerts/logs', (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ success: false, message: "缺少 userId" });
    db.all(`SELECT log_id as id, message as msg, substr(record_time, 1, 10) as date, substr(record_time, 12, 5) as time FROM ALERT_LOGS WHERE user_id = ? ORDER BY record_time DESC LIMIT 20`, [userId], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: "查詢紀錄失敗" });
        res.json({ success: true, logs: rows || [] });
    });
});

app.post('/api/schedule', (req, res) => {
    const { userId, frequency, duration } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: "缺少 userId" });
    db.get(`SELECT * FROM schedule_settings WHERE user_id = ?`, [userId], (err, row) => {
        if (row) {
            db.run(`UPDATE schedule_settings SET frequency = ?, duration = ?, updated_at = datetime('now', '+8 hours') WHERE user_id = ?`, [frequency, duration, userId], () => res.json({ success: true }));
        } else {
            db.run(`INSERT INTO schedule_settings (user_id, frequency, duration, updated_at) VALUES (?, ?, ?, datetime('now', '+8 hours'))`, [userId, frequency, duration], () => res.json({ success: true }));
        }
    });
});

// 💡 新增：處理清空特定使用者警示紀錄的 DELETE API
app.delete('/api/alerts/logs', (req, res) => {
    const userId = req.query.userId;
    const timeStr = new Date().toLocaleString('zh-TW', { hour12: false });
    
    // 檢查有沒有帶 userId
    if (!userId) {
        console.log(`[${timeStr}] ⚠️ 清空紀錄失敗：前端未提供 userId`);
        return res.status(400).json({ success: false, message: "缺少 userId 參數" });
    }

    const sql = `DELETE FROM ALERT_LOGS WHERE user_id = ?`;

    db.run(sql, [String(userId)], function(err) {
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

// 取得使用者的排程設定
app.get('/api/schedule', (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ success: false, message: '缺少 userId' });
    db.get(`SELECT user_id, frequency, duration, updated_at FROM schedule_settings WHERE user_id = ?`, [userId], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: '資料庫查詢錯誤' });
        if (!row) return res.json({ success: true, schedule: null });
        return res.json({ success: true, schedule: { frequency: Number(row.frequency), duration: Number(row.duration), updated_at: row.updated_at } });
    });
});

app.get('/api/users/:id', (req, res) => {
    db.get(`SELECT rowid as id, nickname, account, avatar FROM USER WHERE rowid = ?`, [req.params.id], (err, row) => {
        if (row) res.json({ success: true, user: row });
        else res.status(404).json({ success: false });
    });
});

app.put('/api/users/:id', (req, res) => {
    db.run(`UPDATE USER SET nickname = ? WHERE rowid = ?`, [req.body.nickname, req.params.id], () => res.json({ success: true }));
});

app.put('/api/users/:id/avatar', (req, res) => {
    db.run(`UPDATE USER SET avatar = ? WHERE rowid = ?`, [req.body.avatar, req.params.id], () => res.json({ success: true }));
});

app.use('/api/crops', require('./routes/crops'));

app.listen(port, () => {
    console.log(`🚀 後端多使用者架構伺服器已啟動：http://localhost:${port}`);
});