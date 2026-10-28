/* PENGUMUMAN: running text di semua halaman + menu kelola untuk pengurus/pimpinan */
const INFO_CACHE = 'info_cache_v1', INFO_SEGAR_MS = 5 * 60 * 1000;
let infoList = [], infoLate = [];

/* ---------- Tampilan running text ---------- */
function infoGambar(list){ if(list) infoList = list; infoRender(); }
function infoRender(){
  const bar = document.getElementById('infoBar'), track = document.getElementById('infoTrack');
  if(!bar || !track) return;
  if(!infoList.length && !infoLate.length){ bar.classList.add('hidden'); track.textContent = ''; return; }
  track.textContent = '';
  const pisah = ' ✦ ';
  infoList.forEach(x => track.appendChild(document.createTextNode(x.isi + '   ✦   ')));
  if(infoLate.length){
    const sp = document.createElement('span'); sp.className = 'infolate';
    sp.textContent = '⚠️ Angsuran belum dibayar (terlambat): ' + infoLate.map(x => x.nama).join(', ') + ' — mohon segera dibayarkan.';
    track.append(sp, document.createTextNode('   ✦   '));
  }
  bar.classList.remove('hidden');
  requestAnimationFrame(() => { // kecepatan tetap (~ 55 px/detik) -> durasi mengikuti panjang teks
    const lebar = track.scrollWidth + bar.clientWidth;
    track.style.animationDuration = Math.max(12, Math.round(lebar / 55)) + 's';
  });
}
// Daftar terlambat: HANYA untuk yang sudah login (anggota atau pengurus). Tidak pernah dimuat di halaman depan.
function infoKredensial(){
  if(typeof pkToken !== 'undefined' && pkToken && currentPage === 'pengurus') return {token:pkToken};
  if(typeof anggotaAktif !== 'undefined' && anggotaAktif && currentPage === 'anggota') return {nik:anggotaAktif.nik, lahir:anggotaAktif.lahir};
  return null;
}
async function infoMuatTerlambat(){
  const k = infoKredensial();
  if(!k){ if(infoLate.length){ infoLate = []; infoRender(); } return; }
  try{
    const r = await fetch(API_URL, {method:'POST', body:JSON.stringify(Object.assign({a:'info_terlambat'}, k))}).then(x => x.json());
    if(infoKredensial() && r && r.ok){ infoLate = r.list || []; infoRender(); }
  }catch(e){}
}
async function infoMuatPublik(){
  try{
    const r = await (await fetch(API_URL, {method:'POST', body:JSON.stringify({a:'info_baca'})})).json();
    if(r && r.ok){ infoGambar(r.list); try{ localStorage.setItem(INFO_CACHE, JSON.stringify(r.list)); }catch(e){} }
  }catch(e){ /* offline: biarkan yang lama */ }
}
function infoBuka(){ // ketuk running text -> tampilkan semua pengumuman sebagai daftar
  if(!infoList.length && !infoLate.length) return;
  const ov = document.getElementById('infoModal'), box = document.getElementById('infoModalList');
  box.textContent = '';
  infoList.forEach(x => {
    const d = document.createElement('div'); d.className = 'infoitem';
    const t = document.createElement('div'); t.textContent = x.isi;
    const m = document.createElement('div'); m.className = 'small'; m.style.marginTop = '4px'; m.textContent = [x.waktu, x.oleh].filter(Boolean).join(' • ');
    d.append(t, m); box.appendChild(d);
  });
  if(infoLate.length){
    const d = document.createElement('div'); d.className = 'infoitem'; d.style.borderColor = '#e57373'; d.style.background = '#fdecea';
    const t = document.createElement('b'); t.textContent = '⚠️ Angsuran belum dibayar (terlambat)';
    const u = document.createElement('div'); u.style.marginTop = '4px'; u.textContent = infoLate.map(x => x.nama).join(', ');
    const m = document.createElement('div'); m.className = 'small'; m.style.marginTop = '4px'; m.textContent = 'Nama akan hilang otomatis setelah pembayaran diverifikasi pengurus.';
    d.append(t, u, m); box.insertBefore(d, box.firstChild);
  }
  ov.classList.remove('hidden');
}
function infoTutup(){ document.getElementById('infoModal').classList.add('hidden'); }
document.addEventListener('DOMContentLoaded', () => {
  try{ const c = JSON.parse(localStorage.getItem(INFO_CACHE) || 'null'); if(c && c.length) infoGambar(c); }catch(e){}
  infoMuatPublik();
  setInterval(() => { if(!document.hidden){ infoMuatPublik(); infoMuatTerlambat(); } }, INFO_SEGAR_MS);
  document.addEventListener('visibilitychange', () => { if(!document.hidden){ infoMuatPublik(); infoMuatTerlambat(); } });
});

