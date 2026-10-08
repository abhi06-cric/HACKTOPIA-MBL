const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'db.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create tables
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            upi_id TEXT UNIQUE NOT NULL,
            balance REAL DEFAULT 1000000.00,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            transaction_id TEXT PRIMARY KEY,
            sender_user_id INTEGER,
            receiver_user_id INTEGER,
            sender_upi_id TEXT NOT NULL,
            receiver_upi_id TEXT NOT NULL,
            amount REAL NOT NULL,
            note TEXT,
            status TEXT DEFAULT 'Successful',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_user_id) REFERENCES users(id),
            FOREIGN KEY (receiver_user_id) REFERENCES users(id)
        )`);
    }
});

module.exports = db;
