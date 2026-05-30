const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('farm.db', (err) => { if(err) console.error(err); else console.log('opened DB'); });

const account = 'Test002';
console.log('querying account', account);

db.get(`SELECT rowid as id, nickname, account, password FROM USER WHERE account = ?`, [account], (err, row) => {
  if (err) console.error('err', err.message);
  else console.log('row', row);
  db.close();
});
