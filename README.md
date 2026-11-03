# Koperasi-Intisel
Pinjaman Karyawan PT. Intisel Lampung Syariah

## Struktur folder

```
index.html            Halaman aplikasi (satu halaman, dipakai semua peran)
sw.js                 Service worker (harus di akar agar cakupannya seluruh aplikasi)
manifest.json         Manifest PWA
assets/img/           Gambar, logo, ikon aplikasi, dan foto slide
docs/                 Panduan pengguna (panduan-anggota.html, panduan-pengurus.html)
js/config/            Pengaturan: apk-config.js (unduh APK), firebase-config.js (notifikasi)
js/core/              Komponen bersama: dialog, pinpad, biometrik, foto, lokasi, notifikasi, banner, jabatan, tanda tangan, bilah profil
js/modules/anggota/   Fitur sisi anggota: pengajuan, layanan, keringanan, dispensasi, pengampunan, talangan, profil, ubah data, selesai
js/modules/pengurus/  Fitur sisi pengurus: pengurus, pengurus2, pengumuman, budget, rencana, kas, kbp, perangkat
```

Urutan pemuatan skrip ditentukan oleh daftar `<script>` di bagian bawah `index.html`; saat memindahkan atau menambah berkas, jaga urutannya.
