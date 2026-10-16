# Cuystore — Telegram Bot & React Dashboard

Panel admin React + Vite untuk mengelola demo toko Cuystore, disertai bot chat Telegram melalui 9router.

## Dashboard website

- Dashboard penjualan dengan data ilustrasi, produk dan stok, kategori custom, pesanan, pelanggan, serta ekspor CSV.
- Editor tombol Menu Bot dengan pengaturan urutan, visibilitas, balasan, tautan, dan preview interaktif.
- Pengaturan koneksi Telegram: token BotFather ditangani backend lokal, verifikasi identitas bot, cek koneksi, disconnect, serta pesan tes ke ID admin opsional.
- Tampilan responsif untuk desktop dan HP.

Data toko dan konfigurasi menu masih tersimpan lokal di browser; belum tersinkron ke bot atau pembayaran sungguhan. Koneksi token input tersimpan di RAM backend hingga disconnect/restart. Bot chat AI berjalan terpisah. Jalankan dashboard di localhost; akses publik membutuhkan autentikasi dan penyimpanan kredensial server yang sesuai.

Memerlukan Node.js 22.12+ dan npm (atau pnpm):

```powershell
cd admin
npm install
npm run dev
```

Buka alamat localhost yang ditampilkan. Untuk build dan tes dashboard:

```powershell
npm run build
npm test
```

Panduan koneksi bot dan fitur demo: [admin/README.md](admin/README.md). Token bot, `.env`, data penggunaan, dependensi, dan hasil build dikecualikan dari repository. Gunakan `.env.example` sebagai acuan tanpa membagikan token pribadi.

## Bot Telegram + 9router lokal

Bot pesan teks, tanpa paket tambahan. Memerlukan Node.js 22+, internet untuk Telegram, dan 9router yang berjalan di perangkat yang sama.

## Mulai

1. Buat bot lewat https://t.me/BotFather dengan `/newbot` dan salin token.
2. Buka `.env`. Isi `TELEGRAM_BOT_TOKEN`. Isi `NINE_ROUTER_API_KEY` jika endpoint 9router meminta key.
3. Isi `NINE_ROUTER_MODEL` dengan nama model/provider atau combo yang sudah aktif di dashboard 9router. Bisa juga dipilih nanti lewat `/model`.
4. Jalankan dari PowerShell di folder ini: `powershell -ExecutionPolicy Bypass -File .\start.ps1`.
5. Kirim `/id` ke bot. Masukkan ID tersebut ke `TELEGRAM_ALLOWED_USER_IDS`, lalu hentikan bot (Ctrl+C) dan jalankan ulang. Beberapa ID dipisahkan koma. Jika kosong, akses AI terkunci.
6. Kirim `/start`, lalu pesan biasa.

## Perintah

- `/models kata`: cari model (daftar katalog bisa mencakup provider yang belum terhubung).
- `/model nama`: ganti model/combo untuk sesi ini dan reset riwayat.
- `/reset`: hapus riwayat sesi.
- `/status`: lihat model dan jumlah riwayat.
- `/help`, `/id`.

## Pemeriksaan

`powershell -ExecutionPolicy Bypass -File .\start.ps1 --check` mengecek endpoint dan melakukan satu permintaan singkat jika model sudah diisi. Tidak memerlukan token Telegram.

`node --test` menjalankan tes dengan API tiruan, tanpa mengirim pesan atau memakai kuota provider.

Riwayat tersimpan di RAM, maksimal 10 percakapan, hilang saat restart. Bot hanya melayani chat pribadi; pesan diproses berurutan. Jawaban panjang dipotong menjadi beberapa pesan. Komputer dan proses bot/9router harus tetap menyala. Jalankan satu instance per token. Pesan tertunda di Telegram dapat diproses saat bot dinyalakan; tidak ada jaminan tepat sekali jika proses berhenti mendadak.

Token dan key tetap di `.env` (diabaikan Git); jangan bagikan file tersebut. Isi chat dikirim ke Telegram dan melalui 9router ke provider yang dipilih.

Referensi: https://github.com/decolua/9router dan https://core.telegram.org/bots/api

Daftar model: `/models`, halaman berikut `/models 2`, pencarian `/models gpt`, halaman pencarian `/models gpt 2`. Pilih dengan `/model 3` dari hasil daftar terakhir. Nomor berubah ketika pencarian berubah.

`/usage`: token input, output, total, dan jumlah respons tanpa data lengkap, khusus pengguna tersebut. Dicatat dari respons API mulai fitur diaktifkan, tersimpan di usage.json setelah setiap respons, dan tidak terhapus oleh /reset atau ganti model. Hitungan tidak mencakup aplikasi lain atau riwayat sebelum fitur ini ada. Sisa kuota provider tidak tersedia. Gagal mengirim balasan Telegram tetap dihitung bila respons API sudah diterima. File usage.json hanya berisi ID pengguna dan agregat penggunaan, tanpa isi chat. Jalankan satu instance bot per folder.
