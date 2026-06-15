const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'sales.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    mobile TEXT UNIQUE NOT NULL,
    email TEXT,
    id_number TEXT,
    district TEXT,
    role TEXT NOT NULL CHECK(role IN ('agent','district_manager','management')),
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    pension REAL DEFAULT 0,
    finance REAL DEFAULT 0,
    risks REAL DEFAULT 0,
    elementary REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY(user_id) REFERENCES users(id),
    UNIQUE(user_id, date)
  );
`);

module.exports = db;
