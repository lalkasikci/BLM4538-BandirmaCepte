const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const databasePath = path.join(__dirname, "users.db");

const db = new sqlite3.Database(databasePath, (error) => {
  if (error) {
    console.log("VERİTABANI BAĞLANTI HATASI:", error.message);
    return;
  }

  console.log("SQLite veritabanına bağlanıldı.");
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

module.exports = db;