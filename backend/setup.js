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
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        nickname TEXT NOT NULL,
        account TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        avatar TEXT
    )`);

    // 3. 建立 IRRIGATION 表格 (灌溉設定)
    db.run(`CREATE TABLE IF NOT EXISTS IRRIGATION (
        irrigation_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        irrigation_freq TEXT,
        irrigation_duration INTEGER,
        FOREIGN KEY (user_id) REFERENCES USER(user_id)
    )`);

    // 4. 建立 WARNING_RANGE 表格 (警示範圍)
    db.run(`CREATE TABLE IF NOT EXISTS WARNING_RANGE (
        warning_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        temp_warning TEXT,
        soil_warning TEXT,
        co2_warning TEXT,
        light_warning TEXT, -- 💡 補上先前新增的 light_warning
        FOREIGN KEY (user_id) REFERENCES USER(user_id)
    )`);

    // 4.5 建立 ALERT_LOGS 表格 (警示紀錄)
    db.run(`CREATE TABLE IF NOT EXISTS ALERT_LOGS (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        message TEXT,
        record_time DATETIME DEFAULT (datetime('now', '+8 hours')),
        FOREIGN KEY (user_id) REFERENCES USER(user_id)
    )`);

    // 5. 建立 HISTORY 表格 (歷史紀錄)
    // 💡 修正：將時間預設值改為 台灣時區 (+8小時)，確保圖表時間軸正確
    db.run(`CREATE TABLE IF NOT EXISTS HISTORY (
        record_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        record_time DATETIME DEFAULT (datetime('now', '+8 hours')), 
        history_temp REAL,
        history_soil_moisture REAL,
        history_light REAL,
        history_co2 REAL,
        FOREIGN KEY (user_id) REFERENCES USER(user_id)
    )`);

    // 6. 建立 schedule_settings 表格 (自動灌溉排程設定)
    // 💡 修正：補上 user_id 與外鍵，防止所有使用者的排程混在一起
    db.run(`CREATE TABLE IF NOT EXISTS schedule_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER, -- 👈 新增：區分是誰的排程設定
        frequency INTEGER NOT NULL,
        duration INTEGER NOT NULL,
        updated_at DATETIME DEFAULT (datetime('now', '+8 hours')), -- 💡 同步修正為台灣時區
        FOREIGN KEY (user_id) REFERENCES USER(user_id)
    )`);

    // 7. 建立 crops 表格 (作物資料)
    // 💡 修正：將 userId 改為 user_id，保持資料庫命名欄位一致性
    db.run(`CREATE TABLE IF NOT EXISTS crops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL, -- 👈 修正欄位名稱
        name TEXT NOT NULL,
        stage TEXT,
        status TEXT,
        image TEXT,
        FOREIGN KEY (user_id) REFERENCES USER(user_id)
    )`, () => {
        console.log("✅ 所有資料表建立完成且已完成使用者隔離綁定！");
        db.close();
    });
});