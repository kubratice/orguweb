// ===== BU DOSYA SADECE backend/server.js İÇİN =====
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const db = require('./database.js');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;
const JWT_SECRET = 'bu_cok_gizli_bir_anahtar_olmalidir';

app.use(cors());
app.use(express.json());

// ================== GÜVENLİK GÖREVLİSİ (MIDDLEWARE) ==================
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) {
        return res.status(401).json({ message: 'Giriş kartı (token) bulunamadı.' });
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Geçersiz giriş kartı (token).' });
        }
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Bu alana erişim yetkiniz yok.' });
        }
        req.user = user;
        next();
    });
};

// ================== HERKESE AÇIK API ENDPOINTS ==================
app.get('/', (req, res) => res.send('Backend sunucumuz çalışıyor!'));

app.get('/api/products', (req, res) => {
    const sql = "SELECT * FROM products";
    db.all(sql, [], (err, rows) => {
        if (err) { return res.status(400).json({"error":err.message}); }
        res.json(rows);
    });
});

app.post('/api/register', async (req, res) => {
    const { fullname, email, password } = req.body;
    const sqlSelect = "SELECT * FROM users WHERE email = ?";
    db.get(sqlSelect, [email], async (err, row) => {
        if (err) { return res.status(500).json({ message: 'Sunucuda bir hata oluştu.' }); }
        if (row) { return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanılıyor.' }); }
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const sqlInsert = "INSERT INTO users (fullname, email, password, role) VALUES (?,?,?, 'customer')";
            db.run(sqlInsert, [fullname, email, hashedPassword], function(err) {
                if (err) { return res.status(500).json({ message: 'Kullanıcı kaydedilirken bir hata oluştu.' }); }
                res.status(201).json({ message: 'Kullanıcı başarıyla oluşturuldu!' });
            });
        } catch (error) { res.status(500).json({ message: 'Şifreleme sırasında bir hata oluştu.' }); }
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const sql = "SELECT * FROM users WHERE email = ?";
    db.get(sql, [email], async (err, user) => {
        if (err) { return res.status(500).json({ message: 'Sunucuda bir hata oluştu.' }); }
        if (!user) { return res.status(400).json({ message: 'Geçersiz e-posta veya şifre.' }); }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (passwordMatch) { res.status(200).json({ message: 'Giriş başarılı!' }); } 
        else { res.status(400).json({ message: 'Geçersiz e-posta veya şifre.' }); }
    });
});

app.post('/api/admin/login', (req, res) => {
    const { email, password } = req.body;
    const sql = "SELECT * FROM users WHERE email = ?";
    db.get(sql, [email], async (err, user) => {
        if (err) { return res.status(500).json({ message: 'Sunucuda bir hata oluştu.' }); }
        if (!user || user.role !== 'admin') { return res.status(401).json({ message: 'Yetkiniz yok veya kullanıcı bulunamadı.' }); }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (passwordMatch) {
            const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
            res.status(200).json({ message: 'Admin girişi başarılı!', token: token });
        } else { res.status(401).json({ message: 'Geçersiz e-posta veya şifre.' }); }
    });
});

// ================== ADMIN'E ÖZEL GÜVENLİ API ENDPOINTS ==================

app.get('/api/admin/products', authenticateAdmin, (req, res) => {
    const sql = "SELECT * FROM products ORDER BY id DESC";
    db.all(sql, [], (err, rows) => {
        if (err) { return res.status(400).json({"error": err.message}); }
        res.json(rows);
    });
});

app.get('/api/admin/products/:id', authenticateAdmin, (req, res) => {
    const sql = "SELECT * FROM products WHERE id = ?";
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            return res.status(400).json({"error": err.message});
        }
        if (!row) {
            return res.status(404).json({ message: "Ürün bulunamadı." });
        }
        res.json(row);
    });
});

app.post('/api/admin/products', authenticateAdmin, (req, res) => {
    const { name, color, price, image } = req.body;
    const sql = "INSERT INTO products (name, color, price, image) VALUES (?,?,?,?)";
    db.run(sql, [name, color, price, image], function(err) {
        if (err) { return res.status(400).json({"error": err.message}); }
        res.status(201).json({ message: "Ürün başarıyla eklendi", id: this.lastID });
    });
});

app.put('/api/admin/products/:id', authenticateAdmin, (req, res) => {
    const { name, color, price, image } = req.body;
    const sql = "UPDATE products SET name = ?, color = ?, price = ?, image = ? WHERE id = ?";
    db.run(sql, [name, color, price, image, req.params.id], function(err) {
        if (err) { return res.status(400).json({"error": err.message}); }
        if (this.changes === 0) { return res.status(404).json({ message: "Ürün bulunamadı." }); }
        res.status(200).json({ message: "Ürün başarıyla güncellendi." });
    });
});

app.delete('/api/admin/products/:id', authenticateAdmin, (req, res) => {
    const sql = "DELETE FROM products WHERE id = ?";
    db.run(sql, [req.params.id], function(err) {
        if (err) { return res.status(400).json({"error": err.message}); }
        if (this.changes === 0) { return res.status(404).json({ message: "Ürün bulunamadı." }); }
        res.status(200).json({ message: "Ürün başarıyla silindi." });
    });
});

app.listen(port, () => {
  console.log(`Sunucu http://localhost:${port} adresinde başlatıldı`);
});