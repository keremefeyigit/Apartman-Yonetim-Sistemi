# 🤝 Katkıda Bulunma Kılavuzu (Contributing Guide)

Apartman Yönetim Sistemi (SIYOS) projesine katkıda bulunmak istediğiniz için teşekkür ederiz! Katkılarınızın sorunsuz ve standartlara uygun ilerlemesi için lütfen aşağıdaki adımları takip edin.

---

## 🧭 Katkı Süreci

1. **Depoyu Fork'layın:** GitHub üzerinden projeyi kendi hesabınıza çatallayın.
2. **Dal (Branch) Oluşturun:**
   - Yeni özellikler için: `feature/ozellik-adi`
   - Hata düzeltmeleri için: `bugfix/hata-adi`
   - Güvenlik yamaları için: `secfix/zafiyet-adi`
3. **Kodlama Standartları:**
   - Temiz, anlaşılır ve modüler kod yazın.
   - Değişken ve fonksiyon isimlerinde tutarlı olun.
   - XSS riskine karşı arayüzde dinamik verileri `escapeHtml` ile koruyun.
   - Veritabanı sorgularında her zaman parametreli sorgu (`?`) kullanın.
4. **Testleri Çalıştırın:**
   ```bash
   npm test
   ```
   Tüm testlerin yeşil (başarılı) olduğundan emin olun.
5. **Commit Mesajları:** Anlamlı Conventional Commits standartlarına uyun:
   - `feat: yeni sakin bildirim bileşeni eklendi`
   - `fix: admin atama modalında kapanma sorunu giderildi`
   - `docs: api uç noktaları tablosu güncellendi`
6. **Pull Request Açın:** PR şablonundaki tüm maddeleri doldurarak incelemeye gönderin.

---

## 🛡️ Güvenlik Açıkları Bildirimi

Kritik veya yüksek öncelikli güvenlik açıkları için genel Issue açmayınız; lütfen [SECURITY.md](SECURITY.md) dosyasındaki özel bildirim adımlarını takip ediniz.
