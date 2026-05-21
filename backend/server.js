const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const port = 3000;

// --- 設定中介軟體 ---
app.use(cors()); // 允許跨網域請求 (讓前端 APP 可以連過來)
app.use(express.json()); // 讓伺服器能看得懂前端傳來的 JSON 資料

// --- 連線到我們剛剛建立的 SQLite 資料庫 ---
const db = new sqlite3.Database('./farm.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error("資料庫連線失敗:", err.message);
    } else {
        console.log("成功連線到 SQLite 資料庫 (farm.db)！");
    }
});

// ==========================================
//                API 路由區塊
// ==========================================

// 1. 測試用 API (打開瀏覽器可以確認伺服器有沒有活著)
app.get('/', (req, res) => {
    res.send("智慧農場後端伺服器運作中！");
});

// 2. 註冊 API (接收前端資料寫入 USER 表)
app.post('/api/register', (req, res) => {
    // 從前端傳來的資料中抓取 暱稱、帳號、密碼
    const { nickname, username, password } = req.body;

    // 檢查有沒有漏填
    if (!nickname || !username || !password) {
        return res.status(400).json({ success: false, message: "請填寫所有欄位" });
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
        // 註冊成功，回傳自動產生的 使用者編號 (this.lastID)
        res.json({ success: true, message: "註冊成功！", userId: this.lastID });
    });
});

// 3. 登入 API (去 USER 表比對帳號密碼)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    const sql = `SELECT * FROM USER WHERE account = ? AND password = ?`;
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

// 4. 儲存/更新警示設定 API
app.post('/api/alerts/settings', (req, res) => {
    const { userId, tempRange, humidRange, co2Range } = req.body;
    
    console.log(`📡 收到來自使用者 ${userId} 的警示設定請求:`, { tempRange, humidRange, co2Range });

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

// --- 啟動伺服器 ---
app.listen(port, () => {
    console.log(`🚀 後端伺服器已啟動：http://localhost:${port}`);
});