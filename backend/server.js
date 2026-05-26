const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const port = 3000;

// --- 設定中介軟體 ---
app.use(cors()); // 允許跨網域請求 (讓前端 APP 可以連過來)
app.use(express.json({ limit: '10mb' })); // 💡 加大接收資料的限制，以便順利接收 Base64 圖片編碼

// --- 連線到我們剛剛建立的 SQLite 資料庫 ---
const db = new sqlite3.Database('./farm.db', (err) => {
    if (err) {
        console.error("資料庫連線失敗:", err.message);
    } else {
        console.log("成功連線到 SQLite 資料庫 (farm.db)！");
        
        db.serialize(() => {
            // 自動嘗試新增 avatar 欄位，若已存在則忽略錯誤
            db.run(`ALTER TABLE USER ADD COLUMN avatar TEXT`, (err) => {
                if (!err) console.log("✅ 已成功為 USER 表新增 avatar 欄位！");
            });

            // 💡 【新增】：自動嘗試為 WARNING_RANGE 表新增 light_warning 欄位，若已存在則忽略
            db.run(`ALTER TABLE WARNING_RANGE ADD COLUMN light_warning TEXT`, (err) => {
                if (!err) console.log("✅ 已成功為 WARNING_RANGE 表新增 light_warning 欄位！");
            });

            // 自動建立灌溉排程設定表 (如果不存在的話)
            db.run(`
                CREATE TABLE IF NOT EXISTS schedule_settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    frequency INTEGER NOT NULL,
                    duration INTEGER NOT NULL,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (!err) {
                    db.get("SELECT COUNT(*) as count FROM schedule_settings", (err, row) => {
                        if (row && row.count === 0) {
                            db.run("INSERT INTO schedule_settings (id, frequency, duration) VALUES (1, 2, 10)", () => {
                                console.log("✅ 已初始化預設排程設定 (每隔 2 分鐘，單次時長 10 分鐘)！");
                            });
                        }
                    });
                }
            });

            // 自動建立作物資料表
            db.run(`
                CREATE TABLE IF NOT EXISTS crops (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    userId INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    stage TEXT,
                    status TEXT,
                    image TEXT
                )
            `, (err) => {
                if (!err) console.log("✅ 已初始化作物 (crops) 資料表！");
            });
        });
    }
});

// ==========================================
//                 API 路由區塊
// ==========================================

// 1. 測試用 API
app.get('/', (req, res) => {
    res.send("智慧農場後端伺服器運作中！");
});

// 2. 註冊 API
app.post('/api/register', (req, res) => {
    const { nickname, username, password, confirmPassword } = req.body;

    if (!nickname || !username || !password || !confirmPassword) {
        return res.status(400).json({ success: false, message: "請填寫所有欄位" });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: "兩次輸入的密碼不一致" });
    }

    const sql = `INSERT INTO USER (nickname, account, password) VALUES (?, ?, ?)`;
    db.run(sql, [nickname, username, password], function(err) {
        if (err) {
            console.error(err.message);
            if (err.message.includes('UNIQUE constraint failed: USER.account')) {
                return res.status(409).json({ success: false, message: "這個帳號已經有人使用了，請換一個！" });
            }
            return res.status(500).json({ success: false, message: "伺服器發生未知的錯誤" });
        }
        res.json({ success: true, message: "註冊成功！", user: { id: this.lastID, nickname: nickname, account: username } });
    });
});

// 3. 登入 API
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const sql = `SELECT rowid as id, nickname, account, password, avatar FROM USER WHERE account = ? AND password = ?`;
    db.get(sql, [username, password], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, message: "資料庫查詢發生錯誤" });
        }
        
        if (row) {
            res.json({ success: true, message: "登入成功！", user: row });
        } else {
            res.status(401).json({ success: false, message: "帳號或密碼錯誤" });
        }
    });
});

// 4. 儲存/更新警示設定 API (POST)
app.post('/api/alerts/settings', (req, res) => {
    // 💡 【修正】：從 req.body 裡面把前端傳來的 lightRange 拿出來
    const { userId, tempRange, humidRange, co2Range, lightRange } = req.body;
    
    console.log(`📡 收到來自使用者 ${userId} 的儲存警示設定請求:`, { tempRange, humidRange, co2Range, lightRange });

    if (!userId) {
        return res.status(400).json({ success: false, message: "缺少使用者 ID" });
    }

    // 將陣列轉換成字串存入資料庫
    const tempStr = JSON.stringify(tempRange);
    const soilStr = JSON.stringify(humidRange);
    const co2Str = JSON.stringify(co2Range);
    const lightStr = JSON.stringify(lightRange); // 💡 【新增】

    // 先檢查該使用者是否已經有設定紀錄
    const checkSql = `SELECT * FROM WARNING_RANGE WHERE user_id = ?`;
    db.get(checkSql, [userId], (err, row) => {
        if (err) {
            console.error("❌ 查詢資料庫失敗:", err.message);
            return res.status(500).json({ success: false, message: "查詢資料庫失敗" });
        }

        if (row) {
            // 如果資料庫已經有該使用者的設定，就執行更新 (💡 補上 light_warning = ?)
            const updateSql = `UPDATE WARNING_RANGE SET temp_warning = ?, soil_warning = ?, co2_warning = ?, light_warning = ? WHERE user_id = ?`;
            db.run(updateSql, [tempStr, soilStr, co2Str, lightStr, userId], function(err) {
                if (err) {
                    console.error("❌ 更新設定失敗:", err.message);
                    return res.status(500).json({ success: false, message: "更新設定失敗" });
                }
                res.json({ success: true, message: "設定更新成功！" });
            });
        } else {
            // 如果沒有紀錄，就新增一筆 (💡 補上 light_warning 欄位與問號)
            const insertSql = `INSERT INTO WARNING_RANGE (user_id, temp_warning, soil_warning, co2_warning, light_warning) VALUES (?, ?, ?, ?, ?)`;
            db.run(insertSql, [userId, tempStr, soilStr, co2Str, lightStr], function(err) {
                if (err) {
                    console.error("❌ 新增設定失敗:", err.message);
                    return res.status(500).json({ success: false, message: "新增設定失敗" });
                }
                res.json({ success: true, message: "設定新增成功！" });
            });
        }
    });
});

// 4b. 取得使用者警示設定 API (GET)
app.get('/api/alerts/settings', (req, res) => {
    const userId = req.query.userId;
    
    console.log(`📡 收到查詢要求，正在讀取使用者 ${userId} 的警示設定...`);

    if (!userId) {
        return res.status(400).json({ success: false, message: "缺少 userId" });
    }

    const sql = `SELECT * FROM WARNING_RANGE WHERE user_id = ?`;
    db.get(sql, [userId], (err, row) => {
        if (err) {
            console.error('❌ 查詢警示設定失敗:', err.message);
            return res.status(500).json({ success: false, message: '查詢警示設定失敗' });
        }

        if (!row) {
            return res.json({ success: true, settings: null });
        }

        try {
            const tempRange = row.temp_warning ? JSON.parse(row.temp_warning) : null;
            const humidRange = row.soil_warning ? JSON.parse(row.soil_warning) : null;
            const co2Range = row.co2_warning ? JSON.parse(row.co2_warning) : null;
            // 💡 【新增】：解析資料庫裡的 light_warning，如果沒有就給予預設值 [500, 50000] 防止前端閃退
            const lightRange = row.light_warning ? JSON.parse(row.light_warning) : [500, 50000];

            return res.json({
                success: true,
                settings: {
                    tempRange,
                    humidRange,
                    co2Range,
                    lightRange // 💡 【新增】丟給前端
                }
            });
        } catch (e) {
            console.error('❌ 解析設定時發生錯誤:', e.message);
            return res.status(500).json({ success: false, message: '解析設定失敗' });
        }
    });
});

// 💡 儲存環境頁面的「自動灌溉排程設定」API
app.post('/api/schedule', (req, res) => {
    const { frequency, duration } = req.body;

    console.log(`📡 收到儲存自動灌溉排程請求 - 頻率: 每隔 ${frequency} 分鐘, 時長: ${duration} 分鐘`);

    if (frequency === undefined || duration === undefined) {
        return res.status(400).json({ success: false, message: "缺少必要的設定數值(frequency/duration)" });
    }

    const sql = `UPDATE schedule_settings SET frequency = ?, duration = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`;
    db.run(sql, [frequency, duration], function(err) {
        if (err) {
            console.error("❌ 更新排程設定失敗:", err.message);
            return res.status(500).json({ success: false, message: "資料庫寫入失敗" });
        }
        res.json({ success: true, message: "排程設定更新成功！" });
    });
});

// ==========================================
//        個人資料頁面所需的 API
// ==========================================

// 5. 取得特定使用者資料 (GET)
app.get('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    const sql = `SELECT rowid as id, nickname, account, avatar FROM USER WHERE rowid = ?`;
    db.get(sql, [userId], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: '資料庫錯誤' });
        if (row) return res.json({ success: true, user: row });
        res.status(404).json({ success: false, message: "找不到使用者" });
    });
});

// 6. 更新使用者暱稱 (PUT)
app.put('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    const { nickname } = req.body;
    
    const sql = `UPDATE USER SET nickname = ? WHERE rowid = ?`;
    db.run(sql, [nickname, userId], function(err) {
        if (err) return res.status(500).json({ success: false, message: '資料庫錯誤' });
        res.json({ success: true, message: "暱稱更新成功" });
    });
});

// 7. 更新大頭貼 (PUT)
app.put('/api/users/:id/avatar', (req, res) => {
    const userId = req.params.id;
    const { avatar } = req.body;
    
    const sql = `UPDATE USER SET avatar = ? WHERE rowid = ?`;
    db.run(sql, [avatar, userId], function(err) {
        if (err) return res.status(500).json({ success: false, message: '資料庫錯誤' });
        res.json({ success: true, message: "大頭貼更新成功" });
    });
});

// ==========================================
//               註冊獨立的 API 路由
// ==========================================
app.use('/api/crops', require('./routes/crops'));

// ==========================================
//               --- 啟動伺服器 ---
// ==========================================
app.listen(port, () => {
    console.log(`🚀 後端伺服器已啟動：http://localhost:${port}`);
});