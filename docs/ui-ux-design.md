# SIYOS Web Uygulaması UI/UX Tasarım Rehberi

Bu belge, Site İstek Şikayet Yönetim Sistemi (SIYOS) için planlanan web arayüzünün görsel dilini, bilgi mimarisini ve rol bazlı kullanıcı deneyimini tarif eder. Amaç; modern, minimal, güven veren bir deneyim üretirken üç ana rolün (Yönetici, Personel, Site Sakini) ihtiyaçlarını ayrı ayrı optimize etmektir.

## 1. Genel Tasarım Prensipleri
- **Tema**: Soothing blue-green palette; ana renk `#1F7A8C`, vurgu rengi `#4CAD73`, ikincil ton `#F0F4F8`, koyu metin `#1F2933`, açık arkaplan `#FAFBFC`.
- **Tipografi**: "Inter" (fallback Roboto, sans-serif). Başlık ağırlığı 600, gövde metin 400, küçük etiketler 500.
- **Köşeler ve gölgeler**: 10px border-radius, 0 10px 20px rgba(31, 122, 140, 0.05) gölge.
- **İkonografi**: Feather Icons veya benzeri tek hatlı ikon seti.
- **Erişilebilirlik**: Minimum kontrast oranı 4.5:1; font boyutu mobilde en az 14px; tüm buton ve form alanlarında 44px dokunma alanı.
- **Responsive**: Grid tabanlı layout; 12 kolon desktop (>= 1200px), 8 kolon tablet (768-1199px), 4 kolon mobil (< 768px).

## 2. Navigasyon ve Genel Yapı
- **Uygulama Kabuğu**: Sol tarafta sabit genişlikli (260px) sidebar; üstte 60px yüksekliğinde topbar.
- **Sidebar**: Rol bazlı menü; aktif öğe kalın mavi accent, pasifler gri. Mobilde hamburger menüden açılır drawer.
- **Topbar**: Sistem adı, arama (Yönetici/Personel için), kullanıcı avatarı, bildirim ikonu.
- **İçerik Alanı**: 24px padding, kart tabanlı bölümler.

## 3. Rol Bazlı Arayüzler

### 3.1 Yönetici (Admin) Paneli

#### Dashboard Yapısı
- **Hero Bant**: Bugünün tarihini, son 24 saatte gelen talep sayısını gösteren satır.
- **KPI Kartları (4 adet)**:
  1. Toplam Açık Talep
  2. Ortalama Çözüm Süresi (SLA)
  3. Son 7 Günde Oluşturulan Talepler
  4. Kritik Öncelikli Talepler
  Kartlarda mini sparkline grafikleri ve % değişim bilgisi.

#### Analiz Bölümleri
- **Kategori Dağılım Grafiği**: Doughnut chart; hover ile yüzdelik ve adet. Yanında kategori listesi.
- **Blok/Daire Isı Haritası**: Çift eksenli bar chart. X ekseni bloklar, y ekseni toplam talep. Hover’da kat/daire detayına drill-down.
- **Personel Performans Grafiği**: Horizontal bar; ortalama kapatma süresi (saat). SLA aşımı kırmızı olarak işaretlenir.

#### Hızlı Aksiyon Tablosu
- Üstte filtre chipleri: Durum (Yeni), Öncelik (Kritik, Yüksek), Kategori.
- Satır başlıkları: Talep No, Başlık, Kategori, Öncelik (renkli badge), Atanan Personel (avatar), SLA kalan süre (countdown), Aksiyon butonu.
- **Assign Modal**: Personel seçimi (dropdown + availability etiketi), tahmini çözüm saati girişi, yorum alanı.

#### Ek Bölümler
- **Yaşayan Sistem Uyarıları**: SLA aşımına 1 saat kalan talepler için kırmızı banner.
- **Bildirim Çekmecesi**: Topbardan açılan, son aksiyonları listeler.

### 3.2 Site Sakini (Resident) Arayüzü

#### Ana Sayfa
- **Hoş geldiniz kartı**: Kullanıcının blok/daire bilgisi otomatik doldurulmuş, değiştirilemez alan.
- **Genel Sorunlar Bölümü**: Read-only kart listesi; başlık, kategori, etkilenme alanı, güncel durum.

