# 🛡️ Güvenlik Politikası ve Zafiyet Analiz Raporu (Security Policy & Audit)

Bu belge, **Apartman Yönetim Sistemi (SIYOS)** projesinin güvenlik politikasını, tehdit modelini, gerçekleştirilen kapsamlı kaynak kod güvenlik denetimi bulgularını ve uygulanan sertleştirme (hardening) önlemlerini içerir.

---

## 1. Desteklenen Sürümler (Supported Versions)

Projenin yalnızca güncel `main` dalı ve resmi etiketli sürümleri güvenlik güncellemeleri alır:

| Sürüm | Destek Durumu |
| :--- | :--- |
| `v1.0.x` (Güncel) | :white_check_mark: Destekleniyor |
| `< 1.0.0` | :x: Desteklenmiyor |

---

## 2. Güvenlik Açığı Bildirimi (Reporting a Vulnerability)

Sistemde potansiyel bir güvenlik açığı tespit ettiyseniz:
1. Lütfen açığı **herkese açık GitHub Issue olarak bildirmeyiniz**.
2. Doğrudan güvenlik sorumlusuna veya GitHub Security Advisories üzerinden gizli bildirim (Private Vulnerability Report) açınız.
3. Bildiriminizde şu detaylara yer veriniz:
   - Zafiyet türü ve potansiyel etki (CWE / CVSS)
   - Adım adım PoC (Proof of Concept) veya HTTP istek örnekleri
   - Varsa önerilen düzeltme veya geçici önlem (workaround)
4. Güvenlik ekibi bildirimi en geç **48 saat** içinde değerlendirip dönüş yapacaktır.

---

## 3. Tehdit Modeli ve Saldırı Yüzeyi (STRIDE Analysis)

| Tehdit (STRIDE) | Sistemdeki Karşılığı | Uygulanan / Önerilen Önlem |
| :--- | :--- | :--- |
| **S**poofing (Kimlik Sahteciliği) | Sahte JWT token veya başkasının kimliğine bürünme | JWT doğrulaması, güçlü `JWT_SECRET`, süreli token (`expiresIn: '24h'`). |
| **T**ampering (Veri Tahrifatı) | Başka daireye ait talepleri düzenleme veya silme (BOLA/IDOR) | Rotalarda `user_id` ve `role` seviyesinde oturum kontrolleri (`verifyToken`, `authorizeRole`). |
| **R**epudiation (İnkar Edilebilirlik) | İşlemlerin kaydının tutulmaması | `Ticket_Actions` tablosunda durum değişiklikleri ve eylemlerin kullanıcı ID ve zaman damgasıyla loglanması. |
| **I**nformation Disclosure (Bilgi İfşası) | DB hata mesajlarının veya gizli anahtarların dışarı sızması | Hata mesajlarının sanitize edilmesi, `.env` ve `*.sqlite` dosyalarının git takibinden çıkarılması. |
| **D**enial of Service (Hizmet Engelleme) | Login/Register uç noktalarına brute-force veya DoS saldırısı | Rate-limiting katmanı (`express-rate-limit`) ve güvenli payload limitleri. |
| **E**levation of Privilege (Yetki Yükseltme) | Sakin kullanıcının Admin veya Personel hakları elde etmesi | Genel `/api/register` ucunda `role` parametresinin yok sayılarak zorunlu `Resident` atanması. |

---

## 4. Kaynak Kod Güvenlik Denetimi ve Zafiyet Analiz Bulguları

Yapılan derin statik ve dinamik kod analizi sonucunda tespit edilen bulgular ve alınan aksiyonlar:

### 🔴 VULN-01: Doğrulanmamış Yetki Yükseltme (Privilege Escalation)
- **Önem Derecesi:** Kritik (CVSS 9.8) - CWE-269
- **Açıklama:** `/api/register` uç noktası gelen HTTP isteğindeki `role` alanını doğrudan kabul etmekteydi. Dışarıdan yetkisiz herhangi bir saldırgan `{"role": "Admin"}` payload'ı göndererek tam yetkili yönetici hesabı oluşturabiliyordu.
- **Çözüm / Düzeltme:** `userController.js` içindeki `register` fonksiyonunda dışarıdan gelen `role` parametresi devre dışı bırakıldı; genel kayıtlar için `role = 'Resident'` zorunlu kılındı. Admin ve Staff oluşturma yetkisi sadece sistem yöneticilerine ve başlangıç seed mekanizmasına bağlandı.