/* ---------- Kelola pengumuman (pengurus/pimpinan) ---------- */
let infoEditId = '';
const infoApi = body => pkApi(Object.assign({token: pkToken}, body));
function infoPesan(t, ok){ const e = $('infoPesan'); e.className = ok ? 'ok' : 'err'; e.textContent = t || ''; e.style.display = t ? '' : 'none'; }
function infoHitung(){ $('infoHitung').textContent = $('infoIsi').value.length + ' / 240'; }
function infoReset(){ infoEditId = ''; $('infoIsi').value = ''; $('infoAkhir').value = ''; $('infoJudulForm').textContent = 'Tulis pengumuman baru'; $('infoBatal').classList.add('hidden'); infoHitung(); }
async function infoMuat(){
  $('infoAkhir').min = new Date().toISOString().slice(0, 10);
  infoPesan('');
  const box = $('infoDaftar'); box.textContent = 'Memuat...';
  try{
    const r = await infoApi({a:'info_daftar'});
    if(!r.ok){ box.textContent = ''; infoPesan(r.msg || 'Gagal memuat.', false); return; }
    infoDaftarGambar(r.list);
  }catch(e){ box.textContent = ''; infoPesan('Gagal terhubung ke server.', false); }
}
function infoDaftarGambar(list){
  const box = $('infoDaftar'); box.textContent = '';
  if(!list.length){ const p = document.createElement('p'); p.className = 'small'; p.textContent = 'Belum ada pengumuman.'; box.appendChild(p); return; }
  list.forEach(x => {
    const kartu = document.createElement('div'); kartu.className = 'infoitem' + ((!x.aktif || x.lewat) ? ' off' : '');
    const isi = document.createElement('div'); isi.textContent = x.isi;
    const st = x.lewat ? 'Sudah berakhir' : (x.aktif ? 'Tampil' : 'Disembunyikan');
    const meta = document.createElement('div'); meta.className = 'small'; meta.style.margin = '4px 0 8px';
    meta.textContent = st + ' • ' + x.waktu.slice(0, 16) + ' • ' + x.oleh + (x.berakhir ? ' • sampai ' + x.berakhir : '');
    const aksi = document.createElement('div'); aksi.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
    const tombol = (label, fn) => { const b = document.createElement('span'); b.className = 'chip'; b.textContent = label; b.onclick = fn; aksi.appendChild(b); };
    tombol('✏️ Ubah', () => infoUbah(x));
    tombol(x.aktif ? '🙈 Sembunyikan' : '👁 Tampilkan', () => infoToggle(x));
    tombol('🗑 Hapus', () => infoHapus(x));
    kartu.append(isi, meta, aksi); box.appendChild(kartu);
  });
}
function infoUbah(x){
  infoEditId = x.id; $('infoIsi').value = x.isi; $('infoAkhir').value = x.berakhir || '';
  $('infoJudulForm').textContent = 'Ubah pengumuman'; $('infoBatal').classList.remove('hidden'); infoHitung();
  $('infoIsi').scrollIntoView({behavior:'smooth', block:'center'}); $('infoIsi').focus();
}
async function infoKirim(){
  const isi = $('infoIsi').value.trim();
  if(!isi){ infoPesan('Tulis isi pengumuman dulu.', false); return; }
  const btn = $('infoBtn'); btn.disabled = true; btn.textContent = 'Menyimpan...';
  try{
    const r = await infoApi({a:'info_simpan', id:infoEditId, isi, berakhir:$('infoAkhir').value});
    infoPesan(r.msg, !!r.ok);
    if(r.ok){ infoReset(); await infoMuat(); infoPesan(r.msg, true); infoMuatPublik(); }
  }catch(e){ infoPesan('Gagal terhubung ke server.', false); }
  finally{ btn.disabled = false; btn.textContent = '📢 Terbitkan'; }
}
async function infoToggle(x){
  try{ const r = await infoApi({a:'info_aktif', id:x.id, aktif:!x.aktif}); if(r.ok){ await infoMuat(); infoMuatPublik(); } infoPesan(r.msg, !!r.ok); }
  catch(e){ infoPesan('Gagal terhubung ke server.', false); }
}
async function infoHapus(x){
  if(!confirm('Hapus pengumuman ini secara permanen?')) return;
  try{ const r = await infoApi({a:'info_hapus', id:x.id}); if(r.ok){ if(infoEditId === x.id) infoReset(); await infoMuat(); infoMuatPublik(); } infoPesan(r.msg, !!r.ok); }
  catch(e){ infoPesan('Gagal terhubung ke server.', false); }
}

// Sinkronkan daftar terlambat setiap pindah layar (muncul setelah login, hilang setelah keluar)
(function(){
  const asli = renderRoute;
  renderRoute = function(name, fromPop){ asli(name, fromPop); infoMuatTerlambat(); };
})();
