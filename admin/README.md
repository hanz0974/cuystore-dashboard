# Cuystore Admin

Panel admin React + Vite untuk Cuystore dengan backend lokal untuk koneksi API Telegram. **Data toko masih demo lokal**, belum terhubung ke pembayaran atau database transaksi. Semua nama, transaksi, statistik, dan produk awal adalah data ilustrasi. Statistik ringkasan dan grafik merupakan contoh; tabel dan katalog bisa diedit. Perubahan produk, status pesanan, dan identitas toko disimpan di localStorage browser. Token bot ditangani terpisah oleh backend dan tidak masuk ke localStorage.

## Menjalankan

Memerlukan Node.js 22.12+ dan npm atau pnpm.

```powershell
cd admin
npm install
npm run dev
```

Buka alamat lokal yang ditampilkan, biasanya http://127.0.0.1:5173.

```powershell
npm run build
npm run preview
```

Alternatif: gunakan `pnpm install`, `pnpm dev`, dan `pnpm build`.

## Fitur demo

- Dashboard dengan statistik ilustrasi dan pilihan periode grafik.
- Tambah dan edit produk, harga, kategori, serta stok.
- Kategori custom melalui Produk → Kelola kategori: tambah, ganti nama (termasuk produk terkait), hapus kategori kosong, dan filter katalog. Kolom kategori produk menerima nama baru langsung; kategori bawaan tidak lagi diwajibkan. Disimpan lokal di browser seperti data produk.
- Cari dan filter pesanan; lihat detail dan ubah status demo.
- Ringkasan pembayaran dari transaksi contoh dan ekspor CSV.
- Daftar pelanggan dan riwayat pesanan.
- Pengaturan identitas toko dan pesan sambutan lokal.
- Menu Bot: tambah/edit/hapus tombol, atur urutan dan visibilitas, pilih 1–3 tombol per baris, balasan teks/tautan/katalog, serta preview interaktif. Klik Simpan menu agar perubahan tetap ada setelah reload. Draf tetap ada ketika berpindah halaman panel, dan Batal perubahan memulihkan menu yang terakhir disimpan. Belum diterapkan ke Telegram.
- Tampilan responsif dan menu navigasi untuk HP.

## Integrasi berikutnya

Bot di folder induk saat ini adalah bot chat AI. Panel ini berjalan terpisah dan tidak mengubah perilakunya. Untuk operasional toko sungguhan, tambahkan autentikasi admin, database produk/pesanan, sinkronisasi menu dan katalog, serta verifikasi pembayaran di server. Jangan memasukkan token Telegram atau kunci pembayaran ke frontend atau variabel `VITE_*`.

## Koneksi bot di Pengaturan

1. Jalankan dev server atau `npm run preview` setelah build. Keduanya memasang backend lokal melalui `vite.config.mjs`; hosting file statis saja tidak menyediakan API koneksi.
2. Buka Pengaturan → Koneksi bot Telegram.
3. Isi token dari BotFather. Jika `.env` di folder induk sudah memiliki `TELEGRAM_BOT_TOKEN`, pilihan untuk memakai token server tersedia tanpa menampilkan nilainya.
4. Opsional: isi ID numerik chat pribadi admin untuk pesan tes. Admin harus menekan Start pada bot terlebih dahulu.
5. Klik Connect. Backend memeriksa `getMe` dan `getWebhookInfo`; nama, username, ID bot, dan status webhook ditampilkan.
6. Cek koneksi memverifikasi ulang; Kirim pesan tes mengirim satu pesan hanya ke ID admin yang tersimpan; Disconnect membuang koneksi dashboard.

Token input hanya disimpan di RAM backend sampai Disconnect atau restart. Token input tidak ditulis ke `.env`, file proyek, atau browser. Token yang berasal dari `.env` tetap berada di file asal setelah Disconnect; endpoint hanya melepas koneksi RAM. Penggantian token gagal mempertahankan bot lama yang sudah terhubung. ID admin baru diterapkan saat Connect.

Connect tidak menjalankan polling, mengubah/menghapus webhook, mengirim pesan otomatis, atau menerapkan editor menu ke bot. Ini memungkinkan bot AI atau webhook yang sudah ada terus berjalan. Nama dan username pada koneksi berasal dari Telegram; identitas toko di form bawah tetap pengaturan demo lokal.

Backend hanya menerima Host localhost/127.0.0.1 dan permintaan dari origin lokal yang sama, tidak menyediakan proxy API Telegram bebas, serta tidak mengembalikan token atau detail error mentah. Jalankan di loopback saja. Untuk akses publik atau banyak admin, diperlukan autentikasi dan penyimpanan kredensial terenkripsi di server.

`npm test` menjalankan tes API tiruan serta model menu tanpa menghubungi Telegram. Referensi: https://core.telegram.org/bots/api#getme dan https://core.telegram.org/bots/api#getwebhookinfo.
