const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

// Test ortamı için geçici bir DB yolu belirle
const testDbPath = path.resolve(__dirname, 'test_database.sqlite');
process.env.DB_PATH = testDbPath;
process.env.PORT = '0'; // Rastgele boş port
process.env.JWT_SECRET = 'test_secret_key_12345678901234567890';

let server;
let baseUrl;

before(async () => {
    // Eski test db varsa temizle
    if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
    }

    // Express uygulamasını yükle
    const express = require('express');
    const cors = require('cors');
    require('../database/db');

    // DB başlatması için kısa bekleme
    await new Promise((resolve) => setTimeout(resolve, 800));

    const authRoutes = require('../routes/auth');
    const residentRoutes = require('../routes/resident');
    const adminRoutes = require('../routes/admin');
    const staffRoutes = require('../routes/staff');

    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use('/api', authRoutes);
    app.use('/api/resident', residentRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/staff', staffRoutes);

    await new Promise((resolve) => {
        server = app.listen(0, () => {
            const port = server.address().port;
            baseUrl = `http://127.0.0.1:${port}`;
            resolve();
        });
    });
});

after(() => {
    if (server) server.close();
    if (fs.existsSync(testDbPath)) {
        try { fs.unlinkSync(testDbPath); } catch (e) {}
    }
});

describe('1. Kimlik Doğrulama ve Güvenlik Testleri (Auth & Security)', () => {
    test('POST /api/login - Varsayılan admin ile başarılı giriş yapmalı', async () => {
        const res = await fetch(`${baseUrl}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@siyos.local', password: 'Admin123!' })
        });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.ok(data.token, 'Token dönmeli');
        assert.equal(data.user.role, 'Admin');
    });

    test('POST /api/login - Hatalı şifrede 401 dönmeli', async () => {
        const res = await fetch(`${baseUrl}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@siyos.local', password: 'WrongPassword!' })
        });
        assert.equal(res.status, 401);
    });

    test('POST /api/register - Geçersiz e-posta formatını reddetmeli (400)', async () => {
        const res = await fetch(`${baseUrl}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_name: 'Test User',
                email: 'invalid-email-format',
                password: 'password123'
            })
        });
        assert.equal(res.status, 400);
    });

    test('POST /api/register - 6 karakterden kısa şifreyi reddetmeli (400)', async () => {
        const res = await fetch(`${baseUrl}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_name: 'Test User',
                email: 'test@siyos.local',
                password: '123'
            })
        });
        assert.equal(res.status, 400);
    });

    test('VULN-01 Koruması: POST /api/register - Role Admin talep edilse bile Resident olarak açmalı', async () => {
        const res = await fetch(`${baseUrl}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_name: 'Attacker User',
                email: 'attacker@siyos.local',
                password: 'Secret123!',
                role: 'Admin' // Yetki yükseltme denemesi
            })
        });
        assert.equal(res.status, 201);
        const data = await res.json();
        assert.equal(data.user.role, 'Resident', 'Yetki yükseltme engellenmeli ve rol Resident olmalı');
    });
});

describe('2. Rol Tabanlı Erişim Kontrolü (RBAC)', () => {
    test('GET /api/admin/dashboard - Token olmadan 401 dönmeli', async () => {
        const res = await fetch(`${baseUrl}/api/admin/dashboard`);
        assert.equal(res.status, 401);
    });

    test('GET /api/admin/dashboard - Resident tokenı ile 403 dönmeli', async () => {
        // Resident girişi
        const loginRes = await fetch(`${baseUrl}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'resident@siyos.local', password: 'Resident123!' })
        });
        const { token } = await loginRes.json();

        // Admin ucuna istek
        const adminRes = await fetch(`${baseUrl}/api/admin/dashboard`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        assert.equal(adminRes.status, 403, 'Sakin admin uç noktasına erişememeli');
    });

    test('GET /api/admin/dashboard - Admin tokenı ile 200 ve KPI verisi dönmeli', async () => {
        const loginRes = await fetch(`${baseUrl}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@siyos.local', password: 'Admin123!' })
        });
        const { token } = await loginRes.json();

        const adminRes = await fetch(`${baseUrl}/api/admin/dashboard`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        assert.equal(adminRes.status, 200);
        const data = await adminRes.json();
        assert.ok(data.kpis, 'KPI verileri dönmeli');
    });
});