### 🔴 VULN-02: Hassas Verilerin ve Veritabanının Git Deposu Takibinde Olması
- **Önem Derecesi:** Yüksek (CVSS 8.2) - CWE-312 / CWE-798
- **Açıklama:** `.env` dosyası (içinde `JWT_SECRET` değeri ile) ve varsayılan kullanıcı parola hash'lerini içeren `database.sqlite` dosyası Git deposunda takip ediliyordu. Depoyu klonlayan herkes production gizli anahtarını ve veritabanını elde edebiliyordu.
- **Çözüm / Düzeltme:**
  1. `git rm --cached .env database/database.sqlite` komutlarıyla takip durduruldu.
  2. `.gitignore` ve `.dockerignore` dosyaları güncellenerek tüm `.env*`, `*.sqlite`, `*.db` kalıpları hariç tutuldu.
  3. Güvenli yapılandırma rehberi olarak `.env.example` şablonu oluşturuldu.

### 🔴 VULN-03: Depolanmış Siteler Arası Betik Çalıştırma (Stored XSS)
- **Önem Derecesi:** Yüksek (CVSS 7.6) - CWE-79
- **Açıklama:** `public/js/admin.js`, `public/js/resident.js` ve `public/js/staff.js` dosyalarında, kullanıcıdan alınan talep başlığı (`title`), açıklama (`description`), ad-soyad (`full_name`) gibi değerler filtrelenmeden doğrudan `innerHTML` şablon dizgilerine ekleniyordu. Sakin veya personel tarafından girilen kötü amaçlı `<script>` veya `<img onerror=...>` etiketleri admin veya diğer kullanıcıların tarayıcısında çalışabilirdi.
- **Çözüm / Düzeltme:** Tüm istemci script'lerine HTML karakterlerini güvenli escape eden (`escapeHtml`) fonksiyon entegre edildi ve tüm dinamik DOM çıktıları bu süzgeçten geçirildi.

### 🟡 VULN-04: Başlangıç Veritabanı Şemasında Sözdizimi Hatası (DoS Riski)
- **Önem Derecesi:** Orta (CVSS 5.3) - CWE-754
- **Açıklama:** `database/schema.sql` dosyasının ilk satırında `1-- Users Table` şeklinde hatalı bir `1` karakteri yer alıyordu. Bu durum sunucu her ayağa kalktığında `SQLITE_ERROR: near "1": syntax error` hatasına yol açıyor ve ilk kurulumları bozabiliyordu.
- **Çözüm / Düzeltme:** Sözdizimi hatası giderilerek geçerli SQL yorum satırı formatına (`-- Users Table`) dönüştürüldü.

### 🟡 VULN-05: Veritabanı ve Sunucu Hata Detayı Sızıntısı (Information Disclosure)
- **Önem Derecesi:** Orta (CVSS 5.3) - CWE-209
- **Açıklama:** Controller catch bloklarında istemciye `res.status(500).json({ error: '...: ' + error.message })` şeklinde SQLite motorunun iç hata mesajları ve tablo isimleri döndürülüyordu.
- **Çözüm / Düzeltme:** Tüm controller'larda iç hatalar `console.error` ile sunucu loglarına yönlendirildi; istemciye yalnızca genel ve güvenli hata mesajları iletildi.

### 🟡 VULN-06: SQLite İlişkisel Bütünlük ve Foreign Key Kısıtı
- **Önem Derecesi:** Düşük/Orta (CVSS 4.3) - CWE-670
- **Açıklama:** SQLite varsayılan olarak `FOREIGN KEY` kontrolünü kapalı tutar. `PRAGMA foreign_keys = ON;` çalıştırılmadığında silinen veya geçersiz ID'ler veritabanı tutarsızlığına yol açabilir.
- **Çözüm / Düzeltme:** `database/db.js` bağlantı başlangıcına `PRAGMA foreign_keys = ON;` komutu eklendi.

### 🔵 VULN-07: Zayıf Parola Politikası ve Eksik Girdi Doğrulaması
- **Önem Derecesi:** Düşük (CVSS 3.7) - CWE-521
- **Açıklama:** Kayıt olurken şifre uzunluğu ve e-posta formatı denetlenmiyordu.
- **Çözüm / Düzeltme:** E-posta için Regex doğrulaması ve şifre için en az 6 karakter sınırı getirildi.

---

## 5. Güvenli Dağıtım ve Üretim Ortamı Kontrol Listesi (Production Checklist)

Üretim ortamına almadan önce aşağıdaki adımları mutlaka tamamlayın:
- [ ] `.env` dosyasındaki `JWT_SECRET` değerini en az 32 karakterlik yüksek entropili bir anahtarla değiştirin (`openssl rand -hex 32`).
- [ ] Ters vekil sunucu (Nginx / Cloudflare) arkasında HTTPS (TLS 1.3) zorunlu kılın.
- [ ] `express-rate-limit` ve `helmet` ara yazılımlarını aktifleştirin.
- [ ] Düzenli `npm audit` çalıştırarak bağımlılık güvenlik taramalarını yapın.
