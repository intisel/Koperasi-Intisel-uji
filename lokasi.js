/* LOKASI: dimintai saat anggota mengirim pengajuan / bukti bayar (opsional, atas persetujuan anggota). Hanya Ketua yang dapat melihatnya. */
// Mengembalikan {lat,lng,acc} atau {err:'ditolak'|'tidak_tersedia'}. Tidak pernah menggagalkan pengiriman.
// Anggota diberi tahu lewat catatan di bawah tombol kirim; izin lokasi tetap diminta oleh Android/Chrome.
function lokasiMinta(){
  return new Promise(selesai => {
    if(!navigator.geolocation){ selesai({err:'tidak_tersedia'}); return; }
    const t = document.createElement('div');
    t.textContent = '📍 Mengambil lokasi...'; t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#0d3b6e;color:#fff;padding:10px 16px;border-radius:99px;font-size:14px;font-weight:700;z-index:300;box-shadow:0 4px 14px rgba(0,0,0,.3)';
    document.body.appendChild(t);
    const beres = v => { t.remove(); selesai(v); };
    navigator.geolocation.getCurrentPosition(
      pos => beres({lat:pos.coords.latitude, lng:pos.coords.longitude, acc:pos.coords.accuracy}),
      err => beres({err: err && err.code === 1 ? 'ditolak' : 'tidak_tersedia'}),
      {enableHighAccuracy:true, timeout:10000, maximumAge:0});
  });
}
// Catatan terbuka di dekat tombol kirim
['btnKb', 'btnKirim', 'btnBayar'].forEach(id => {
  const b = document.getElementById(id); if(!b || !b.parentNode) return;
  const n = document.createElement('p'); n.className = 'small'; n.style.cssText = 'margin:8px 0 6px;text-align:center';
  n.textContent = '📍 Saat Anda menekan kirim, lokasi Anda dicatat satu kali untuk verifikasi oleh Ketua koperasi. Jika izin lokasi ditolak, data tetap terkirim.';
  b.parentNode.insertBefore(n, b);
});

/* ---------- Ketua: daftar lokasi ---------- */
async function lokMuat(){
  const box = $('lokDaftar'); box.textContent = 'Memuat...';
  try{
    const r = await pkApi({a:'lokasi_daftar', token:pkToken});
    if(!r.ok){ if(r.expired) pkExpired(); else box.textContent = r.msg || 'Gagal memuat.'; return; }
    box.textContent = '';
    if(!r.list.length){ const e = document.createElement('p'); e.className = 'small'; e.textContent = 'Belum ada lokasi tercatat.'; box.appendChild(e); return; }
    r.list.forEach(x => {
      const k = document.createElement('div'); k.className = 'infoitem';
      const j = document.createElement('b'); j.textContent = x.nama + ' • ' + x.jenis;
      const m = document.createElement('div'); m.className = 'small'; m.textContent = x.waktu.slice(0, 16) + ' • ' + x.ref;
      k.append(j, m);
      if(x.lat != null){
        const a = document.createElement('a'); a.href = 'https://www.google.com/maps?q=' + x.lat + ',' + x.lng; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = '📍 Buka di Google Maps' + (x.acc ? ' (akurasi ±' + x.acc + ' m)' : ''); a.style.cssText = 'display:inline-block;margin-top:6px;font-weight:700';
        k.appendChild(a);
      } else { const t = document.createElement('div'); t.className = 'small'; t.style.marginTop = '4px'; t.textContent = '— ' + x.status.toLowerCase(); k.appendChild(t); }
      box.appendChild(k);
    });
  }catch(e){ box.textContent = 'Gagal terhubung ke server.'; }
}
