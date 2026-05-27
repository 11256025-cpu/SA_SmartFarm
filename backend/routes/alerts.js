const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./farm.db');

// 1. 取得使用者警示設定 (GET /api/alerts/settings?userId=1)
router.get('/settings', (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ success: false, message: '缺少 userId 參數' });
    }

    const sql = `SELECT * FROM WARNING_RANGE WHERE user_id = ?`;
    db.get(sql, [userId], (err, row) => {
        if (err) {
            console.error('取得警示設定失敗:', err);
            return res.status(500).json({ success: false, message: '資料庫讀取失敗' });
        }
        
        // 將字串範圍 "15,35" 轉為陣列 [15, 35]
        const settings = row ? {
            tempRange: row.temp_warning ? row.temp_warning.split(',').map(Number) : null,
            humidRange: row.soil_warning ? row.soil_warning.split(',').map(Number) : null,
            co2Range: row.co2_warning ? row.co2_warning.split(',').map(Number) : null,
            lightRange: row.light_warning ? row.light_warning.split(',').map(Number) : null,
        } : null;

        res.json({ success: true, settings });
    });
});

// 2. 儲存使用者警示設定 (POST /api/alerts/settings)
router.post('/settings', (req, res) => {
    const { userId, tempRange, humidRange, co2Range, lightRange } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: '缺少 userId' });
    }

    // 將陣列 [15, 35] 轉為字串 "15,35"
    const tempWarning = tempRange ? tempRange.join(',') : null;
    const soilWarning = humidRange ? humidRange.join(',') : null;
    const co2Warning = co2Range ? co2Range.join(',') : null;
    const lightWarning = lightRange ? lightRange.join(',') : null;

    // 使用 INSERT OR REPLACE (UPSERT) 語法，如果 user_id 已存在就更新，不存在就新增
    const sql = `
        INSERT INTO WARNING_RANGE (user_id, temp_warning, soil_warning, co2_warning, light_warning)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            temp_warning = excluded.temp_warning,
            soil_warning = excluded.soil_warning,
            co2_warning = excluded.co2_warning,
            light_warning = excluded.light_warning;
    `;

    db.run(sql, [userId, tempWarning, soilWarning, co2Warning, lightWarning], function(err) {
        if (err) {
            console.error('儲存警示設定失敗:', err);
            return res.status(500).json({ success: false, message: '資料庫寫入失敗' });
        }
        res.json({ success: true, message: '設定儲存成功' });
    });
});

// 3. 取得使用者警示紀錄 (GET /api/alerts/logs?userId=1)
router.get('/logs', (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ success: false, message: '缺少 userId 參數' });
    }

    // 倒序排列，讓最新的紀錄在最前面，並格式化時間
    const sql = `SELECT log_id, message, strftime('%Y-%m-%d %H:%M', record_time) as record_time FROM ALERT_LOGS WHERE user_id = ? ORDER BY log_id DESC`;
    db.all(sql, [userId], (err, rows) => {
        if (err) {
            console.error('取得警示紀錄失敗:', err);
            return res.status(500).json({ success: false, message: '資料庫讀取失敗' });
        }
        res.json({ success: true, logs: rows });
    });
});

// 4. 清空使用者警示紀錄 (DELETE /api/alerts/logs?userId=1)
router.delete('/logs', (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ success: false, message: '缺少 userId 參數' });
    }

    const sql = `DELETE FROM ALERT_LOGS WHERE user_id = ?`;
    db.run(sql, [userId], function(err) {
        if (err) {
            console.error('刪除警示紀錄失敗:', err);
            return res.status(500).json({ success: false, message: '資料庫刪除失敗' });
        }
        res.json({ success: true, message: '紀錄已清空' });
    });
});

module.exports = router;