#### Talep Oluşturma
- **Adım 1**: Kategori seçimi (ikonlu card grid).
- **Adım 2**: Başlık ve açıklama; 500 karakter sınırı, canlı karakter sayacı.
- **Adım 3**: Fotoğraf yükleme (drag & drop veya tıkla yükle). Maksimum 5 görsel, 5MB.
- **Özet Adımı**: Gönderim öncesi özet; blok/daire kilitli alan, kategori, başlık, açıklama, görseller.
- **Gönder**: Başarılı ise kutlama animasyonu, “Taleplerim”e yönlendirme.

#### Taleplerim Sayfası
- **Segmented Control**: Tümü / Açık / Tamamlanan.
- **Filtre Paneli**: Tarih aralığı, kategori çoklu seçim, durum.
- **Talep Kartı**: Başlık, durum badge, öncelik, oluşturma tarihi, son aksiyon, atanan personel.
- **Detay Drawer**: Talep akışı (timeline), yüklenen görseller, yöneticinin yanıtları.
- **Geri Bildirim**: Talep durumu “Resolved” ise görünür. Onay butonu, 1-5 yıldızlı puanlama, kısa yorum alanı.

### 3.3 Personel (Staff) Arayüzü

#### Görev Listesi
- **Mobil-first layout**: Sticky topbar, altta sabit “Görevler / Tamamlanan” tabbar.
- Görev kartı: Öncelik badge, kalan SLA süresi, blok/daire, kategori.
- Quick actions: “İşe Başla” (In_Progress) ve “Tamamlandı” (Resolved) butonları kart üzerinde.

#### Görev Detayı
- Üstte başlık ve durum timeline (Yeni > Atandı > İşleme Alındı > Çözüldü > Kapandı). Aktif adım vurgulanır.
- İçerik: Açıklama, görseller, sakinin notu, yöneticinin talimatı.
- Form alanları:
  - Durum değiştirme (dropdown + buton)
  - Süre ekleme (işleyiş süresi logu)
  - Personel notu (textarea)
- Alt kısımda geçmiş aksiyonlar (chronological feed).

## 4. Bileşen Kütüphanesi
- **Card**: Başlık, alt başlık, ikon; 16px padding.
- **Sidebar Item**: Simge + etiket, hover’da hafif degrade.
- **Badge**: Durum renkleri: Yeni `#3182CE`, Atandı `#F6AD55`, İşlemde `#ECC94B`, Çözüldü `#38A169`, Kritik `#E53E3E`.
- **Modal**: 640px genişlik, header’da ikon + başlık; footer’da primary/ghost buton.
- **Drawer**: Sağdan 30% genişlik; mobile full-screen sheet.
- **Form Field**: Etiket 12px uppercase, input 14px, placeholder gri 500.
- **Timeline**: Dairesel düğümler, bağlayan çizgiler. Aktif düğüm dolu renkte.

## 5. Ekran Akışları ve Mikro Etkileşimler
- **Role Based Landing**: Login sonrası kullanıcı rolü belirlenir, ilgili dashboard’a yönlendirilir.
- **Notification Toasts**: Talep oluşturma, atama gibi işlemler sonrası sağ üstte 3 saniye görünen toast.
- **Empty States**: Talep yoksa illüstrasyon + aksiyon butonu.
- **Loader**: Mavi degrade spinner.

## 6. Responsive Davranışlar
- Sidebar mobile’da saklanır, hamburger ile açılır.
- Grafikleri içeren kartlar 2 sütundan tek sütuna düşer.
- Personel arayüzü mobile odaklı, quick action butonları tüm genişliği kaplar.

## 7. Şeffaflık ve Ortak Sorunlar Bölümü
- Resident dashboard’unda ana içerik altında “Sitede Son Durum” bölüm kartları listeler.
- Kart içerikleri: Sorun başlığı, etkilenen blok/alan, son güncelleme zamanı, durum badge’i. Kullanıcı bu kartlarla etkileşimde bulunamaz.

## 8. Gelecek Adımlar
1. Yüksek sadakatli (high fidelity) taslakların Figma veya benzeri araçta üretilmesi.
2. Tasarım sisteminin komponent bazlı kod dönüşümleri (React/Vanilla) için Storybook hazırlığı.
3. Erişilebilirlik test planı (color contrast, keyboard navigation, screen reader).

Bu rehber, geliştirme ekibine arayüzü uygularken rehberlik edecek temel prensipleri sağlar. Tasarım çıktıları oluşturulurken bu standartların korunması gerekir.
