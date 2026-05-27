// server.js
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
            history_time TEXT
        )`);

        // 💡 修正先前 ALERT_LOGS 找不到表崩潰的問題：確保 ALERT_LOGS 表存在
        db.run(`CREATE TABLE IF NOT EXISTS ALERT_LOGS (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            type TEXT,
            value REAL,
            message TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // 2. 確保警示設定表存在
        db.run(`CREATE TABLE IF NOT EXISTS WARNING_RANGE (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE,
            temp_min REAL,
            temp_max REAL,
            humid_min REAL,
            humid_max REAL,
            co2_min REAL,
            co2_max REAL,
            light_min REAL,
            light_max REAL
        )`);
        
        console.log("⚙️ 資料表結構初始化檢查完畢！");
    });
}

// ==========================================
// 核心修改：登入 API (/api/login)
// ==========================================
app.post('/api/login', (req, res) => {
    const { username, password } = req.body; // 前端傳過來的 account 對應 username，password 對應 password

    // 1. 查詢該帳號是否存在於資料庫中
    db.get(`SELECT rowid as id, nickname, account, password, avatar FROM USER WHERE account = ?`, [username], (err, row) => {
        if (err) {
            console.error("❌ 登入查詢資料庫失敗:", err);
            return res.status(500).json({ success: false, message: '資料庫查詢錯誤' });
        }

        // 2. 💡 如果找不到該帳號，回傳特定的「此帳號不存在」訊息，讓前端能夠正確顯示紅字
        if (!row) {
            return res.json({ success: false, message: '此帳號不存在' });
        }

        // 3. 💡 如果帳號存在，但密碼對不上，回傳「密碼輸入錯誤」訊息
        if (row.password !== password) {
            return res.json({ success: false, message: '密碼輸入錯誤' });
        }

        // 4. 驗證完全通過，登入成功
        console.log(`✅ 使用者 [${row.account}] 登入成功！`);
        res.json({
            success: true,
            user: {
                user_id: row.id,     // 提供前端 AsyncStorage 所需的 userId
                nickname: row.nickname,
                account: row.account,
                avatar: row.avatar
            }
        });
    });
});

// ==========================================
// 註冊 API (/api/register)
// ==========================================
app.post('/api/register', (req, res) => {
    const { username, password, nickname, avatar } = req.body;
    
    // 檢查帳號是否已被註冊
    db.get(`SELECT * FROM USER WHERE account = ?`, [username], (err, row) => {
        if (row) {
            return res.json({ success: false, message: '帳號已被註冊' });
        }
        
        // 插入新使用者
        db.run(`INSERT INTO USER (nickname, account, password, avatar) VALUES (?, ?, ?, ?)`, 
            [nickname || username, username, password, avatar || ''], 
            function(err) {
                if (err) return res.json({ success: false, message: '註冊失敗' });
                res.json({ success: true });
            }
        );
    });
});

// ==========================================
// 其他功能 API 路由 (環境、警示、排程)
// ==========================================
app.get('/api/farm/state', (req, res) => {
    const userId = req.query.userId || "1";
    if (!currentFarmStates[userId]) {
        currentFarmStates[userId] = { temperature: 25, humidity: 25, co2: 800, light: 100000 };
    }
    res.json({ success: true, state: currentFarmStates[userId] });
});

app.post('/api/farm/control', (req, res) => {
    const { userId, type, value } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing userId' });
    
    if (!currentFarmStates[userId]) {
        currentFarmStates[userId] = { temperature: 25, humidity: 25, co2: 800, light: 100000 };
    }

    if (type === 'temp') currentFarmStates[userId].temperature = Number(value);
    if (type === 'humid') currentFarmStates[userId].humidity = Number(value);
    if (type === 'co2') currentFarmStates[userId].co2 = Number(value);
    if (type === 'light') currentFarmStates[userId].light = Number(value);

    // 💡 同步模擬將數據寫入歷史報表 (HISTORY)，以便前端報表查看
    db.run(`INSERT INTO HISTORY (user_id, history_temp, history_soil_moisture, history_light, history_co2, history_time) 
            VALUES (?, ?, ?, ?, ?, datetime('now', '+8 hours'))`,
        [userId, currentFarmStates[userId].temperature, currentFarmStates[userId].humidity, currentFarmStates[userId].light, currentFarmStates[userId].co2],
        (err) => {
            if (err) console.error("❌ 寫入歷史紀錄失敗:", err.message);
        }
    );

    res.json({ success: true, state: currentFarmStates[userId] });
});

app.get('/api/reports/history', (req, res) => {
    const { startDate, endDate, userId } = req.query;
    db.all(`SELECT history_temp as temperature, history_soil_moisture as humidity, history_light as light, history_co2 as co2, strftime('%m-%d %H:%M', history_time) as timeStr 
            FROM HISTORY WHERE user_id = ? AND date(history_time) BETWEEN date(?) AND date(?) ORDER BY history_time ASC`, 
        [userId, startDate, endDate], 
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, historyData: [] });
            res.json({ success: true, historyData: rows });
    });
});

app.get('/api/alerts/settings', (req, res) => {
    const userId = req.query.userId;
    db.get(`SELECT * FROM WARNING_RANGE WHERE user_id = ?`, [userId], (err, row) => {
        if (row) {
            res.json({
                success: true,
                settings: {
                    tempRange: [row.temp_min, row.temp_max],
                    humidRange: [row.humid_min, row.humid_max],
                    co2Range: [row.co2_min, row.co2_max],
                    lightRange: [row.light_min, row.light_max]
                }
            });
        } else {
            res.json({ success: false, settings: null });
        }
    });
});

app.post('/api/alerts/settings', (req, res) => {
    const { userId, tempRange, humidRange, co2Range, lightRange } = req.body;
    db.get(`SELECT * FROM WARNING_RANGE WHERE user_id = ?`, [userId], (err, row) => {
        if (row) {
            db.run(`UPDATE WARNING_RANGE SET temp_min=?, temp_max=?, humid_min=?, humid_max=?, co2_min=?, co2_max=?, light_min=?, light_max=? WHERE user_id=?`,
                [tempRange[0], tempRange[1], humidRange[0], humidRange[1], co2Range[0], co2Range[1], lightRange[0], lightRange[1], userId],
                () => res.json({ success: true }));
        } else {
            db.run(`INSERT INTO WARNING_RANGE (user_id, temp_min, temp_max, humid_min, humid_max, co2_min, co2_max, light_min, light_max) VALUES (?,?,?,?,?,?,?,?,?)`,
                [userId, tempRange[0], tempRange[1], humidRange[0], humidRange[1], co2Range[0], co2Range[1], lightRange[0], lightRange[1]],
                () => res.json({ success: true }));
        }
    });
});

app.get('/api/alerts/logs', (req, res) => {
    const userId = req.query.userId;
    db.all(`SELECT type, value, message, strftime('%m-%d %H:%M', timestamp) as timeStr FROM ALERT_LOGS WHERE user_id = ? ORDER BY id DESC LIMIT 20`, [userId], (err, rows) => {
        if (err) return res.status(500).json({ success: false, logs: [] });
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

app.listen(port, () => {
    console.log(`🚀 智慧農場後端伺服器正運行於 http://localhost:${port}`);
});