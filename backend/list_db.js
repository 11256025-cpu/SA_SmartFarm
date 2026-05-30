const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const files = [
  path.resolve(__dirname, 'farm.db'),
  path.resolve(process.cwd(), 'farm.db')
];

(async () => {
  for (const f of files) {
    console.log('\n--- DB file:', f);
    try {
      const db = new sqlite3.Database(f);
      db.serialize(() => {
        db.all("SELECT rowid, id, nickname, account, password FROM USER", [], (err, rows) => {
          if (err) {
            console.log('  read error:', err.message);
          } else {
            console.log('  rows:', rows);
          }
        });
      });
      db.close();
    } catch (e) {
      console.log('  open failed:', e.message);
    }
  }
})();
