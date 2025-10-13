const Database = require('better-sqlite3');
const db = new Database('data/data.db');
const bcrypt = require('bcrypt');

db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        username TEXT NOT NULL DEFAULT robot,
        avatar TEXT NOT NULL DEFAULT 'Astro.jpg',
		twofa_enabled BOOLEAN DEFAULT 0,
		twofa_secret TEXT,
        win INTEGER DEFAULT 0,
        game INTEGER DEFAULT 0,
		language TEXT NOT NULL DEFAULT 'en',
		text_size INTEGER DEFAULT 2,
		theme TEXT NOT NULL DEFAULT 'default',
		color_ball TEXT NOT NULL DEFAULT '#FFFFFF',
		color_paddle TEXT NOT NULL DEFAULT '#FFFFFF',
		ball_speed INTEGER DEFAULT 3
    )
`).run();

//Accélère les vérifs d'unicité / existence sur username
db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)
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

db.prepare(`
	CREATE TABLE IF NOT EXISTS friends (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		friend_id INTEGER NOT NULL,
		UNIQUE(user_id, friend_id),
		FOREIGN KEY(user_id) REFERENCES users(id),
		FOREIGN KEY(friend_id) REFERENCES users(id)
	)
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS recovery_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		code_hash TEXT NOT NULL,
		used INTEGER DEFAULT 0,
		created_at INTEGER DEFAULT (strftime('%s','now')),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
`).run();

/** code_hash : version hachée (bcrypt) d’un code de secours.
 * used : drapeau (0 = disponible, 1 = déjà utilisé).
 * created_at : timestamp de génération du code (en secondes depuis 1970, fonction strftime('%s','now')).
*/

db.prepare(`
    CREATE TABLE IF NOT EXISTS auth_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER,
        event TEXT NOT NULL,
		ip TEXT,
		meta TEXT,
		created_at INTEGER DEFAULT (strftime('%s','now')),
		FOREIGN KEY(user_id) REFERENCES users(id)
    )
`).run();

// creation d'utilisateurs par default (bcrypt)
const passwordHash = bcrypt.hashSync('test', 10);

const seedUsers = [
	{ name: 'hey', email: 'hey@gmail.com', username: 'heyuser' },
	{ name: 'hoy', email: 'hoy@gmail.com', username: 'hoyuser' },
	{ name: 'hyy', email: 'hyy@gmail.com', username: 'hyyuser' },
];

const insertUser = db.prepare('INSERT OR IGNORE INTO users (name, email, password_hash, username) VALUES (?, ?, ?, ?)');
const seedTx = db.transaction((users) => {
	for (const u of users) {
		insertUser.run(u.name, u.email, passwordHash, u.username);
	}
});
seedTx(seedUsers);

// ajout d'amitiés (relations bidirectionnelles)
const getUserIdByName = db.prepare('SELECT id FROM users WHERE name = ?');
const hey = getUserIdByName.get('hey');
const hoy = getUserIdByName.get('hoy');
const hyy = getUserIdByName.get('hyy');

if (hey && hoy && hyy) {
	const insertFriend = db.prepare('INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)');
	const seedFriends = db.transaction(() => {
		// hey <-> hoy
		insertFriend.run(hey.id, hoy.id);
		insertFriend.run(hoy.id, hey.id);
		// hey <-> hyy
		insertFriend.run(hey.id, hyy.id);
		insertFriend.run(hyy.id, hey.id);
		// hoy <-> hyy
		insertFriend.run(hoy.id, hyy.id);
		insertFriend.run(hyy.id, hoy.id);
	});
	seedFriends();
}

module.exports = db;