// Notifikasi push (Firebase Cloud Messaging) untuk anggota & pengurus. Aktif hanya bila firebase-config.js sudah diisi.
// Service worker (juga dibutuhkan agar PWA/APK terdeteksi dan untuk menerima push)
if('serviceWorker' in navigator) window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
const FB_VER = '10.12.2', NOTIF_KEY = 'intisel_notif_token';
const notifAda = () => !!(window.FCM_CFG && window.FCM_CFG.vapidKey && 'serviceWorker' in navigator && 'Notification' in window && 'PushManager' in window);
const notifTokenSimpan = () => { try{ return localStorage.getItem(NOTIF_KEY) || ''; }catch(e){ return ''; } };
function notifMuatSkrip(src){ return new Promise((ok, gagal) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => gagal(new Error('skrip')); document.head.appendChild(s); }); }
async function notifMessaging(){
  if(!window.firebase){
    await notifMuatSkrip('https://www.gstatic.com/firebasejs/' + FB_VER + '/firebase-app-compat.js');
    await notifMuatSkrip('https://www.gstatic.com/firebasejs/' + FB_VER + '/firebase-messaging-compat.js');
  }
  if(!firebase.apps.length){ const c = Object.assign({}, window.FCM_CFG); delete c.vapidKey; firebase.initializeApp(c); }
  return firebase.messaging();
}
async function notifAmbilToken(){
  const reg = await navigator.serviceWorker.ready, m = await notifMessaging();
  const tok = await m.getToken({vapidKey: window.FCM_CFG.vapidKey, serviceWorkerRegistration: reg});
  try{ m.onMessage(p => { const d = (p && p.data) || {}; if(d.judul && document.visibilityState === 'visible') reg.showNotification(d.judul, {body: d.isi || '', icon: 'icon-192.png', badge: 'icon-192.png', data: {url: d.url || './'}}); }); }catch(e){}
  return tok;
}
async function notifDaftarServer(tok, cabut){
  const k = (typeof infoKredensial === 'function') ? infoKredensial() : null; if(!k) return {ok: false, msg: 'Belum login.'};
  const a = (typeof pkApi === 'function' && k.token) ? await pkApi(Object.assign({a: cabut ? 'notif_cabut' : 'notif_daftar', notifToken: tok}, k)) : await apiPost(Object.assign({a: cabut ? 'notif_cabut' : 'notif_daftar', notifToken: tok}, k));
  return a;
}
async function notifAktifkan(btn){
  btn = (btn && btn.tagName) ? btn : document.querySelector('.notifbox button'); const t0 = btn ? btn.textContent : ''; if(btn){ btn.disabled = true; btn.textContent = 'Memproses...'; }
  let sukses = false;
  try{
    const izin = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if(izin !== 'granted'){ alert('Izin notifikasi ditolak. Aktifkan lewat pengaturan aplikasi/browser (Notifikasi) lalu coba lagi.'); return; }
    const tok = await notifAmbilToken(); if(!tok) throw new Error('token');
    const r = await notifDaftarServer(tok, false);
    if(r && r.ok){ try{ localStorage.setItem(NOTIF_KEY, tok); }catch(e){} sukses = true; }
    else alert((r && r.msg) || 'Gagal mendaftarkan notifikasi.');
  }catch(e){ alert('Notifikasi belum bisa diaktifkan di perangkat ini. Pastikan koneksi internet aktif lalu coba lagi.'); }
  if(btn && !sukses){ btn.disabled = false; btn.textContent = t0; }
  return sukses;
}
async function notifMatikan(){
  const tok = notifTokenSimpan();
  try{ if(tok) await notifDaftarServer(tok, true); const m = await notifMessaging(); await m.deleteToken(); }catch(e){}
  try{ localStorage.removeItem(NOTIF_KEY); }catch(e){}
}
const notifAktifSekarang = () => Notification.permission === 'granted' && !!notifTokenSimpan();
function notifPopupTutup(){ const e = document.getElementById('notifPopup'); if(e) e.remove(); }
function notifPopup(){ // muncul sesaat setelah login, hanya bila notifikasi belum aktif
  if(!notifAda() || notifAktifSekarang() || document.getElementById('notifPopup')) return;
  const blok = Notification.permission === 'denied';
  const ov = document.createElement('div'); ov.id = 'notifPopup'; ov.className = 'npop';
  const box = document.createElement('div'); box.className = 'npopbox';
  const ic = document.createElement('div'); ic.className = 'npopic'; ic.textContent = blok ? '🔕' : '🔔';
  const jd = document.createElement('b'); jd.textContent = blok ? 'Notifikasi sedang diblokir' : 'Aktifkan notifikasi?';
  const tx = document.createElement('p'); tx.textContent = blok
    ? 'Izin notifikasi untuk aplikasi ini dimatikan di perangkat Anda. Untuk menerima pengumuman dan status pinjaman, aktifkan izin Notifikasi di Pengaturan perangkat / browser, lalu buka aplikasi lagi.'
    : 'Dapatkan kabar langsung di HP: pengumuman koperasi, angsuran terverifikasi, dan status pinjaman Anda.';
  const aksi = document.createElement('div'); aksi.className = 'npopaksi';
  const nanti = document.createElement('button'); nanti.className = 'off'; nanti.textContent = blok ? 'Mengerti' : 'Nanti saja'; nanti.onclick = notifPopupTutup;
  aksi.appendChild(nanti);
  if(!blok){ const ya = document.createElement('button'); ya.textContent = 'Aktifkan'; ya.onclick = async () => { if(await notifAktifkan(ya)) notifPopupTutup(); }; aksi.appendChild(ya); }
  box.append(ic, jd, tx, aksi); ov.appendChild(box); document.body.appendChild(ov);
}
function infoKredensialSafe(){ try{ return typeof infoKredensial === 'function' && infoKredensial(); }catch(e){ return null; } }
async function notifSinkron(){ // token bisa berubah: daftarkan ulang diam-diam bila izin sudah diberikan
  if(!notifAda() || Notification.permission !== 'granted' || !notifTokenSimpan() || !infoKredensialSafe()) return;
  try{ const tok = await notifAmbilToken(); if(tok){ const r = await notifDaftarServer(tok, false); if(r && r.ok) localStorage.setItem(NOTIF_KEY, tok); } }catch(e){}
}
(function(){
  const asli = renderRoute; let sinkron = '';
  renderRoute = function(name, fromPop){ asli(name, fromPop); try{ const k = infoKredensialSafe(); const id = k ? (k.token || k.nik) : ''; if(!id){ sinkron = ''; notifPopupTutup(); } else if(id !== sinkron){ sinkron = id; notifSinkron().then(() => setTimeout(notifPopup, 600)); } }catch(e){} };
})();
