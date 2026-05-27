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
let currentFarmStates = {
    "1": { temperature: 25, humidity: 25, co2: 800, light: 100000 }
};

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

        // 4. 建立使用者表 (配合你的 /api/login 和 /api/register)
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
    });
}

// ==========================================
// 💡 背景自動寫入機制 (每 10 秒自動紀錄)
// ==========================================
let lastAlertTimes = {}; // 紀錄各類警報最後發送時間，避免洗版 { "1_temp": timestamp }

setInterval(() => {
    const userIds = Object.keys(currentFarmStates);

    if (userIds.length === 0) return;

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
            if (err) {
                console.error(`❌ 定時寫入使用者 ${uid} 失敗:`, err.message);
            } else {
                console.log(`🕒 [定時紀錄] 成功幫使用者 ${uid} 寫入歷史數據:`, state);
            }
        });

        // 💡 檢查警示設定並產生紀錄
        db.get(`SELECT * FROM WARNING_RANGE WHERE user_id = ?`, [uid], (err, row) => {
            if (err || !row) return;

            const checkAndAlert = (type, value, rangeStr, unit) => {
                if (!rangeStr) return;
                const range = JSON.parse(rangeStr);
                if (value < range[0] || value > range[1]) {
                    const alertKey = `${uid}_${type}`;
                    const now = Date.now();
                    // 60秒內不重複發送同類型警報
                    if (!lastAlertTimes[alertKey] || now - lastAlertTimes[alertKey] > 60000) {
                        const msg = `⚠️ ${type}異常！當前數值 ${value}${unit} (允許範圍: ${range[0]}~${range[1]})`;
                        db.run(`INSERT INTO ALERT_LOGS (user_id, message, record_time) VALUES (?, ?, datetime('now', '+8 hours'))`, [uid, msg]);
                        lastAlertTimes[alertKey] = now;
                        console.log(`🚨 [警示觸發] ${msg}`);
                    }
                }
            };

            checkAndAlert('環境溫度', state.temperature, row.temp_warning, '°C');
            checkAndAlert('土壤濕度', state.humidity, row.soil_warning, '%');
            checkAndAlert('二氧化碳', state.co2, row.co2_warning, 'ppm');
            checkAndAlert('光照強度', state.light, row.light_warning, 'lux');
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

// 💡 2. 控制面板滑軌放開時更新暫存
app.post('/api/simulator/update', (req, res) => {
    let { userId, temperature, humidity, co2, light } = req.body;

    if (!userId) userId = "1";
    const uidStr = String(userId);

    if (!currentFarmStates[uidStr]) {
        currentFarmStates[uidStr] = { temperature: 25, humidity: 25, co2: 800, light: 100000 };
    }

    if (temperature !== undefined) currentFarmStates[uidStr].temperature = Number(temperature);
    if (humidity !== undefined) currentFarmStates[uidStr].humidity = Number(humidity);
    if (co2 !== undefined) currentFarmStates[uidStr].co2 = Number(co2);
    if (light !== undefined) currentFarmStates[uidStr].light = Number(light);

    console.log(`🎛️ 使用者 ${uidStr} 更新了控制面板暫存:`, currentFarmStates[uidStr]);

    res.json({ success: true, currentState: currentFarmStates[uidStr] });
});

// 💡 3. 報表分頁查詢歷史數據 (🔥 終極相容防爆版)
app.get('/api/reports/history', (req, res) => {
    let { startDate, endDate, date, userId } = req.query;

    if (!userId) userId = "1";
    
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
        res.json({ success: true, message: "註冊成功！", user: { id: this.lastID, nickname: nickname, account: username } });
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const sql = `SELECT rowid as id, nickname, account, password, avatar FROM USER WHERE account = ? AND password = ?`;
    db.get(sql, [username, password], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: "資料庫查詢發生錯誤" });
        if (row) res.json({ success: true, message: "登入成功！", user: row });
        else res.status(401).json({ success: false, message: "帳號或密碼錯誤" });
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
        res.json({
            success: true,
            settings: {
                tempRange: row.temp_warning ? JSON.parse(row.temp_warning) : null,
                humidRange: row.soil_warning ? JSON.parse(row.soil_warning) : null,
                co2Range: row.co2_warning ? JSON.parse(row.co2_warning) : null,
                lightRange: row.light_warning ? JSON.parse(row.light_warning) : [500, 50000]
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
    db.get(`SELECT * FROM schedule_settings WHERE user_id = ?`, [userId], (err, row) => {
        if (row) {
            db.run(`UPDATE schedule_settings SET frequency = ?, duration = ?, updated_at = datetime('now', '+8 hours') WHERE user_id = ?`, [frequency, duration, userId], () => res.json({ success: true }));
        } else {
            db.run(`INSERT INTO schedule_settings (user_id, frequency, duration, updated_at) VALUES (?, ?, ?, datetime('now', '+8 hours'))`, [userId, frequency, duration], () => res.json({ success: true }));
        }
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