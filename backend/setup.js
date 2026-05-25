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
        FOREIGN KEY (user_id) REFERENCES USER(user_id)
    )`);

    // 5. 建立 HISTORY 表格 (歷史紀錄)
    db.run(`CREATE TABLE IF NOT EXISTS HISTORY (
        record_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        record_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        history_temp REAL,
        history_soil_moisture REAL,
        history_light REAL,
        history_co2 REAL,
        FOREIGN KEY (user_id) REFERENCES USER(user_id)
    )`);

    // 6. 建立 schedule_settings 表格 (自動灌溉排程設定)
    db.run(`CREATE TABLE IF NOT EXISTS schedule_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        frequency INTEGER NOT NULL,
        duration INTEGER NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 7. 建立 crops 表格 (作物資料)
    db.run(`CREATE TABLE IF NOT EXISTS crops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        name TEXT NOT NULL,
        stage TEXT,
        status TEXT,
        image TEXT
    )`, () => {
        console.log("✅ 所有資料表建立完成！");
        db.close();
    });
});