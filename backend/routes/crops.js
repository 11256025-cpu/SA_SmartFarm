const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();

// 建立或連線到資料庫 (請根據你實際的資料庫路徑進行調整)
const db = new sqlite3.Database('./farm.db'); 

// ==========================================
// 1. 取得使用者的作物列表 (GET /api/crops?userId=1)
// ==========================================
router.get('/', (req, res) => {
    const userId = req.query.userId;
    
    if (!userId) {
        return res.status(400).json({ success: false, message: '缺少 userId 參數' });
    }

    const sql = `SELECT * FROM CROPS WHERE userId = ?`;
    db.all(sql, [userId], (err, rows) => {
        if (err) {
            console.error('取得作物失敗:', err);
            return res.status(500).json({ success: false, message: '資料庫讀取失敗' });
        }
        
        // 💡 讀取時，將資料庫中的字串解開回陣列
        const formattedRows = rows.map(row => ({
            ...row,
            history: row.history ? JSON.parse(row.history) : []
        }));
        res.json({ success: true, crops: formattedRows });
    });
});

// ==========================================
// 2. 新增作物 (POST /api/crops)
// ==========================================
router.post('/', (req, res) => {
    const { userId, name, stage, status, image, history } = req.body;

    if (!userId || !name) {
        return res.status(400).json({ success: false, message: '缺少必要欄位 (userId, name)' });
    }

    // 💡 將陣列轉換成字串再存入資料庫
    const historyStr = JSON.stringify(history || []);

    const sql = `INSERT INTO CROPS (userId, name, stage, status, image, history) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [userId, name, stage, status, image, historyStr], function(err) {
        if (err) {
            console.error('新增作物失敗:', err);
            return res.status(500).json({ success: false, message: '資料庫寫入失敗' });
        }

        // this.lastID 會取得剛寫入資料庫產生的自動遞增 ID
        res.json({ success: true, insertId: this.lastID });
    });
});

// ==========================================
// 3. 更新作物 (PUT /api/crops/:id)
// ==========================================
router.put('/:id', (req, res) => {
    const cropId = req.params.id;
    const { name, stage, status, image, history } = req.body;

    if (!name) {
        return res.status(400).json({ success: false, message: '缺少必要欄位 (name)' });
    }

    // 💡 將陣列轉換成字串再存入資料庫
    const historyStr = JSON.stringify(history || []);

    const sql = `UPDATE CROPS SET name = ?, stage = ?, status = ?, image = ?, history = ? WHERE id = ?`;
    db.run(sql, [name, stage, status, image, historyStr, cropId], function(err) {
        if (err) {
            console.error('更新作物失敗:', err);
            return res.status(500).json({ success: false, message: '資料庫寫入失敗' });
        }
        res.json({ success: true, message: '更新成功' });
    });
});

// ==========================================
// 4. 刪除作物 (DELETE /api/crops/:id)
// ==========================================
router.delete('/:id', (req, res) => {
    const cropId = req.params.id;

    const sql = `DELETE FROM CROPS WHERE id = ?`;
    db.run(sql, [cropId], function(err) {
        if (err) {
            console.error('刪除作物失敗:', err);
            return res.status(500).json({ success: false, message: '資料庫刪除失敗' });
        }
        res.json({ success: true, message: '刪除成功' });
    });
});

module.exports = router;
