const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./farm.db');

db.serialize(() => {
  // 1. 使用者帳號表
  db.run(`CREATE TABLE IF NOT EXISTS USER (
    使用者編號 INTEGER PRIMARY KEY AUTOINCREMENT,
    使用者暱稱 TEXT NOT NULL,
    使用者帳號 TEXT UNIQUE NOT NULL,
    使用者密碼 TEXT NOT NULL
  )`);

  // 2. 使用者自訂作物表
  db.run(`CREATE TABLE IF NOT EXISTS CROP (
    作物編號 INTEGER PRIMARY KEY AUTOINCREMENT,
    使用者編號 INTEGER,
    作物名稱 TEXT NOT NULL,
    適合月份 TEXT,
    適合土壤濕度 REAL,
    生長週期 INTEGER,
    FOREIGN KEY (使用者編號) REFERENCES USER(使用者編號)
  )`);

  // 3. 環境歷史紀錄表
  db.run(`CREATE TABLE IF NOT EXISTS HISTORY (
    紀錄編號 INTEGER PRIMARY KEY AUTOINCREMENT,
    使用者編號 INTEGER,
    紀錄時間 DATETIME DEFAULT CURRENT_TIMESTAMP,
    歷史溫度 REAL,
    歷史土壤濕度 REAL,
    歷史光照強度 REAL,
    歷史二氧化碳強度 REAL,
    FOREIGN KEY (使用者編號) REFERENCES USER(使用者編號)
  )`);

  // 4. 溫室灌溉設定表
  db.run(`CREATE TABLE IF NOT EXISTS IRRIGATION (
    使用者編號 INTEGER PRIMARY KEY,
    灌溉頻率 INTEGER,
    灌溉時長 INTEGER,
    FOREIGN KEY (使用者編號) REFERENCES USER(使用者編號)
  )`);

  // 5. 溫室警示設定表
  db.run(`CREATE TABLE IF NOT EXISTS WARNING_RANGE (
    使用者編號 INTEGER PRIMARY KEY,
    溫度警示範圍 TEXT,
    土壤警示範圍 TEXT,
    二氧化碳警示範圍 TEXT,
    FOREIGN KEY (使用者編號) REFERENCES USER(使用者編號)
  )`);

  console.log("資料庫與 5 張資料表建立完成！");
});

db.close();