const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'sales.db');

let db = null;

async function init() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  db.run(`
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

  save();
  return db;
}

function save() {
  if (!db) return;
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

// Wrapper to mimic better-sqlite3 API
function prepare(sql) {
  return {
    run(...params) {
      const flat = params.flat();
      db.run(sql, flat);
      save();
      return { changes: db.getRowsModified() };
    },
    get(...params) {
      const flat = params.flat();
      const stmt = db.prepare(sql);
      stmt.bind(flat);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
      }
      stmt.free();
      return undefined;
    },
    all(...params) {
      const flat = params.flat();
      const stmt = db.prepare(sql);
      stmt.bind(flat);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    },
  };
}

function exec(sql) {
  db.run(sql);
  save();
}

function transaction(fn) {
  return () => {
    db.run('BEGIN');
    try {
      fn();
      db.run('COMMIT');
      save();
    } catch (e) {
      db.run('ROLLBACK');
      throw e;
    }
  };
}

const proxy = { init, prepare, exec, transaction };
module.exports = proxy;
