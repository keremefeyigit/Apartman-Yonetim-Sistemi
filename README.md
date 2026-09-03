# 🏢 Apartman Yönetim Sistemi (Apartment Management System)

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v5.x-blue.svg)](https://expressjs.com/)
[![SQLite3](https://img.shields.io/badge/SQLite3-Database-lightblue.svg)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Modern, güvenli ve hafif bir apartman ve site yönetim web uygulaması. Sakin, aidat, gider ve duyuru takiplerini dijitalleştirmek amacıyla Node.js, Express ve SQLite3 kullanılarak geliştirilmiştir.

---

## 🚀 Özellikler

- **Daire ve Sakin Yönetimi:** Daire sahipleri ve kiracılar için profil ve kimlik doğrulama.
- **Aidat & Ödeme Takibi:** Aylık aidat borçlandırma ve ödeme durum raporlaması.
- **Güvenli Kimlik Doğrulama:** JWT (JSON Web Token) ve bcryptjs ile şifrelenmiş oturum kontrolü.
- **RESTful API Mimarisi:** Temiz rotalar (`/routes`) ve modüler ara yazılımlar (`/middleware`).
- **Duyuru & Talep Sistemi:** Bina sakini bildirimleri ve yönetici duyuruları.

---

## 🛠️ Kullanılan Teknolojiler

- **Backend:** Node.js, Express.js (v5)
- **Veritabanı:** SQLite3
- **Güvenlik:** JSON Web Token (JWT), bcryptjs, CORS
- **Araçlar:** Dotenv, Nodemon

---

## 📦 Kurulum ve Çalıştırma

### 1. Depoyu Klonlayın
```bash
git clone https://github.com/keremefeyigit/Apartman-Yonetim-Sistemi.git
cd Apartman-Yonetim-Sistemi
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Çevre Değişkenlerini Oluşturun
Kök dizinde `.env` dosyası oluşturup gerekli ortam değişkenlerini girin:
```env
PORT=3000
JWT_SECRET=supersecretkey
DB_PATH=./database.sqlite
```

### 4. Uygulamayı Başlatın
- **Geliştirici Modu (Nodemon ile):**
  ```bash
  npm run dev
  ```
- **Üretim Modu:**
  ```bash
  npm start
  ```

---

## 📁 Proje Yapısı

```
Apartman-Yonetim-Sistemi/
├── middleware/       # JWT ve Rol doğrulama ara yazılımları
├── routes/           # API ve sayfa yönlendirmeleri
├── public/           # Statik HTML, CSS ve JS varlıkları
├── index.js          # Uygulama giriş noktası (Express Server)
├── package.json      # Bağımlılık ve betik yapılandırması
└── README.md         # Proje dokümantasyonu
```

---

## 📜 Lisans

Bu proje [MIT Lisansı](LICENSE) altında lisanslanmıştır.
