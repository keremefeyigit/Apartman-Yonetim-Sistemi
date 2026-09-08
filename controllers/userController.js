const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../database/db');

const runAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
        if (err) {
            reject(err);
        } else {
            resolve(this);
        }
    });
});

const getAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) {
            reject(err);
        } else {
            resolve(row);
        }
    });
});

const allAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) {
            reject(err);
        } else {
            resolve(rows);
        }
    });
});

const buildTokenPayload = (user, apartmentInfo) => ({
    id: user.id,
    role: user.role,
    email: user.email,
    apartment_id: apartmentInfo ? apartmentInfo.apartment_id : null
});

const sanitizeUser = (user, apartmentInfo) => ({
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    apartment: apartmentInfo
        ? {
            id: apartmentInfo.apartment_id,
            block_name: apartmentInfo.block_name,
            door_number: apartmentInfo.door_number
        }
        : null
});

async function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email ve şifre zorunludur.' });
    }

    try {
        const user = await getAsync(
            'SELECT * FROM Users WHERE email = ? AND is_active = 1',
            [email.trim().toLowerCase()]
        );

        if (!user) {
            return res.status(401).json({ error: 'Geçersiz email veya şifre.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Geçersiz email veya şifre.' });
        }

        const apartmentInfo = await getAsync(
            `SELECT Occupancy.apartment_id, Blocks.block_name, Apartments.door_number
             FROM Occupancy
             LEFT JOIN Apartments ON Occupancy.apartment_id = Apartments.id
             LEFT JOIN Blocks ON Apartments.block_id = Blocks.id
             WHERE Occupancy.user_id = ?
             ORDER BY Occupancy.start_date DESC
             LIMIT 1`,
            [user.id]
        );

        const jwtSecret = process.env.JWT_SECRET || 'apartman_default_secret_key_change_in_prod';
        const token = jwt.sign(
            buildTokenPayload(user, apartmentInfo),
            jwtSecret,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Giriş başarılı.',
            token,
            user: sanitizeUser(user, apartmentInfo)
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Giriş işlemi sırasında sunucu hatası oluştu.' });
    }
}

async function register(req, res) {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
        return res.status(400).json({ error: 'Tüm alanlar zorunludur.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
        return res.status(400).json({ error: 'Geçerli bir e-posta adresi giriniz.' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır.' });
    }

    // Güvenlik: Genel kayıt uç noktası sadece Site Sakini ('Resident') oluşturabilir.
    // Yetki yükseltme (Privilege Escalation) zafiyetini engeller.
    const role = 'Resident';

    try {
        const existing = await getAsync('SELECT id FROM Users WHERE email = ?', [trimmedEmail]);
        if (existing) {
            return res.status(409).json({ error: 'Email adresi kullanımda.' });
        }

        const hash = await bcrypt.hash(password, 10);
        const result = await runAsync(
            'INSERT INTO Users (full_name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)',
            [full_name.trim(), trimmedEmail, hash, role]
        );

        const newUser = await getAsync('SELECT * FROM Users WHERE id = ?', [result.lastID]);
        res.status(201).json({
            message: 'Kullanıcı oluşturuldu.',
            user: sanitizeUser(newUser, null)
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Kayıt işlemi sırasında sunucu hatası oluştu.' });
    }
}

async function listUsers(req, res) {
    try {
        const users = await allAsync(
            `SELECT Users.id, Users.full_name, Users.email, Users.role, Users.is_active,
                MAX(Blocks.block_name) AS block_name, MAX(Apartments.door_number) AS door_number
             FROM Users
             LEFT JOIN Occupancy ON Occupancy.user_id = Users.id
             LEFT JOIN Apartments ON Occupancy.apartment_id = Apartments.id
             LEFT JOIN Blocks ON Apartments.block_id = Blocks.id
             GROUP BY Users.id
             ORDER BY Users.full_name ASC`
        );

        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: 'Sunucu hatası: ' + error.message });
    }
}

module.exports = {
    login,
    register,
    listUsers
};
