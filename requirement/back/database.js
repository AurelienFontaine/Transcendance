const Database = require('better-sqlite3');
const db = new Database('data/data.db');

db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE
    )
`).run();
        
module.exports = db;