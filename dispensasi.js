/* Dispensasi Pinjaman: tab Masa Tunggu + tab Limit (pengurus) + keterangan Disiplin Pembayaran (pengurus, pimpinan, dan anggota). */
const DS_LABEL = {MENUNGGU:'⏳ Menunggu keputusan', DISETUJUI:'✅ Disetujui', DITOLAK:'❌ Ditolak', DIBATALKAN:'🚫 Akses ditutup', DIBUKA:'⌛ Akses kedaluwarsa (tidak diisi)'};
const DISIPLIN_UI = {'A+':['#b7791f','🌟 A+ • Sangat disiplin'], 'A':['#16a34a','✅ A • Disiplin baik'], 'B':['#65a30d','👍 B • Cukup baik'], 'C':['#d97706','⚠️ C • Perlu ditingkatkan'], 'D':['#dc2626','❗ D • Perlu perhatian'], 'E':['#991b1b','🔴 E • Perlu pembinaan'], BELUM_DINILAI:['#6b7280','Belum ada angsuran yang dinilai'], BELUM_ADA:['#6b7280','Belum ada riwayat pinjaman']};
const DISIPLIN_AKIBAT = {'A+':'⭐ Anggota Teladan: masa tunggu dipotong 1 bulan, pengajuan didahulukan di antrean review, dan otomatis dapat dispensasi limit.', 'A':'🎁 Masa tunggu setelah lunas dipotong 1 bulan.', 'D':'Masa tunggu setelah lunas ditambah setengah total hari keterlambatan pinjaman terakhir (maks 90 hari).', 'E':'Masa tunggu setelah lunas ditambah total hari keterlambatan pinjaman terakhir (maks 180 hari) dan tidak dapat dispensasi.'};
function disiplinHtml(dp, anggota){
  if(!dp) return '';
  const u = DISIPLIN_UI[dp.label] || DISIPLIN_UI.BELUM_ADA;
  return `<div style="border-left:4px solid ${u[0]};background:#f8fafc;border-radius:8px;padding:8px 10px;margin:8px 0">
    <div style="font-weight:800;color:${u[0]}">${u[1]}${dp.persenTepat !== null && dp.persenTepat !== undefined ? ' • ' + dp.persenTepat + '% tepat waktu' : ''}</div>
    <div class="small" style="margin-top:2px">${esc(dp.teks)}</div>
    ${DISIPLIN_AKIBAT[dp.label] ? `<div class="small" style="margin-top:4px;font-weight:700;color:${u[0]}">${DISIPLIN_AKIBAT[dp.label]}</div>` : ''}
    ${anggota ? '<div class="small" style="margin-top:4px;color:#134e8a">Bayar angsuran tepat waktu agar koperasi tetap lancar dan anggota lain yang membutuhkan juga bisa terbantu. 🙏</div>' : ''}
  </div>`;
}
let dsKandidat = [], dsTidak = [], dsPilihNik = '', dsTabAktif = 'MASA_TUNGGU', dsData = null;
const DS_TEKS = {
  MASA_TUNGGU: {judul:'⏳ Dispensasi Masa Tunggu', ph:'🔍 Ketik nama anggota yang sedang masa tunggu...',
    intro:'Untuk anggota yang baru lunas tetapi sangat mendesak membutuhkan pinjaman (misalnya musibah). <b>Alur:</b> anggota meminta ke pengurus → salah satu pengurus membuka menu ini untuk anggota → anggota mengisi formulirnya sendiri di aplikasi → wajib disetujui <b>Penasehat, Ketua, dan Bendahara</b>; satu penolakan berarti ditolak. Pimpinan diberi tahu setelah disetujui. Limit dipotong Rp 500.000 untuk setiap bulan masa tunggu yang dilewati. Berlaku 14 hari, sekali pakai.',
    form:'Setelah anggota meminta langsung (telepon, WA, atau bertemu), buka aksesnya di sini. Menu <b>Dispensasi Masa Tunggu</b> akan muncul di aplikasi anggota itu, lalu <b>anggota sendiri yang mengisi formulirnya</b>. Akses berlaku 7 hari.'},
  LIMIT: {judul:'📈 Dispensasi Limit Pinjaman', ph:'🔍 Ketik nama anggota...',
    intro:'Untuk anggota yang ingin meminjam <b>lebih besar dari limit masa kerjanya</b>. Limit dan tenor maksimal naik <b>satu tingkat</b> (contoh: 4 tahun Rp 3.500.000 / 7 bln → Rp 4.000.000 / 8 bln; pokok angsuran tetap Rp 500.000 per bulan). <b>Syarat:</b> tidak ada pinjaman berjalan, tidak sedang masa tunggu, dan hanya satu kali dalam 12 bulan. <b>Alur:</b> anggota meminta ke pengurus → pengurus membuka menu → anggota mengisi formulir → disetujui <b>Penasehat, Ketua, dan Bendahara</b>; Pimpinan diberi tahu. Disiplin pembayaran menjadi bahan pertimbangan. Berlaku 14 hari, sekali pakai.',
    form:'Setelah anggota meminta langsung, buka aksesnya di sini. Menu <b>Dispensasi Limit Pinjaman</b> akan muncul di aplikasi anggota itu, lalu <b>anggota sendiri yang mengisi formulirnya</b>. Akses berlaku 7 hari.'}
};
const dsNamaTab = () => dsTabAktif === 'LIMIT' ? 'Dispensasi Limit Pinjaman' : 'Dispensasi Masa Tunggu';
function dsTab(j){
  dsTabAktif = j; dsPilihNik = ''; if($('dsCari')) $('dsCari').value = ''; if($('dsSaran')) $('dsSaran').innerHTML = ''; if($('dsInfo')) $('dsInfo').style.display = 'none';
  dsRender(); dsMuatKandidat();
}
async function dsMuat(){
  const box = $('dsDaftar'); if(!box) return;
  try{
    const r = await pkApi({a:'ds_daftar', token:pkToken});
    if(r.expired){ pkExpired(); return; }
    if(!r.ok){ box.innerHTML = `<div class="err">${esc(r.msg)}</div>`; return; }
    dsData = r; pkBadge2('pbDispensasi', r.menunggu.filter(k => k.bisaPutus).length);
    $('dsFormBox').classList.toggle('hidden', !r.bisaAjukan);
    dsRender(); if(r.bisaAjukan){ dsKandidat = []; dsMuatKandidat(); }
  }catch(e){ box.innerHTML = '<div class="err">Gagal memuat data.</div>'; }
}
function dsRender(){
  const box = $('dsDaftar'), r = dsData, t = DS_TEKS[dsTabAktif]; if(!box) return;
  $('dsTabBtnM').classList.toggle('on', dsTabAktif === 'MASA_TUNGGU'); $('dsTabBtnL').classList.toggle('on', dsTabAktif === 'LIMIT');
  $('dsJudul').innerText = t.judul; $('dsIntro').innerHTML = t.intro; $('dsFormTeks').innerHTML = t.form; $('dsCari').placeholder = t.ph;
  $('dsFormJudul').innerText = '🔓 Buka Menu ' + dsNamaTab() + ' untuk Anggota';
  if(!r){ box.innerHTML = '<p class="small">Memuat...</p>'; return; }
  const per = j => x => (x.jenis || 'MASA_TUNGGU') === j;
  ['MASA_TUNGGU', 'LIMIT'].forEach(j => { const n = r.menunggu.filter(x => per(j)(x) && x.bisaPutus).length; $(j === 'LIMIT' ? 'dsTabNL' : 'dsTabNM').innerText = n ? '(' + n + ')' : ''; });
  const p = per(dsTabAktif), dibuka = (r.dibuka || []).filter(p), menunggu = r.menunggu.filter(p), riwayat = r.riwayat.filter(p);
  box.innerHTML = (dibuka.length ? '<div style="font-weight:800;margin:4px 0 6px">🔓 Akses dibuka — menunggu anggota mengisi formulir</div>' + dibuka.map(dsAksesKartu).join('') : '') +
    (menunggu.length ? '<div style="font-weight:800;margin:10px 0 6px">Menunggu keputusan</div>' + menunggu.map(dsKartu).join('') : '<p class="small">Tidak ada permohonan yang menunggu keputusan. ✅</p>') +
    (riwayat.length ? '<div style="font-weight:800;margin:14px 0 6px">Riwayat terakhir</div>' + riwayat.map(dsKartu).join('') : '');
}
async function dsMuatKandidat(){
  try{ const r = await pkApi({a:'ds_kandidat', token:pkToken, jenis:dsTabAktif}); if(r.ok && r.jenis === dsTabAktif){ dsKandidat = r.list; dsTidak = r.tidak || []; } }catch(e){}
}
function dsKartu(k){
  const did = esc(k.did), nm = esc(k.nama).replace(/'/g, '');
  let st = '';
  if(k.status === 'DISETUJUI') st = k.dipakai ? ' — sudah dipakai (' + esc(k.dipakai) + ')' : k.aktif ? ' — berlaku sampai ' + tglf(k.berlaku) : ' — kedaluwarsa (tidak dipakai)';
  return `<div class="ok" style="background:#fff;margin-bottom:12px" id="ds-${did}">
    <b>${esc(k.nama)}</b> <span class="small">(NIK ${esc(k.nik)} • diusulkan ${esc(k.pengaju)} • ${esc(k.waktu)})</span><br>
    ${k.jenis === 'LIMIT' ? (k.limitInfo ? `<span class="small">Limit naik satu tingkat: <b>${pkRp(k.limitInfo.limitAsli)} → ${pkRp(k.limitInfo.limitBaru)}</b> • tenor maks ${k.limitInfo.tenorAsli} → ${k.limitInfo.tenorBaru} bulan</span>` : '<span class="small">Limit naik satu tingkat</span>') : `<span class="small">Lunas ${tglf(k.lunas)} • masa tunggu s.d. ${tglf(k.boleh)} • dilewati <b>${k.bulan} bulan</b> → limit dipotong <b>${pkRp(k.potongan)}</b></span>`}<br>
    <span class="small">Alasan: <b>${esc(k.alasanTeks)}</b></span>
    <div class="small" style="white-space:pre-wrap;margin:6px 0;padding:8px;background:#f4f9ff;border-radius:8px">${esc(k.uraian)}</div>
    ${disiplinHtml(k.disiplin)}
    <a href="#" class="small" onclick="dsBukti('${did}');return false">📎 Lihat bukti pendukung</a><div id="dsb-${did}"></div>
    <div class="small" style="margin-top:6px"><b>Suara pengurus:</b> ${(k.suara || []).map(x => (x.v === 'Y' ? '✅' : x.v === 'N' ? '❌' : '⏳') + ' ' + esc(x.jabatan || x.nama) + (x.k ? ' <i>“' + esc(x.k) + '”</i>' : '')).join(' • ')}</div>
    ${k.status === 'MENUNGGU' ? (k.bisaPutus ? `
      <textarea id="dsK-${did}" rows="2" placeholder="Komentar (wajib bila menolak)" style="margin-top:8px"></textarea>
      <div style="display:flex;gap:8px"><button class="btn" style="background:#16a34a;padding:12px;font-size:14px" onclick="dsPutus('${did}','Y','${nm}')">✔ Setujui</button><button class="btn" style="background:#dc2626;padding:12px;font-size:14px" onclick="dsPutus('${did}','N','${nm}')">✖ Tolak</button></div>`
      : '<p class="small">Menunggu suara pengurus lain (Penasehat, Ketua, dan Bendahara harus setuju). Pimpinan diberi tahu setelah disetujui.</p>')
      : `<div class="small" style="margin-top:6px"><b>${DS_LABEL[k.status] || esc(k.status)}</b>${st} • ${esc(k.oleh)} • ${esc(k.waktuPutus)}${k.komentar ? '<br><i>“' + esc(k.komentar) + '”</i>' : ''}</div>`}
  </div>`;
}
async function dsBukti(did){
  const box = $('dsb-' + did); if(!box) return; box.innerHTML = '<span class="small">Memuat foto...</span>';
  try{
    const r = await pkApi({a:'ds_foto', token:pkToken, did});
    if(r.expired){ pkExpired(); return; }
    if(!r.ok){ box.innerHTML = `<div class="err">${esc(r.msg)}</div>`; return; }
    const img = document.createElement('img'); img.src = r.data; img.alt = 'Bukti pendukung';
    img.style.cssText = 'max-width:100%;border-radius:10px;margin-top:6px;border:1px solid #b9d2f0';
    box.innerHTML = ''; box.appendChild(img);
  }catch(e){ box.innerHTML = '<div class="err">Gagal memuat foto.</div>'; }
}
function dsCariIsi(){
  dsPilihNik = ''; $('dsInfo').style.display = 'none';
  const q = ($('dsCari').value || '').trim().toLowerCase(), box = $('dsSaran');
  if(!q){ box.innerHTML = ''; return; }
  const hit = dsKandidat.filter(p => String(p.nama).toLowerCase().indexOf(q) >= 0 || String(p.nik).indexOf(q) >= 0).slice(0, 8);
  const tdk = hit.length ? [] : dsTidak.filter(p => String(p.nama).toLowerCase().indexOf(q) >= 0 || String(p.nik).indexOf(q) >= 0).slice(0, 5);
  box.innerHTML = hit.length ? hit.map(p => `<div class="small" style="padding:10px;border:1px solid #b9d2f0;border-radius:8px;margin:4px 0;background:#fff;cursor:pointer" onclick="dsPilih('${esc(p.nik)}')"><b>${esc(p.nama)}</b> • NIK ${esc(p.nik)}<br>${dsTabAktif === 'LIMIT' ? 'Limit ' + pkRp(p.limitAsli) + ' → ' + pkRp(p.limitBaru) + ' • tenor ' + p.tenorAsli + ' → ' + p.tenorBaru + ' bln' : 'Lunas ' + tglf(p.lunas) + ' • masa tunggu s.d. ' + tglf(p.boleh)}</div>`).join('') : (tdk.length ? tdk.map(p => `<div class="small" style="padding:10px;border:1px solid #f5c2c2;border-radius:8px;margin:4px 0;background:#fff5f5"><b>${esc(p.nama)}</b> • NIK ${esc(p.nik)}<br>❌ Belum bisa dibuka: ${esc(p.msg)}</div>`).join('') : '<p class="small">Tidak ada anggota yang memenuhi syarat dengan nama itu.</p>');
}
function dsPilih(nik){
  const x = dsKandidat.filter(p => p.nik === nik)[0]; if(!x) return;
  dsPilihNik = nik; $('dsCari').value = x.nama; $('dsSaran').innerHTML = '';
  const b = $('dsInfo'); b.style.display = 'block';
  b.innerHTML = dsTabAktif === 'LIMIT'
    ? `<b>${esc(x.nama)}</b> (NIK ${esc(x.nik)})${x.lunas ? '<br><span class="small">Pinjaman terakhir lunas ' + tglf(x.lunas) + '</span>' : ''}
    <div style="font-size:16px;font-weight:800;margin-top:6px">Limit: ${pkRp(x.limitAsli)} → <span style="color:#16a34a">${pkRp(x.limitBaru)}</span> <span class="small">(+${pkRp(x.tambahan)})</span></div>
    <div class="small">Tenor maks ${x.tenorAsli} → <b>${x.tenorBaru} bulan</b> • pokok angsuran tetap ${pkRp(500000)} per bulan</div>
    ${disiplinHtml(x.disiplin)}<div class="small">Setelah anggota mengisi dan ketiga pengurus setuju, dispensasi berlaku 14 hari dan hanya sekali pakai.</div>`
    : `<b>${esc(x.nama)}</b> (NIK ${esc(x.nik)})<br><span class="small">Pinjaman terakhir lunas ${tglf(x.lunas)} • masa tunggu berakhir ${tglf(x.boleh)}</span>
    <div style="margin-top:6px">Masa tunggu dilewati: <b>${x.bulan} bulan</b> × ${pkRp(500000)} = <b style="color:#b91c1c">potongan ${pkRp(x.potongan)}</b></div>
    <div style="font-size:16px;font-weight:800;margin-top:2px">Limit: ${pkRp(x.limitAsli)} → <span style="color:#16a34a">${pkRp(x.limitBaru)}</span> <span class="small">(tenor maks ${x.maxTenor} bln)</span></div>
    ${disiplinHtml(x.disiplin)}<div class="small">Setelah anggota mengisi dan ketiga pengurus setuju, dispensasi berlaku 14 hari dan hanya sekali pakai. Angka bulan dihitung ulang saat disetujui.</div>`;
}
function dsAksesKartu(k){
  const did = esc(k.did);
  return `<div class="ok" style="background:#fff;margin-bottom:10px" id="dsa-${did}"><b>${esc(k.nama)}</b> <span class="small">(NIK ${esc(k.nik)})</span><br>
    <span class="small">Dibuka oleh ${esc(k.pengaju)} • berlaku sampai <b>${tglf(k.berlaku)}</b> • ${k.jenis === 'LIMIT' ? 'bila disetujui limit naik satu tingkat' + (k.limitInfo ? ' (' + pkRp(k.limitInfo.limitAsli) + ' → ' + pkRp(k.limitInfo.limitBaru) + ')' : '') : 'bila disetujui limit dipotong ' + pkRp(k.potongan) + ' (' + k.bulan + ' bulan)'}</span>
    <div style="margin-top:6px"><button class="btn" style="background:#6b7280;padding:8px 12px;font-size:13px" onclick="dsTutup('${did}')">Tutup akses</button></div></div>`;
}
async function dsBuka(){
  if(!dsPilihNik){ alert('Pilih anggota terlebih dahulu.'); return; }
  const x = dsKandidat.filter(p => p.nik === dsPilihNik)[0] || {};
  if(!await dialogKonfirmasi('Buka menu ' + dsNamaTab() + ' untuk ' + (x.nama || '') + '?\n\nAnggota akan mengisi formulirnya sendiri. ' + (dsTabAktif === 'LIMIT' ? 'Bila nanti disetujui, limit naik satu tingkat menjadi ' + pkRp(x.limitBaru) + '.' : 'Bila nanti disetujui, limit dipotong ' + pkRp(x.potongan) + '.'))) return;
  const b = $('dsKirim'); b.disabled = true;
  try{
    const r = await pkApi({a:'ds_buka', token:pkToken, nik:dsPilihNik, jenis:dsTabAktif});
    if(r.expired){ pkExpired(); return; }
    alert(r.ok ? r.msg : '❌ ' + r.msg);
    if(r.ok){ $('dsCari').value = ''; dsPilihNik = ''; $('dsInfo').style.display = 'none'; }
  }catch(e){ alert('Gagal terhubung ke server.'); }
  b.disabled = false; dsMuat();
}
async function dsTutup(did){
  if(!await dialogKonfirmasi('Tutup akses dispensasi ini? Anggota tidak bisa lagi mengisi formulirnya.')) return;
  try{
    const r = await pkApi({a:'ds_tutup', token:pkToken, did});
    if(r.expired){ pkExpired(); return; }
    alert(r.ok ? r.msg : '❌ ' + r.msg);
  }catch(e){ alert('Gagal terhubung ke server.'); }
  dsMuat();
}
async function dsPutus(did, v, nama){
  const kom = ($('dsK-' + did).value || '').trim();
  if(v === 'N' && !kom){ alert('Alasan penolakan wajib diisi.'); return; }
  if(!await dialogKonfirmasi((v === 'Y' ? 'Setujui ' + dsNamaTab().toLowerCase() + ' untuk ' + nama + '?' : 'Tolak ' + dsNamaTab().toLowerCase() + ' untuk ' + nama + '?') + '\n\nLanjutkan?')) return;
  document.querySelectorAll('#ds-' + did + ' button').forEach(b => b.disabled = true);
  try{
    const r = await pkApi({a:'ds_putus', token:pkToken, did, v, komentar:kom});
    if(r.expired){ pkExpired(); return; }
    alert(r.ok ? r.msg : '❌ ' + r.msg);
  }catch(e){ alert('Gagal terhubung ke server.'); }
  dsMuat();
}
/* --- sisi anggota --- */
function renderDisiplinAnggota(){
  const ak = dataSaya.dsAkses, tl = $('tlDispensasi');
  if(tl){ tl.style.display = ak ? '' : 'none'; if(ak && $('tlDispensasiNama')) $('tlDispensasiNama').innerText = ak.jenis === 'LIMIT' ? 'Dispensasi Limit Pinjaman' : 'Dispensasi Masa Tunggu'; $('tlDispensasiSub').innerText = ak ? (ak.status === 'MENUNGGU' ? 'Menunggu keputusan pengurus' : 'Dibuka pengurus — isi formulir s.d. ' + tglf(ak.berlaku)) : ''; const pb = $('pbDispAng'); if(pb){ pb.innerText = ak && ak.status === 'DIBUKA' ? '1' : ''; pb.style.display = ak && ak.status === 'DIBUKA' ? 'block' : 'none'; } }
  const dp = dataSaya.disiplin, ds = dataSaya.dispensasi, b = $('mnDisiplin'), f = $('dispBox');
  const html = (dp && dp.pinjaman ? `<div style="font-weight:800;color:#134e8a">📊 Disiplin Pembayaran Anda</div>` + disiplinHtml(dp, true) : '');
  const info = ds ? (ds.jenis === 'LIMIT' ? `<div class="ok" style="margin:8px 0">🎟️ <b>Dispensasi limit pinjaman aktif</b> sampai <b>${tglf(ds.berlaku)}</b> (sekali pakai). Limit Anda naik satu tingkat: maksimal <b>${rpf(ds.maxNominal)}</b>, tenor maks ${ds.maxTenor} bulan.</div>` : `<div class="ok" style="margin:8px 0">🎟️ <b>Dispensasi masa tunggu aktif</b> sampai <b>${tglf(ds.berlaku)}</b> (sekali pakai). Limit Anda dipotong ${ds.bulan} bulan × Rp 500.000 = ${rpf(ds.potongan)} sehingga maksimal <b>${rpf(ds.maxNominal)}</b>.</div>`) : '';
  if(b){ b.style.display = (info || html) ? 'block' : 'none'; b.innerHTML = info + html; }
  if(f) f.innerHTML = info + html;
}

let dsmFotoData = '';
function renderDispensasiAng(){
  const ak = dataSaya.dsAkses, info = $('dsmInfo'), form = $('dsmForm'); if(!info) return;
  if(!ak){ info.innerHTML = 'Menu ini hanya tersedia bila pengurus telah membukanya untuk Anda.'; form.style.display = 'none'; return; }
  if(ak.status === 'MENUNGGU'){
    form.style.display = 'none';
    info.innerHTML = `<div class="ok">⏳ <b>Permohonan Anda sedang menunggu keputusan</b> ketiga pengurus (Penasehat, Ketua, Bendahara).<br>Alasan: ${esc(ak.alasanTeks)}<br><i>${esc(ak.uraian)}</i></div><p class="small">Anda akan menerima pemberitahuan setelah diputuskan.</p>`;
    return;
  }
  if(!ak.syarat){ form.style.display = 'none'; info.innerHTML = `<div class="err">${esc(ak.pesan || 'Syarat dispensasi tidak lagi terpenuhi. Hubungi pengurus.')}</div>`; return; }
  const s = ak.syarat, lm = ak.jenis === 'LIMIT'; form.style.display = 'block';
  if($('dsmJudul')) $('dsmJudul').innerText = lm ? '🎟️ Dispensasi Limit Pinjaman' : '🎟️ Dispensasi Masa Tunggu';
  info.innerHTML = `<div class="ok">Pengurus (${esc(ak.dibukaOleh)}) telah membuka menu ini untuk Anda. Isi formulir sebelum <b>${tglf(ak.berlaku)}</b>.</div>` + (lm
    ? `<p class="small" style="margin:8px 0">Dispensasi limit memungkinkan Anda meminjam <b>lebih besar dari limit masa kerja Anda</b>, dengan ketentuan:</p>
    <ul class="small" style="margin:4px 0 8px 18px"><li>Limit Anda naik <b>satu tingkat</b>: dari ${rpf(s.limitAsli)} menjadi <b>${rpf(s.limitBaru)}</b>, dan tenor maksimal dari ${s.tenorAsli} menjadi <b>${s.tenorBaru} bulan</b>. Angsuran pokok tetap Rp 500.000 per bulan.</li><li>Harus disetujui <b>ketiga pengurus</b>. Bila disetujui, berlaku <b>14 hari</b> dan hanya sekali pakai. Dispensasi limit hanya dapat dipakai satu kali dalam 12 bulan.</li><li>Pengajuan pinjamannya tetap direview pengurus dan diputuskan pimpinan seperti biasa.</li><li>Riwayat disiplin pembayaran Anda menjadi bahan pertimbangan.</li></ul>`
    : `<p class="small" style="margin:8px 0">Pinjaman terakhir Anda lunas ${tglf(s.lunas)}; masa tunggu berakhir ${tglf(s.boleh)}. Dispensasi berarti Anda boleh mengajukan sebelum masa tunggu berakhir, dengan ketentuan:</p>
    <ul class="small" style="margin:4px 0 8px 18px"><li>Limit pinjaman <b>dipotong Rp 500.000 untuk setiap bulan masa tunggu yang dilewati</b>: ${s.bulan} bulan × Rp 500.000 = <b>${rpf(s.potongan)}</b>. Limit Anda menjadi <b>${rpf(s.limitBaru)}</b> (dari ${rpf(s.limitAsli)}).</li><li>Harus disetujui <b>ketiga pengurus</b>. Bila disetujui, berlaku <b>14 hari</b> dan hanya sekali pakai.</li><li>Pengajuan pinjamannya tetap direview pengurus dan diputuskan pimpinan seperti biasa.</li><li>Riwayat disiplin pembayaran Anda menjadi bahan pertimbangan.</li></ul>`);
}
async function dsmPilihFoto(input){
  const f = input.files && input.files[0]; if(!f) return;
  try{ dsmFotoData = await kompres(f); $('dsmPreview').src = dsmFotoData; $('dsmPreviewWrap').style.display = 'block'; }catch(e){ alert(e.message); }
  input.value = '';
}
function dsmHapusFoto(){ dsmFotoData = ''; $('dsmPreviewWrap').style.display = 'none'; $('dsmPreview').removeAttribute('src'); }
async function dsmKirim(){
  const u = $('dsmUraian').value.trim();
  if(u.length < 30){ alert('Tuliskan uraian dengan jelas (minimal 30 huruf).'); return; }
  if(!dsmFotoData){ alert('Lampirkan foto bukti pendukung (ambil foto atau pilih dari galeri).'); return; }
  if(!await dialogKonfirmasi('Kirim permohonan ' + ((dataSaya.dsAkses && dataSaya.dsAkses.jenis === 'LIMIT') ? 'dispensasi limit pinjaman' : 'dispensasi masa tunggu') + '?\nPermohonan harus disetujui ketiga pengurus.\n\nKeterangan yang Anda isi harus benar dan dapat dipertanggungjawabkan.')) return;
  const btn = $('btnDsm'); btn.disabled = true; btn.innerText = 'Mengirim...';
  try{
    const r = await apiPost({a:'ds_saya_ajukan', nik:anggotaAktif.nik, atoken:anggotaAktif.atoken, alasan:$('dsmAlasan').value, uraian:u, foto:dsmFotoData});
    if(r.ok){ alert('✅ ' + r.msg); dsmHapusFoto(); $('dsmUraian').value = ''; await muatData(); renderDispensasiAng(); }
    else alert('❌ ' + r.msg);
  }catch(e){ alert('Gagal mengirim. Periksa koneksi lalu coba lagi.'); }
  btn.disabled = false; btn.innerText = 'Kirim Permohonan';
}
