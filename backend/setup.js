/*
 * backend/setup.js - 設定或初始化後端資料庫。
 */
const sqlite3 = require('sqlite3').verbose();

// 連線並建立 SQLite 資料庫
const db = new sqlite3.Database('./farm.db', (err) => {
    if (err) {
        console.error("資料庫連線失敗:", err.message);
    } else {
        console.log("成功連線到 SQLite 資料庫 (farm.db)！開始建立資料表...");
    }
});

db.serialize(() => {
    // 1. 建立 USER 表格 (使用者資訊)
    db.run(`CREATE TABLE IF NOT EXISTS USER (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nickname TEXT NOT NULL,
        account TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        avatar TEXT
    )`);

    // 2. 建立 WARNING_RANGE 表格 (警示範圍 - 每個使用者只需一筆設定，所以用 user_id 當主鍵)
    db.run(`CREATE TABLE IF NOT EXISTS WARNING_RANGE (
        user_id INTEGER PRIMARY KEY,
        temp_warning TEXT,
        soil_warning TEXT,
        co2_warning TEXT,
        light_warning TEXT
    )`);

    // 3. 建立 ALERT_LOGS 表格 (警示紀錄)
    db.run(`CREATE TABLE IF NOT EXISTS ALERT_LOGS (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        message TEXT,
        record_time DATETIME DEFAULT (datetime('now', '+8 hours'))
    )`);

    // 4. 建立 IRRIGATION_LOGS 表格 (灌溉紀錄)
    db.run(`CREATE TABLE IF NOT EXISTS IRRIGATION_LOGS (
        irrigation_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        irrigation_type TEXT,
        target_humidity REAL,
        new_humidity REAL,
        condition TEXT,
        record_time DATETIME DEFAULT (datetime('now', '+8 hours'))
    )`);

    // 5. 建立 HISTORY 表格 (歷史數據)
    db.run(`CREATE TABLE IF NOT EXISTS HISTORY (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        history_temp REAL,
        history_soil_moisture REAL,
        history_light REAL,
        history_co2 REAL,
        record_time DATETIME DEFAULT (datetime('now', '+8 hours'))
    )`);

    // 5. 建立 SCHEDULE_SETTINGS 表格 (自動灌溉排程 - 刪除了重複的 IRRIGATION 表，統一用這個)
    db.run(`CREATE TABLE IF NOT EXISTS SCHEDULE_SETTINGS (
        user_id INTEGER PRIMARY KEY,
        frequency TEXT,
        duration TEXT,
        updated_at DATETIME DEFAULT (datetime('now', '+8 hours'))
    )`);

    // 6. 建立 CROPS 表格 (作物資料)
    // 💡 新增了 history 欄位，用來儲存作物的「狀態變更紀錄 (JSON 字串)」
    db.run(`CREATE TABLE IF NOT EXISTS CROPS (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        stage TEXT,
        status TEXT,
        image TEXT,
        history TEXT
    )`, () => {
        // 💡 嘗試為舊有的 CROPS 表格補上 history 欄位
        db.run(`ALTER TABLE CROPS ADD COLUMN history TEXT`, (err) => {
            // 如果 err 存在，通常是因為欄位已經存在，可以直接忽略
            console.log("✅ 所有資料表建立與優化完成 (已為舊表補上 history 欄位)！");
            db.close();
        });
    });
});