/* ===== Informasi Perangkat & Lokasi (pengurus & pimpinan): tab Perangkat (bawaan) + tab Lokasi ===== */
let plData = null, plLokasiBoleh = false, plTabAktif = 'P';
const PL_MODE = {PWA:['📲 Terpasang', 'g'], BROWSER:['🌐 Browser', 'w'], PERNAH:['✅ Pernah masuk', ''], BELUM:['⚪ Belum masuk', 'r']};
const plSt = a => a.akses ? (a.akses.mode === 'PWA' ? 'PWA' : 'BROWSER') : (a.pin ? 'PERNAH' : 'BELUM');
function plTab(t){
  if(t === 'L' && !plLokasiBoleh){ alert('Data lokasi hanya dapat dilihat oleh pengurus (Penasehat, Ketua, Bendahara).'); return; }
  plTabAktif = t; $('plTabBtnP').classList.toggle('on', t === 'P'); $('plTabBtnL').classList.toggle('on', t === 'L');
  $('plTabP').classList.toggle('hidden', t !== 'P'); $('plTabL').classList.toggle('hidden', t !== 'L');
  if(t === 'L') lokMuat(); else if(!plData) plMuat(true);
}
async function plMuat(diam){
  if(!diam) plTab('P'); // masuk menu: selalu mulai dari tab Perangkat
  $('plList').innerHTML = '<p class="small">Memuat...</p>'; $('plInfo').innerText = '';
  try{
    const r = await pkApi({a:'perangkat_daftar', token:pkToken});
    if(r.expired){ pkExpired(); return; }
    if(!r.ok){ $('plList').innerHTML = `<div class="err">${esc(r.msg)}</div>`; return; }
    plData = r; plRender();
  }catch(e){ $('plList').innerHTML = '<div class="err">Gagal memuat data. Periksa koneksi internet.</div>'; }
}
function plRender(){
  const r = plData; if(!r) return;
  const ct = {PWA:0, BROWSER:0, PERNAH:0, BELUM:0}, nt = r.list.filter(a => a.notif > 0).length; r.list.forEach(a => { ct[plSt(a)]++; });
  $('plRingkas').innerHTML = `📲 Terpasang <b>${ct.PWA}</b> • 🌐 Browser <b>${ct.BROWSER}</b><br>✅ Pernah masuk (mode belum tercatat) <b>${ct.PERNAH}</b> • ⚪ Belum masuk <b>${ct.BELUM}</b><br>🔔 Notifikasi aktif <b>${nt}</b> dari <b>${r.list.length}</b> anggota`;
  $('plPengurus').innerHTML = r.pengurus.map(g => `<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid #d6e6f8"><span>${esc(g.nama)} <span class="small">• ${esc(g.jabatan || g.id)}</span></span><span class="small"><b>${g.notif ? '🔔 aktif' + (g.notif > 1 ? ' (' + g.notif + ' perangkat)' : '') : '🔕 belum aktif'}</b></span></div>`).join('');
  const q = $('plCari').value.trim().toLowerCase(), f = $('plFilter').value;
  const L = r.list.filter(a => (!q || (a.nama + ' ' + a.nik + ' ' + a.jabatan + ' ' + a.base).toLowerCase().includes(q)) && (!f || (f === 'NOTIF' ? a.notif > 0 : f === 'NONOTIF' ? !a.notif : plSt(a) === f))), MAX = 80;
  $('plInfo').innerText = `${L.length} dari ${r.list.length} anggota` + (L.length > MAX ? ` • menampilkan ${MAX} pertama, gunakan pencarian` : '');
  $('plList').innerHTML = L.slice(0, MAX).map(a => {
    const m = PL_MODE[plSt(a)], ak = a.akses, os = ak ? ({ANDROID:'Android', IOS:'iPhone', LAINNYA:'HP lain'}[ak.os] || '-') : '';
    return `<div style="border-bottom:1px solid #d6e6f8;padding:9px 0"><b>${esc(a.nama)}</b> <span class="small">• NIK ${esc(a.nik)}</span><br><span class="small">${esc(a.jabatan)}${a.base ? ' • ' + esc(a.base) : ''}</span>
      <div><span class="tag ${m[1]}">${m[0]}</span><span class="tag ${a.notif ? 'g' : ''}">${a.notif ? '🔔 notifikasi aktif' + (a.notif > 1 ? ' (' + a.notif + ')' : '') : '🔕 notifikasi belum aktif'}</span></div>
      ${ak ? `<div class="small" style="margin-top:3px">${os} • terakhir aktif ${esc(ak.terakhir.slice(0, 16))} • ${ak.sesi} sesi • pertama masuk ${esc(ak.pertama.slice(0, 10))}</div>` : ''}</div>`;
  }).join('') || '<p class="small">Tidak ada anggota yang cocok.</p>';
}
