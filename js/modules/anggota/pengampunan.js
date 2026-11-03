/* ===== Pengampunan keterlambatan: diajukan pengurus (P1/P2/P3), diputuskan Pimpinan ===== */
let ampunAktif = false, ampunBadgeN = 0, ampunData = null, ampunPilihNik = '', ampunInfoData = null;
function ampunTampil(){
  ampunAktif = true;
  ['dsMainCard', 'dsFormBox'].forEach(i => { const e = $(i); if(e) e.classList.add('hidden'); });
  $('dsAmpunBox').classList.remove('hidden');
  $('dsTabBtnM').classList.remove('on'); $('dsTabBtnL').classList.remove('on'); $('dsTabBtnA').classList.add('on');
  ampunMuat();
}
function ampunSembunyi(){
  if(!ampunAktif) return; ampunAktif = false;
  $('dsAmpunBox').classList.add('hidden'); $('dsMainCard').classList.remove('hidden'); $('dsTabBtnA').classList.remove('on');
  $('dsFormBox').classList.toggle('hidden', !(dsData && dsData.bisaAjukan));
}
async function ampunMuat(){
  try{
    const r = await pkApi({a:'ampun_daftar', token:pkToken}); if(r.expired){ pkExpired(); return; }
    if(!r.ok) return;
    ampunData = r; ampunBadgeN = r.bisaPutus ? r.menunggu : 0;
    $('dsTabNA').innerText = ampunBadgeN ? '(' + ampunBadgeN + ')' : '';
    pkBadge2('pbDispensasi', (typeof dsBadgeN !== 'undefined' ? dsBadgeN : 0) + ampunBadgeN);
    if(ampunAktif) ampunRender();
  }catch(e){ if(ampunAktif) $('ampDaftar').innerHTML = '<div class="err">Gagal memuat data.</div>'; }
}
function ampunKartu(x, r){
  const st = x.status === 'MENUNGGU' ? '<span class="badge" style="background:#dbeafe;color:#134e8a">MENUNGGU PIMPINAN</span>' : x.status === 'DISETUJUI' ? '<span class="badge" style="background:#d4f5dd;color:#1b7a3a">DISETUJUI</span>' : '<span class="badge" style="background:#fde0e0;color:#c0392b">DITOLAK</span>';
  const it = x.item.map(i => `<div class="small" style="margin:2px 0">• ${esc(i.id)} angsuran ke-${i.ke} (telat ${i.hari} hari)</div>`).join('');
  let aksi = '';
  if(x.status === 'MENUNGGU' && r.bisaPutus) aksi = `<textarea id="ampC_${esc(x.aid)}" rows="2" maxlength="200" placeholder="Catatan (wajib bila ditolak)" style="margin-top:6px"></textarea><div style="display:flex;gap:8px;margin-top:6px"><button class="btn" style="background:#16a34a;padding:11px;font-size:14px" onclick="ampunPutus('${esc(x.aid)}','Y')">✔ Setujui</button><button class="btn" style="background:#dc2626;padding:11px;font-size:14px" onclick="ampunPutus('${esc(x.aid)}','N')">✖ Tolak</button></div>`;
  else if(x.status === 'MENUNGGU' && x.pengajuWho === r.who) aksi = `<button class="btn" style="margin-top:6px;padding:9px;font-size:13px;background:#6b7f99" onclick="ampunBatalKlik('${esc(x.aid)}')">Batalkan permintaan</button>`;
  else if(x.status !== 'MENUNGGU') aksi = `<div class="small" style="margin-top:4px">Oleh ${esc(x.oleh)} • ${esc(String(x.waktuPutus).slice(0, 16))}${x.catatan ? '<br>Catatan: ' + esc(x.catatan) : ''}</div>`;
  return `<div class="ok" style="background:#fff;margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(x.nama)} <span class="small">(NIK ${esc(x.nik)})</span></b>${st}</div><div class="small">${esc(String(x.waktu).slice(0, 16))} • ${esc(x.aid)} • diajukan ${esc(x.pengaju)}</div>${it}<div class="small" style="margin-top:4px"><b>Total ${x.hari} hari.</b> Alasan: ${esc(x.alasan)}</div>${aksi}</div>`;
}
function ampunRender(){
  const r = ampunData; if(!r) return;
  $('ampFormBox').classList.toggle('hidden', !r.bisaAjukan);
  $('ampDaftar').innerHTML = r.list.length ? r.list.map(x => ampunKartu(x, r)).join('') : '<p class="small">Belum ada permintaan pengampunan.</p>';
}
function ampunCariIsi(){
  const q = $('ampCari').value.trim().toLowerCase(), box = $('ampSaran'); ampunPilihNik = ''; $('ampInfo').innerHTML = '';
  if(q.length < 2){ box.innerHTML = ''; return; }
  if(!agData.length){ box.innerHTML = '<p class="small">Memuat daftar anggota...</p>'; agMuat().then(ampunCariIsi); return; }
  const L = agData.filter(a => a.aktif !== false && (a.nama + ' ' + a.nik).toLowerCase().includes(q)).slice(0, 6);
  box.innerHTML = L.length ? L.map(a => `<div style="border-top:1px solid #d6e6f8;padding:8px 0;cursor:pointer" onclick="ampunPilih('${esc(a.nik)}')"><b>${esc(a.nama)}</b> <span class="small">• NIK ${esc(a.nik)}${a.tingkat ? ' • Disiplin ' + esc(a.tingkat) : ''}</span></div>`).join('') : '<p class="small">Tidak ada anggota yang cocok.</p>';
}
async function ampunPilih(nik){
  ampunPilihNik = nik; $('ampSaran').innerHTML = ''; const box = $('ampInfo'); box.innerHTML = '<p class="small">Memuat...</p>';
  try{
    const r = await pkApi({a:'ampun_info', token:pkToken, nik}); if(r.expired){ pkExpired(); return; }
    if(!r.ok){ box.innerHTML = '<div class="err">' + esc(r.msg) + '</div>'; return; }
    ampunInfoData = r; $('ampCari').value = r.nama;
    const head = `<div style="margin:8px 0"><b>${esc(r.nama)}</b> ${typeof disiplinHtml === 'function' ? disiplinHtml(r.disiplin) : ''}</div>`;
    if(r.menunggu){ box.innerHTML = head + '<div class="warn">Masih ada permintaan pengampunan anggota ini yang menunggu keputusan Pimpinan.</div>'; return; }
    if(!r.telat.length){ box.innerHTML = head + '<div class="warn">Tidak ada keterlambatan yang dapat diampuni (hanya angsuran dari 2 pinjaman terakhir yang sudah dibayar terlambat, dan belum diampuni).</div>'; return; }
    box.innerHTML = head + '<div class="small" style="margin-bottom:4px">Centang angsuran yang diampuni:</div>' + r.telat.map((t, i) => `<label class="byck"><input type="checkbox" value="${i}" checked><span><b>${esc(t.id)} • angsuran ke-${t.ke}</b><br><span class="small">jatuh tempo ${tglf(t.due)} • dibayar ${tglf(t.tglBayar)} • telat <b>${t.hari} hari</b></span></span></label>`).join('') +
      `<label style="margin-top:8px">Alasan pengampunan (wajib)</label><textarea id="ampAlasan" rows="3" maxlength="300" placeholder="Contoh: gaji dari perusahaan terlambat dibayar sehingga angsuran telat"></textarea><button class="btn" style="margin-top:8px" onclick="ampunKirim()">📨 Ajukan ke Pimpinan</button>`;
  }catch(e){ box.innerHTML = '<div class="err">Gagal terhubung ke server.</div>'; }
}
async function ampunKirim(){
  const r = ampunInfoData; if(!r) return;
  const item = Array.from(document.querySelectorAll('#ampInfo input[type=checkbox]:checked')).map(c => { const t = r.telat[+c.value]; return {id:t.id, ke:t.ke}; });
  const alasan = ($('ampAlasan') || {value:''}).value.trim();
  if(!item.length){ alert('Centang minimal satu angsuran.'); return; }
  if(alasan.length < 10){ alert('Isi alasan pengampunan dengan jelas (minimal 10 huruf).'); return; }
  if(!await dialogKonfirmasi('Ajukan pengampunan ' + item.length + ' angsuran terlambat untuk ' + r.nama + '?\n\nPimpinan yang memutuskan. Bila disetujui, keterlambatan dihitung tepat waktu.')) return;
  try{ const x = await pkApi({a:'ampun_ajukan', token:pkToken, nik:r.nik, item, alasan}); if(x.expired){ pkExpired(); return; } alert((x.ok ? '✅ ' : '') + x.msg); if(x.ok){ $('ampCari').value = ''; $('ampInfo').innerHTML = ''; ampunInfoData = null; await ampunMuat(); } }
  catch(e){ alert('Gagal terhubung ke server. Coba lagi.'); }
}
async function ampunPutus(aid, v){
  const cat = ($('ampC_' + aid) || {value:''}).value.trim();
  if(v === 'N' && cat.length < 3){ alert('Isi alasan penolakan terlebih dahulu.'); return; }
  if(!await dialogKonfirmasi((v === 'Y' ? 'SETUJUI' : 'TOLAK') + ' pengampunan ini?' + (v === 'Y' ? ' Keterlambatan akan dihitung tepat waktu.' : ''))) return;
  try{ const r = await pkApi({a:'ampun_putus', token:pkToken, aid, v, catatan:cat}); if(r.expired){ pkExpired(); return; } alert((r.ok ? '✅ ' : '') + r.msg); if(r.ok) await ampunMuat(); }
  catch(e){ alert('Gagal terhubung ke server. Coba lagi.'); }
}
async function ampunBatalKlik(aid){
  if(!await dialogKonfirmasi('Batalkan permintaan pengampunan ini?')) return;
  try{ const r = await pkApi({a:'ampun_batal', token:pkToken, aid}); if(r.expired){ pkExpired(); return; } alert((r.ok ? '✅ ' : '') + r.msg); if(r.ok) await ampunMuat(); }
  catch(e){ alert('Gagal terhubung ke server. Coba lagi.'); }
}
