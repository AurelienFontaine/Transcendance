const Database = require('better-sqlite3');
const db = new Database('data/data.db');

db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        mmr INTEGER DEFAULT 0 CHECK (mmr >= 0 AND mmr <= 10)
    )
`).run();
        
module.exports = db;