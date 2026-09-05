# ⚡ InstaForge - Universal Image & CDN Bulk Downloader Extension (Manifest V3)

Extension browser Google Chrome / Microsoft Edge untuk mengekstrak dan mendownload semua gambar dari halaman web aktif atau dari daftar URL / CDN massal langsung menjadi 1 file `.ZIP`.

---

## 🚀 Cara Pasang di Google Chrome / Edge / Brave:

1. Buka browser Chrome / Edge / Brave.
2. Buka halaman extensions:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
3. Aktifkan **Developer mode** (Mode pengembang) di pojok kanan atas.
4. Klik tombol **"Load unpacked"** (Muat yang belum dibongkar).
5. Pilih folder:
   ```text
   C:\Users\NCN0C\Downloads\instagram\extension_images
   ```
6. Selesai! Ikon **InstaForge Downloader** akan muncul di toolbar browser Anda.

---

## 🌟 Fitur Utama:

1. **🔍 Scan Halaman Aktif Otomatis:**
   - Mendeteksi semua tag `<img>`, `<picture>`, `srcset`, background CSS, dan link foto di website apa pun.
   - Filter berdasarkan format (`JPG`, `PNG`, `WEBP`, `SVG`, `GIF`).
   - Filter resolusi (sembunyikan tracking pixel / icon kecil).

2. **📋 Input URL & Pola Range Massal:**
   - Tempel daftar URL gambar satu per baris (contoh: `https://autofeeds.id/landing/ads-1x1/ig-03.jpg`).
   - Mendukung pola nomor otomatis seperti:
     ```text
     https://autofeeds.id/landing/ads-1x1/ig-[01-20].jpg
     ```
     *(Otomatis men-generate dari ig-01.jpg sampai ig-20.jpg)*.

3. **📦 Download Otomatis Menjadi ZIP:**
   - Semua gambar yang dipilih langsung dikompresi menjadi 1 file `.zip` (misal: `images_download.zip`) secara instan di dalam browser.
   - Tanpa batasan jumlah gambar.
