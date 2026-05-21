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
            return res.status(500).json({ success: false, message: "註冊失敗，帳號可能已經存在" });
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

// --- 啟動伺服器 ---
app.listen(port, () => {
    console.log(`🚀 後端伺服器已啟動：http://localhost:${port}`);
});