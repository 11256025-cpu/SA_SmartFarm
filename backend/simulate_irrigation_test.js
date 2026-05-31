const sqlite3 = require('sqlite3').verbose();
const http = require('http');

const DB_PATH = './farm.db';
const USER_ID = '1';

function runQuery(db, sql, params=[]) {
  return new Promise((resolve, reject) => db.run(sql, params, function(err) {
    if (err) reject(err); else resolve(this);
  }));
}

function getAll(db, sql, params=[]) {
  return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => {
    if (err) reject(err); else resolve(rows);
  }));
}

function postJSON(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { resolve({ statusCode: res.statusCode, body: JSON.parse(body) }); } catch(e) { resolve({ statusCode: res.statusCode, body }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  console.log('Connecting to DB...');
  const db = new sqlite3.Database(DB_PATH);

  try {
    console.log('Upserting schedule_settings for user', USER_ID);
    await runQuery(db, `INSERT OR REPLACE INTO schedule_settings (user_id, frequency, duration, updated_at) VALUES (?, ?, ?, datetime('now', '+8 hours'))`, [USER_ID, '1', '5']);

    console.log('Upserting WARNING_RANGE (soil_warning) for user', USER_ID);
    const soilWarning = JSON.stringify([30, 60]);
    await runQuery(db, `INSERT OR REPLACE INTO WARNING_RANGE (user_id, temp_warning, soil_warning, co2_warning, light_warning) VALUES (?, ?, ?, ?, ?)`, [USER_ID, null, soilWarning, null, null]);

    console.log('Initializing in-memory simulator state via API');
    const initResp = await postJSON('/api/simulator/update', { userId: USER_ID, temperature: 25, humidity: 20, co2: 800, light: 100000 });
    console.log('Simulator update response:', initResp.statusCode, JSON.stringify(initResp.body));

    console.log('Waiting 12 seconds to allow backend scheduler to run...');
    await new Promise(r => setTimeout(r, 12000));

    console.log('Querying today irrigation logs for user', USER_ID);
    const rows = await getAll(db, `SELECT * FROM IRRIGATION_LOGS WHERE user_id = ? AND DATE(record_time) = DATE('now', '+8 hours') ORDER BY record_time DESC`, [USER_ID]);
    console.log('Irrigation logs found:', rows.length);
    rows.forEach(r => console.log(r));

    console.log('Also querying IRRIGATION count (summary)');
    const counts = await getAll(db, `SELECT irrigation_type, COUNT(*) as cnt FROM IRRIGATION_LOGS WHERE user_id = ? AND DATE(record_time) = DATE('now', '+8 hours') GROUP BY irrigation_type`, [USER_ID]);
    console.log(counts);

  } catch (err) {
    console.error('Error during simulation:', err);
  } finally {
    db.close();
  }
})();
