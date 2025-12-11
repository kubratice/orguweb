const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const DB_SOURCE = "orguweb.db";

const db = new sqlite3.Database(DB_SOURCE, (err) => {
    if (err) {
      console.error(err.message);
      throw err;
    } else {
        console.log('Veritabanına bağlanıldı.');
        db.serialize(() => {
            // Users Tablosu
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fullname TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'customer'
            )`, () => {
                // Admin Yoksa Oluştur
                const adminEmail = 'admin@orgudunyasi.com';
                db.get(`SELECT * FROM users WHERE email = ?`, [adminEmail], async (err, row) => {
                    if (!row) {
                        const hash = await bcrypt.hash('123456', 10);
                        db.run(`INSERT INTO users (fullname, email, password, role) VALUES (?,?,?,?)`, 
                            ['Admin', adminEmail, hash, 'admin']);
                        console.log("Admin oluşturuldu.");
                    }
                });
            });

            // Products Tablosu
            db.run(`CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                color TEXT,
                price REAL NOT NULL,
                image TEXT
            )`);

            // YENİ: Siparişler Tablosu (Orders)
            db.run(`CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_name TEXT,
                customer_email TEXT,
                address TEXT,
                total_price REAL,
                date TEXT
            )`);

            // YENİ: Sipariş Detayları Tablosu (Order Items)
            db.run(`CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER,
                product_name TEXT,
                price REAL,
                quantity INTEGER,
                FOREIGN KEY(order_id) REFERENCES orders(id)
            )`);
        });
    }
});

module.exports = db;