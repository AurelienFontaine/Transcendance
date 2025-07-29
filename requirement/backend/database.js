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

db.prepare(`
    CREATE TABLE IF NOT EXISTS server (
    id_player INTEGER NOT NULL,
    id_game INTEGER NOT NULL,
    FOREIGN KEY(id_player) REFERENCES users(id),
    FOREIGN KEY(id_game) REFERENCES  games(id)
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fp_id INTEGER NOT NULL,
        sp_id INTEGER NOT NULL,
        fp_score INTEGER DEFAULT 0,
        sp_score INTEGER DEFAULT 0,
        game_status INTEGER DEFAULT 0,
        date TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(fp_id) REFERENCES users(id),
        FOREIGN KEY(sp_id) REFERENCES users(id)
    )
`).run();
        
module.exports = db;