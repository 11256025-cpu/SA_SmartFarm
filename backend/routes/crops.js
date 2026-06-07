/*
 * backend/routes/crops.js - 作物相關 API 路由與資料庫查詢邏輯。
 * 這個模組負責處理前端對於作物資料的 CRUD (建立、讀取、更新、刪除) 請求。
 */
const express = require('express');
// 建立 Express 路由器實例，將作物相關的路由獨立管理
const router = express.Router();
// 引入 SQLite3 模組，並啟用 verbose 模式以提供詳細的錯誤追蹤
const sqlite3 = require('sqlite3').verbose();

// 建立或連線到資料庫 (請根據你實際的資料庫路徑進行調整)
// 這裡連線到位於專案根目錄下的 'farm.db' SQLite 資料庫檔案
const db = new sqlite3.Database('./farm.db'); 

// ==========================================
// 1. 取得使用者的作物列表 (GET /api/crops?userId=1)
// ==========================================
router.get('/', (req, res) => {
    // 從請求的查詢字串 (query string) 中取得 userId，並嘗試轉換為整數
    const userId = Number(req.query.userId);
    // 檢查 userId 是否為有效的整數，若無效則回傳 400 錯誤
    if (!Number.isInteger(userId)) {
        return res.status(400).json({ success: false, message: '缺少或無效的 userId 參數' });
    }

    // 查詢 CROPS 表格中屬於該使用者的所有作物資料
    const sql = `SELECT * FROM CROPS WHERE user_id = ?`;
    db.all(sql, [userId], (err, rows) => {
        if (err) {
            // 若查詢發生錯誤，記錄錯誤訊息並回傳 500 伺服器錯誤
            console.error('取得作物失敗:', err);
            return res.status(500).json({ success: false, message: '資料庫讀取失敗' });
        }
        
        // 💡 讀取時，將資料庫中的字串解開回陣列
        // 因為 SQLite 沒有原生的陣列型別，歷史紀錄是存成 JSON 字串，這裡將其解析回 JavaScript 陣列或物件
        const formattedRows = rows.map(row => ({
            ...row,
            history: row.history ? JSON.parse(row.history) : []
        }));
        // 回傳成功狀態及格式化後的作物列表
        res.json({ success: true, crops: formattedRows });
    });
});

// ==========================================
// 2. 新增作物 (POST /api/crops)
// ==========================================
router.post('/', (req, res) => {
    // 從請求主體 (request body) 提取新增作物的相關欄位
    const { userId, name, stage, status, image, history } = req.body;
    const userIdInt = Number(userId);

    // 檢查必要的欄位 (userId 和 name) 是否存在且格式正確
    if (!Number.isInteger(userIdInt) || !name) {
        return res.status(400).json({ success: false, message: '缺少必要欄位 (userId, name) 或 userId 格式錯誤' });
    }

    // 💡 將陣列轉換成字串再存入資料庫
    // 如果 history 未提供則預設為空陣列
    const historyStr = JSON.stringify(history || []);

    // 執行插入資料的 SQL 語法
    const sql = `INSERT INTO CROPS (user_id, name, stage, status, image, history) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [userIdInt, name, stage, status, image, historyStr], function(err) {
        if (err) {
            // 發生寫入錯誤時回傳 500 伺服器錯誤
            console.error('新增作物失敗:', err);
            return res.status(500).json({ success: false, message: '資料庫寫入失敗' });
        }

        // this.lastID 會取得剛寫入資料庫產生的自動遞增 ID
        // 回傳成功狀態以及新建立的作物 ID
        res.json({ success: true, insertId: this.lastID });
    });
});

// ==========================================
// 3. 更新作物 (PUT /api/crops/:id)
// ==========================================
router.put('/:id', (req, res) => {
    // 取得要更新的作物 ID (從網址路徑參數中)
    const cropId = req.params.id;
    // 提取要更新的資料欄位
    const { name, stage, status, image, history } = req.body;

    // 確保作物名稱沒有被清空
    if (!name) {
        return res.status(400).json({ success: false, message: '缺少必要欄位 (name)' });
    }

    // 💡 將陣列轉換成字串再存入資料庫
    const historyStr = JSON.stringify(history || []);

    // 更新對應 ID 的作物資料
    const sql = `UPDATE CROPS SET name = ?, stage = ?, status = ?, image = ?, history = ? WHERE id = ?`;
    db.run(sql, [name, stage, status, image, historyStr, cropId], function(err) {
        if (err) {
            // 更新失敗時記錄並回傳錯誤
            console.error('更新作物失敗:', err);
            return res.status(500).json({ success: false, message: '資料庫寫入失敗' });
        }
        // 更新成功
        res.json({ success: true, message: '更新成功' });
    });
});

// ==========================================
// 4. 刪除作物 (DELETE /api/crops/:id)
// ==========================================
router.delete('/:id', (req, res) => {
    // 取得要刪除的作物 ID
    const cropId = req.params.id;

    // 執行刪除的 SQL 語法
    const sql = `DELETE FROM CROPS WHERE id = ?`;
    db.run(sql, [cropId], function(err) {
        if (err) {
            // 刪除失敗時記錄並回傳錯誤
            console.error('刪除作物失敗:', err);
            return res.status(500).json({ success: false, message: '資料庫刪除失敗' });
        }
        // 刪除成功
        res.json({ success: true, message: '刪除成功' });
    });
});

// 將 router 匯出，讓 server.js 可以透過 app.use('/api/crops', ...) 掛載此路由
module.exports = router;
