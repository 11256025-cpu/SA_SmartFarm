const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const port = 3000;

// --- 設定中介軟體 ---
app.use(cors()); // 允許跨網域請求 (讓前端 APP 可以連過來)
app.use(express.json({ limit: '10mb' })); // 💡 加大接收資料的限制，以便順利接收 Base64 圖片編碼

// --- 連線到我們剛剛建立的 SQLite 資料庫 ---
// 💡 修正：移除 sqlite3.OPEN_READWRITE，讓資料庫在遺失時會自動建立新的
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

            // 💡 新增：自動建立灌溉排程設定表 (如果不存在的話)
            db.run(`
                CREATE TABLE IF NOT EXISTS schedule_settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    frequency INTEGER NOT NULL,
                    duration INTEGER NOT NULL,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (!err) {
                    // 💡 防呆：如果表裡面完全沒資料，就自動塞入一筆預設資料 (id=1)，方便後續直接更新
                    db.get("SELECT COUNT(*) as count FROM schedule_settings", (err, row) => {
                        if (row && row.count === 0) {
                            db.run("INSERT INTO schedule_settings (id, frequency, duration) VALUES (1, 2, 10)", () => {
                                console.log("✅ 已初始化預設排程設定 (每隔 2 分鐘，單次時長 10 分鐘)！");
                            });
                        }
                    });
                }
            });

            // 💡 新增：自動建立作物資料表
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

        // 💡 新增：自動建立 HISTORY 表格並塞入假資料測試
        db.run(`
            CREATE TABLE IF NOT EXISTS HISTORY (
                record_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                record_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                history_temp REAL,
                history_soil_moisture REAL,
                history_light REAL,
                history_co2 REAL,
                FOREIGN KEY (user_id) REFERENCES USER(user_id)
            )
        `, (err) => {
            if (!err) {
                db.get("SELECT COUNT(*) as count FROM HISTORY", (err, row) => {
                    if (row && row.count === 0) {
                        // 插入幾筆假資料給 user_id = 1，模擬隨時間變化的數據
                        const insert = db.prepare("INSERT INTO HISTORY (user_id, history_temp, history_soil_moisture, history_light, history_co2, record_time) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime', ?))");
                        insert.run(1, 25.5, 45, 12000, 400, '-5 hours');
                        insert.run(1, 26.2, 42, 15000, 410, '-4 hours');
                        insert.run(1, 27.8, 40, 18000, 420, '-3 hours');
                        insert.run(1, 29.1, 35, 20000, 430, '-2 hours');
                        insert.run(1, 28.5, 30, 16000, 415, '-1 hours'); 
                        insert.run(1, 27.0, 55, 13000, 405, '0 hours');
                        insert.finalize();
                        console.log("✅ 已初始化歷史紀錄 (HISTORY) 預設假資料！");
                    }
                });
            }
        });
        });
    }
});

// ==========================================
//                 API 路由區塊
// ==========================================

// 1. 測試用 API (打開瀏覽器可以確認伺服器有沒有活著)
app.get('/', (req, res) => {
    res.send("智慧農場後端伺服器運作中！");
});

// 2. 註冊 API (接收前端資料寫入 USER 表)
app.post('/api/register', (req, res) => {
    // 💡 加上 confirmPassword 接收前端傳過來的確認密碼
    const { nickname, username, password, confirmPassword } = req.body;

    // 檢查有沒有漏填
    if (!nickname || !username || !password || !confirmPassword) {
        return res.status(400).json({ success: false, message: "請填寫所有欄位" });
    }

    // 💡 後端二次防線：檢查兩次密碼是否一致
    if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: "兩次輸入的密碼不一致" });
    }

    // 寫入資料庫的 SQL 語法 (? 是為了防止隱碼攻擊)
    const sql = `INSERT INTO USER (nickname, account, password) VALUES (?, ?, ?)`;
    db.run(sql, [nickname, username, password], function(err) {
        if (err) {
            console.error(err.message);
            // 檢查是不是因為帳號重複 (UNIQUE constraint failed) 導致的錯誤
            if (err.message.includes('UNIQUE constraint failed: USER.account')) {
                return res.status(409).json({ success: false, message: "這個帳號已經有人使用了，請換一個！" });
            }
            return res.status(500).json({ success: false, message: "伺服器發生未知的錯誤" });
        }
        // 註冊成功，回傳如同登入時的使用者資訊，方便前端直接存入快取並自動登入
        res.json({ success: true, message: "註冊成功！", user: { id: this.lastID, nickname: nickname, account: username } });
    });
});

// 3. 登入 API (去 USER 表比對帳號密碼)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // 💡 加上 rowid as id，這樣前端才能精準拿到使用者的 ID
    const sql = `SELECT rowid as id, nickname, account, password, avatar FROM USER WHERE account = ? AND password = ?`;
    db.get(sql, [username, password], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, message: "資料庫查詢發生錯誤" });
        }
        
        if (row) {
            // 如果有找到這筆資料，代表帳密正確
            res.json({ success: true, message: "登入成功！", user: row });
        } else {
            // 找不到資料，帳號或密碼錯誤
            res.status(401).json({ success: false, message: "帳號或密碼錯誤" });
        }
    });
});

// 4. 儲存/更新警示設定 API (POST)
app.post('/api/alerts/settings', (req, res) => {
    const { userId, tempRange, humidRange, co2Range } = req.body;
    
    console.log(`📡 收到來自使用者 ${userId} 的儲存警示設定請求:`, { tempRange, humidRange, co2Range });

    if (!userId) {
        return res.status(400).json({ success: false, message: "缺少使用者 ID" });
    }

    // 將陣列轉換成字串存入資料庫 (例如 "[15,35]")
    const tempStr = JSON.stringify(tempRange);
    const soilStr = JSON.stringify(humidRange);
    const co2Str = JSON.stringify(co2Range);

    // 先檢查該使用者是否已經有設定紀錄
    const checkSql = `SELECT * FROM WARNING_RANGE WHERE user_id = ?`;
    db.get(checkSql, [userId], (err, row) => {
        if (err) {
            console.error("❌ 查詢資料庫失敗:", err.message);
            return res.status(500).json({ success: false, message: "查詢資料庫失敗" });
        }

        if (row) {
            // 如果資料庫已經有該使用者的設定，就執行更新
            const updateSql = `UPDATE WARNING_RANGE SET temp_warning = ?, soil_warning = ?, co2_warning = ? WHERE user_id = ?`;
            db.run(updateSql, [tempStr, soilStr, co2Str, userId], function(err) {
                if (err) {
                    console.error("❌ 更新設定失敗:", err.message);
                    return res.status(500).json({ success: false, message: "更新設定失敗" });
                }
                res.json({ success: true, message: "設定更新成功！" });
            });
        } else {
            // 如果沒有紀錄，就新增一筆
            const insertSql = `INSERT INTO WARNING_RANGE (user_id, temp_warning, soil_warning, co2_warning) VALUES (?, ?, ?, ?)`;
            db.run(insertSql, [userId, tempStr, soilStr, co2Str], function(err) {
                if (err) {
                    console.error("❌ 新增設定失敗:", err.message);
                    return res.status(500).json({ success: false, message: "新增設定失敗" });
                }
                res.json({ success: true, message: "設定新增成功！" });
            });
        }
    });
});

// 4b. 取得使用者警示設定 API (GET)（回傳上次儲存的警示範圍給前端畫面）
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
            // 使用者尚未有任何設定
            return res.json({ success: true, settings: null });
        }

        try {
            const tempRange = row.temp_warning ? JSON.parse(row.temp_warning) : null;
            const humidRange = row.soil_warning ? JSON.parse(row.soil_warning) : null;
            const co2Range = row.co2_warning ? JSON.parse(row.co2_warning) : null;

            return res.json({
                success: true,
                settings: {
                    tempRange,
                    humidRange,
                    co2Range
                }
            });
        } catch (e) {
            console.error('❌ 解析設定時發生錯誤:', e.message);
            return res.status(500).json({ success: false, message: '解析設定失敗' });
        }
    });
});

// 💡 新增：儲存環境頁面的「自動灌溉排程設定」API
app.post('/api/schedule', (req, res) => {
    const { frequency, duration } = req.body;

    console.log(`📡 收到儲存自動灌溉排程請求 - 頻率: 每隔 ${frequency} 分鐘, 時長: ${duration} 分鐘`);

    // 檢查欄位是否存在
    if (frequency === undefined || duration === undefined) {
        return res.status(400).json({ success: false, message: "缺少必要的設定數值(frequency/duration)" });
    }

    // 更新固定 id = 1 的那一筆設定紀錄
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
    
    // 利用 SQLite 內建的 rowid 來精準搜尋該帳號
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
// 8. 取得歷史紀錄 API (GET)
// ==========================================
app.get('/api/history', (req, res) => {
    const userId = req.query.userId;
    const limit = req.query.limit || 30; // 💡 放大預設筆數，讓圖表能顯示更多趨勢
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    if (!userId) {
        return res.status(400).json({ success: false, message: "缺少 userId" });
    }

    let sql = `SELECT * FROM HISTORY WHERE user_id = ?`;
    const params = [userId];

    // 💡 如果有傳入開始日期，就過濾大於該日期的 00:00:00
    if (startDate) {
        sql += ` AND record_time >= ?`;
        params.push(`${startDate} 00:00:00`);
    }
    
    // 💡 如果有傳入結束日期，就過濾小於該日期的 23:59:59
    if (endDate) {
        sql += ` AND record_time <= ?`;
        params.push(`${endDate} 23:59:59`);
    }

    // 依據時間降冪排序撈出最新資料
    sql += ` ORDER BY record_time DESC LIMIT ?`;
    params.push(limit);

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: '資料庫錯誤' });
        
        // 將結果反轉，讓最舊的時間在左邊，最新的在右邊，符合圖表閱讀直覺
        res.json({ success: true, data: rows.reverse() });
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