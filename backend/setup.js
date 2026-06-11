/*
 * backend/setup.js - 設定或初始化後端資料庫。
 * 此腳本用於建立所有必要的資料庫表格，並確保資料庫結構是最新的。
 */
const sqlite3 = require('sqlite3').verbose();

// 連線到 SQLite 資料庫檔案 'farm.db'。
// 如果檔案不存在，則會自動建立。
// `verbose()` 模式會提供更詳細的堆疊追蹤，便於除錯。
const db = new sqlite3.Database('./farm.db', (err) => {
    if (err) {
        // 如果連線失敗，輸出錯誤訊息到控制台。
        console.error("資料庫連線失敗:", err.message);
    } else {
        // 如果連線成功，輸出成功訊息並提示開始建立資料表。
        console.log("成功連線到 SQLite 資料庫 (farm.db)！開始建立資料表...");
    }
});

db.serialize(() => {
    // 1. 建立 USER 表格 (使用者資訊)
    // 儲存使用者帳戶的基本資料，例如暱稱、帳號、密碼和頭像。
    // `account` 欄位設定為 `UNIQUE NOT NULL`，確保帳號的唯一性。
    db.run(`CREATE TABLE IF NOT EXISTS USER (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nickname TEXT NOT NULL,
        account TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        avatar TEXT
    )`);

    // 2. 建立 WARNING_RANGE 表格 (警示範圍 - 每個使用者只需一筆設定，所以用 user_id 當主鍵)
    // 儲存使用者自定義的各項環境參數（溫度、濕度、二氧化碳、光照）的警示上下限。
    // `user_id` 作為主鍵，保證每個使用者只有一組警示設定。
    db.run(`CREATE TABLE IF NOT EXISTS WARNING_RANGE (
        user_id INTEGER PRIMARY KEY,
        temp_warning TEXT,
        soil_warning TEXT,
        co2_warning TEXT,
        light_warning TEXT
    )`);

    // 3. 建立 ALERT_LOGS 表格 (警示紀錄)
    // 記錄系統觸發的所有警示訊息，包含觸發警示的使用者ID、訊息內容和紀錄時間。
    // `record_time` 自動設定為當前時間（UTC+8）。
    db.run(`CREATE TABLE IF NOT EXISTS ALERT_LOGS (
        alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        message TEXT,
        record_time DATETIME DEFAULT (datetime('now', '+8 hours'))
    )`);

    // 4. 建立 IRRIGATION_LOGS 表格 (灌溉紀錄)
    // 記錄每一次灌溉事件的詳細資訊，包括灌溉類型（手動/自動）、目標濕度、實際濕度變化、觸發條件和紀錄時間。
    // `record_time` 自動設定為當前時間（UTC+8）。
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
    // 儲存智能農場環境感測器的歷史數據，如溫度、土壤濕度、光照和二氧化碳濃度。
    // `record_time` 自動設定為當前時間（UTC+8）。
    db.run(`CREATE TABLE IF NOT EXISTS HISTORY (
        history_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        history_temp REAL,
        history_soil_moisture REAL,
        history_light REAL,
        history_co2 REAL,
        record_time DATETIME DEFAULT (datetime('now', '+8 hours'))
    )`);

    // 5. 建立 SCHEDULE_SETTINGS 表格 (自動灌溉排程 - 刪除了重複的 IRRIGATION 表，統一用這個)
    // 儲存使用者的自動灌溉排程設定，包含灌溉頻率和持續時間。
    // `updated_at` 自動記錄最後更新時間（UTC+8）。
    db.run(`CREATE TABLE IF NOT EXISTS SCHEDULE_SETTINGS (
        user_id INTEGER PRIMARY KEY,
        frequency TEXT,
        duration TEXT,
        updated_at DATETIME DEFAULT (datetime('now', '+8 hours'))
    )`);

    // 6. 建立 CROPS 表格 (作物資料)
    // 儲存使用者種植的作物資訊，包括名稱、生長階段、狀態、圖片以及作物的歷史狀態變更紀錄（以 JSON 字串形式儲存）。
    // 💡 新增了 history 欄位，用來儲存作物的「狀態變更紀錄 (JSON 字串)」
    db.run(`CREATE TABLE IF NOT EXISTS CROPS (
        crops_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        stage TEXT,
        status TEXT,
        image TEXT,
        history TEXT
    )`, () => {
        // 💡 嘗試為舊有的 CROPS 表格補上 history 欄位
        // 如果 `history` 欄位已存在，此 ALTER TABLE 指令會因錯誤而跳過（並在控制台列印訊息）。
        db.run(`ALTER TABLE CROPS ADD COLUMN history TEXT`, (err) => {
            // 如果 err 存在，通常是因為欄位已經存在，可以直接忽略
            console.log("✅ 所有資料表建立完成！");
            db.close();
        });
    });
});