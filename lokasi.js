/* LOKASI: dimintai saat anggota mengirim pengajuan / bukti bayar (opsional, atas persetujuan anggota). Hanya Ketua yang dapat melihatnya. */
// Mengembalikan {lat,lng,acc} | {err:'ditolak'|'tidak_tersedia'} (kirim tanpa lokasi) | null (anggota membatalkan kirim)
function lokasiMinta(){
  return new Promise(selesai => {
    const m = document.createElement('div'); m.className = 'infomodal'; m.style.zIndex = 300;
    const b = document.createElement('div'); b.className = 'infobox'; b.style.textAlign = 'center';
    const h = document.createElement('b'); h.textContent = '📍 Catat lokasi Anda?';
    const p = document.createElement('p'); p.className = 'small'; p.style.margin = '8px 0 12px';
    p.textContent = 'Lokasi Anda dicatat satu kali, hanya saat Anda menekan kirim, untuk verifikasi oleh Ketua koperasi. Tidak ada pelacakan terus-menerus dan tidak dilihat anggota lain. Anda boleh memilih mengirim tanpa lokasi.';
    const st = document.createElement('div'); st.className = 'small'; st.style.margin = '0 0 8px';
    const mk = (t, gaya, fn) => { const x = document.createElement('button'); x.type = 'button'; x.className = 'btn'; x.style.cssText = 'margin:6px 0 0;' + gaya; x.textContent = t; x.onclick = fn; return x; };
    const tutup = v => { m.remove(); selesai(v); };
    const izin = mk('📍 Izinkan & kirim', '', () => {
      if(!navigator.geolocation){ tutup({err:'tidak_tersedia'}); return; }
      izin.disabled = true; izin.textContent = 'Mengambil lokasi...'; st.textContent = 'Mohon tunggu, jangan tutup halaman ini.';
      navigator.geolocation.getCurrentPosition(
        pos => tutup({lat:pos.coords.latitude, lng:pos.coords.longitude, acc:pos.coords.accuracy}),
        err => tutup({err: err && err.code === 1 ? 'ditolak' : 'tidak_tersedia'}),
        {enableHighAccuracy:true, timeout:12000, maximumAge:0});
    });
    const tanpa = mk('Kirim tanpa lokasi', 'background:#6b7f99', () => tutup({err:'tidak_tersedia'}));
    const batal = mk('Batal', 'background:transparent;color:#5a7aa0;box-shadow:none', () => tutup(null));
    b.append(h, p, st, izin, tanpa, batal); m.appendChild(b); document.body.appendChild(m);
  });
}

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
