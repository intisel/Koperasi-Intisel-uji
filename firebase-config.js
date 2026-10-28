// Konfigurasi Firebase (PUBLIK, aman ada di GitHub). Isi setelah proyek Firebase dibuat:
// Firebase Console > Project settings > General > Your apps (Web) > "SDK setup and configuration" -> salin nilainya.
// vapidKey: Project settings > Cloud Messaging > Web configuration > Web Push certificates > Generate key pair (Key pair).
// Selama masih null, tombol notifikasi tidak ditampilkan dan aplikasi berjalan seperti biasa.
window.FCM_CFG = null;
/* contoh isi:
window.FCM_CFG = {
  apiKey: '...', authDomain: '....firebaseapp.com', projectId: '...', messagingSenderId: '...', appId: '...',
  vapidKey: 'B....'
};
*/
