// Menu pengurus: ingatkan via WA, dasbor & grafik, database anggota, laporan & ekspor (Excel / PDF)

/* ===== util ===== */
const waNo = x => { let n = String(x || '').split(/[,;\/]/)[0].replace(/\D/g, ''); if(n.indexOf('62') !== 0 && n[0] === '0') n = '62' + n.slice(1); else if(n.indexOf('62') !== 0 && n[0] === '8') n = '62' + n; return /^628\d{7,12}$/.test(n) ? n : ''; };
function waTagih(hp, nama, ke, jumlah, due, telat, kasbon){
  const no = waNo(hp); if(!no) return '';
  const apa = kasbon ? 'pelunasan kasbon' : 'angsuran ke-' + ke;
  const kapan = telat > 0 ? 'sudah lewat jatuh tempo ' + telat + ' hari (jatuh tempo ' + pkTgl(due) + ')' : 'jatuh tempo ' + pkTgl(due);
  const t = `Assalamualaikum ${nama}, pengingat dari Koperasi Intisel: ${apa} sebesar ${pkRp(jumlah)} ${kapan}. Mohon dibayar paling lambat tanggal 5. Jika sudah membayar, mohon laporkan bukti transfer di aplikasi. Terima kasih.`;
  return 'https://wa.me/' + no + '?text=' + encodeURIComponent(t);
}
const waBtn = (url, label) => url
  ? `<a href="${url}" target="_blank" rel="noopener" style="display:inline-block;text-decoration:none;background:#16a34a;color:#fff;font-weight:800;padding:8px 12px;border-radius:10px;font-size:13px">💬 ${label || 'Ingatkan via WA'}</a>`
  : '<span class="small" style="color:#b42318">No. HP anggota tidak tersedia</span>';
function pkIngatkan(p){ // dipakai kartu pinjaman berjalan
  if(!p.berikut) return '';
  const telat = p.berikut.due < pkHariIni ? Math.round((new Date(pkHariIni) - new Date(p.berikut.due)) / 864e5) : 0;
  const dekat = (new Date(p.berikut.due) - new Date(pkHariIni)) / 864e5 <= 3;
  if(!telat && !dekat) return '';
  return `<div style="margin:8px 0">${waBtn(waTagih(p.hp, p.nama, p.berikut.ke, p.berikut.jumlah, p.berikut.due, telat, p.jenis === 'KASBON'), telat ? 'Tagih via WA' : 'Ingatkan via WA')}</div>`;
}

/* ===== DASBOR & GRAFIK ===== */
const juta = n => (n / 1e6).toLocaleString('id-ID', {maximumFractionDigits: 1}) + ' jt';
function svgBar(judul, bulan, seri){ // seri: [{key,warna,nama}] batang berkelompok, label nilai di atas batang
  const W = 340, H = 170, pl = 6, pb = 24, pt = 18, n = bulan.length, gw = (W - pl * 2) / n, bw = Math.min(22, (gw - 6) / seri.length);
  const mx = Math.max(1, ...bulan.flatMap(b => seri.map(s => b[s.key]))), ch = H - pb - pt;
  let g = '';
  bulan.forEach((b, i) => {
    seri.forEach((s, j) => {
      const v = b[s.key], h = Math.round(v / mx * ch), x = pl + i * gw + (gw - bw * seri.length) / 2 + j * bw, y = H - pb - h;
      g += `<rect x="${x}" y="${y}" width="${bw - 2}" height="${Math.max(h, v > 0 ? 1 : 0)}" rx="3" fill="${s.warna}"></rect>`;
      if(v > 0) g += `<text x="${x + (bw - 2) / 2}" y="${y - 3}" text-anchor="middle" font-size="9" fill="#334">${s.fmt ? s.fmt(v) : v}</text>`;
    });
    g += `<text x="${pl + i * gw + gw / 2}" y="${H - 8}" text-anchor="middle" font-size="10" fill="#5a7aa0">${esc(b.label)}</text>`;
  });
  const leg = seri.map(s => `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px"><i style="width:10px;height:10px;border-radius:3px;background:${s.warna};display:inline-block"></i>${esc(s.nama)}</span>`).join('');
  return `<div style="margin:14px 0 4px"><b class="small" style="font-size:13px">${esc(judul)}</b></div><div class="small" style="margin-bottom:2px">${leg}</div>
    <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(judul)}" style="background:#fff;border:1px solid #d6e6f8;border-radius:12px"><line x1="${pl}" x2="${W - pl}" y1="${H - pb}" y2="${H - pb}" stroke="#c9d8ea"></line>${g}</svg>`;
}
const STATUS_URUT = [['REVIEW_PENGURUS', 'Review pengurus', '#f59e0b'], ['MENUNGGU_PIMPINAN', 'Menunggu pimpinan', '#f97316'], ['MENUNGGU_PENCAIRAN', 'Menunggu pencairan', '#0ea5e9'], ['DISETUJUI', 'Berjalan', '#16a34a'], ['LUNAS', 'Lunas', '#64748b'], ['DITOLAK', 'Ditolak', '#dc2626']];
let pkStatData = null, pkDetailAktif = '';
const DETAIL_JUDUL = {REVIEW_PENGURUS:'Direview pengurus', MENUNGGU_PIMPINAN:'Menunggu pimpinan', MENUNGGU_PENCAIRAN:'Menunggu pencairan', DISETUJUI:'Pinjaman berjalan', LUNAS:'Lunas', DITOLAK:'Ditolak', TERLAMBAT:'Angsuran terlambat', BERJALAN_SISA:'Sisa pinjaman beredar'};
async function pkBuka(status, kunci){
  kunci = kunci || status; const box = $('pkDetail');
  if(pkDetailAktif === kunci){ pkDetailAktif = ''; box.innerHTML = ''; document.querySelectorAll('#pkStat .stile').forEach(e => e.classList.remove('on')); return; }
  pkDetailAktif = kunci; document.querySelectorAll('#pkStat .stile').forEach(e => e.classList.toggle('on', e.dataset.k === kunci));
  box.innerHTML = '<div class="ok"><p class="small">Memuat...</p></div>';
  try{
    const r = await pkApi({a:'daftar_status', token:pkToken, status});
    if(r.expired){ pkExpired(); return; }
    if(pkDetailAktif !== kunci) return;
    if(!r.ok){ box.innerHTML = `<div class="err">${esc(r.msg)}</div>`; return; }
    box.innerHTML = `<div class="ok" style="background:#fff"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:15px">${DETAIL_JUDUL[kunci]} (${r.total})</b><span class="back-link" style="margin:0" onclick="pkBuka('${status}','${kunci}')">✕ Tutup</span></div>` +
      (r.list.length ? r.list.map(x => pkDetailBaris(x, status)).join('') : '<p class="small">Tidak ada data.</p>') + (r.total > r.list.length ? `<p class="small">Menampilkan ${r.list.length} dari ${r.total}.</p>` : '') + '</div>';
    box.scrollIntoView({behavior:'smooth', block:'nearest'});
  }catch(e){ box.innerHTML = '<div class="err">Gagal memuat data. Periksa koneksi internet.</div>'; }
}
function pkDetailBaris(x, status){
  const kas = x.jenis === 'KASBON';
  let info = `${pkRp(x.nominal)}${kas ? ' / 30 hari' : ' / ' + x.tenor + ' bln'} • diajukan ${pkTgl(x.waktu)}`, extra = '';
  if(status === 'MENUNGGU_PENCAIRAN') extra = `<div class="small">💸 ${x.pencairan === 'REGULER' ? 'Reguler (tgl 6)' : 'Urgen (maks 2 hari kerja)'} • target <b>${pkTgl(x.target)}</b></div>`;
  if(status === 'DISETUJUI' || status === 'TERLAMBAT'){
    extra = `<div class="small">Sisa <b>${pkRp(x.sisa)}</b> • ${x.lunasKe}/${x.total} lunas${x.tglCair ? ' • cair ' + pkTgl(x.tglCair) : ''}</div>` +
      (x.berikut ? `<div class="small">Berikutnya: ${kas ? 'pelunasan' : 'ke-' + x.berikut.ke}, jatuh tempo ${pkTgl(x.berikut.due)} (${pkRp(x.berikut.jumlah)})${x.telatHari ? ' <b style="color:#b42318">terlambat ' + x.telatHari + ' hari</b>' : ''}</div>` : '');
    if(x.telatHari) extra += `<div style="margin-top:6px">${waBtn(waTagih(x.hp, x.nama, x.berikut.ke, x.berikut.jumlah, x.berikut.due, x.telatHari, kas), 'Tagih via WA')}</div>`;
  }
  if(status === 'LUNAS' && x.tglLunas) extra = `<div class="small">🎉 Lunas ${pkTgl(x.tglLunas)}</div>`;
  if(status === 'DITOLAK' && x.alasan) extra = `<div class="small"><i>“${esc(x.alasan)}”</i></div>`;
  return `<div style="border-bottom:1px solid #d6e6f8;padding:9px 0">${pkBadge(x.jenis)}<b style="font-size:15px">${esc(x.nama)}</b> <span class="small">${esc(x.id)}</span><div class="small">${info}</div>${extra}</div>`;
}
async function pkStatMuat(){
  pkDetailAktif = '';
  $('pkStat').innerHTML = '<p class="small">Memuat...</p>';
  try{
    const r = await pkApi({a:'statistik', token:pkToken});
    if(r.expired){ pkExpired(); return; }
    if(!r.ok){ $('pkStat').innerHTML = `<div class="err">${esc(r.msg)}</div>`; return; }
    pkStatData = r;
    const tiles = [['REVIEW_PENGURUS', 'Direview pengurus', '#d97706'], ['MENUNGGU_PIMPINAN', 'Menunggu pimpinan', '#ea580c'], ['MENUNGGU_PENCAIRAN', 'Menunggu pencairan', '#0369a1'], ['DISETUJUI', 'Pinjaman berjalan', '#15803d'], ['LUNAS', 'Lunas', '#475569'], ['DITOLAK', 'Ditolak', '#b42318']]
      .map(([k, t, w]) => `<button class="stile" data-k="${k}" onclick="pkBuka('${k}')"><span class="num" style="color:${w}">${r.status[k] || 0}</span><span class="lbl">${t}</span><span class="hint">Lihat daftar ›</span></button>`).join('');
    const total = Object.values(r.status).reduce((a, b) => a + b, 0);
    const perhatian = r.perhatian.length ? r.perhatian.map(x => {
      const telat = x.telatHari > 0, url = waTagih(x.hp, x.nama, x.ke, x.jumlah, x.due, x.telatHari, x.jenis === 'KASBON');
      return `<div style="border-bottom:1px solid #d6e6f8;padding:8px 0"><b>${esc(x.nama)}</b> <span class="small">(${esc(x.id)})</span><br>
        <span class="small">${x.jenis === 'KASBON' ? 'Pelunasan kasbon' : 'Angsuran ke-' + x.ke} • ${pkRp(x.jumlah)} • jatuh tempo ${pkTgl(x.due)} ${telat ? '<b style="color:#b42318">terlambat ' + x.telatHari + ' hari</b>' : x.sisaHari === 0 ? '<b style="color:#8a6100">hari ini</b>' : '<b style="color:#8a6100">' + x.sisaHari + ' hari lagi</b>'}</span><div style="margin-top:6px">${waBtn(url, telat ? 'Tagih via WA' : 'Ingatkan via WA')}</div></div>`;
    }).join('') : '<p class="small">Tidak ada angsuran yang terlambat atau jatuh tempo dalam 3 hari. ✅</p>';
    $('pkStat').innerHTML = `
      <b style="font-size:15px">Ringkasan</b><span class="small"> • ${total} pengajuan (${r.jenis.KOPERASI} koperasi, ${r.jenis.KASBON} kasbon). Ketuk kotak untuk melihat datanya.</span>
      <div class="mgrid" style="margin-top:8px">${tiles}
        <button class="stile wide" data-k="BERJALAN_SISA" onclick="pkBuka('DISETUJUI','BERJALAN_SISA')"><span class="num" style="font-size:26px;color:#134e8a">${pkRp(r.sisaBeredar)}</span><span class="lbl">Sisa pinjaman beredar</span><span class="hint">Lihat daftar ›</span></button>
        <button class="stile wide" data-k="TERLAMBAT" onclick="pkBuka('TERLAMBAT')" style="${r.terlambat.n ? 'border-color:#e74c3c' : ''}"><span class="num" style="font-size:26px;color:${r.terlambat.n ? '#b42318' : '#15803d'}">${r.terlambat.n} angsuran</span><span class="lbl">Terlambat • ${pkRp(r.terlambat.total)}</span><span class="hint">${r.terlambat.n ? 'Lihat daftar & tagih ›' : 'Tidak ada tunggakan ✅'}</span></button></div>
      <div id="pkDetail" style="margin-top:10px"></div>
      ${svgBar('Dana dicairkan vs angsuran masuk (6 bulan)', r.bulan, [{key:'cair', warna:'#134e8a', nama:'Dicairkan', fmt:juta}, {key:'angsuran', warna:'#16a34a', nama:'Angsuran masuk', fmt:juta}])}
      ${svgBar('Jumlah pengajuan per bulan', r.bulan, [{key:'pengajuan', warna:'#0ea5e9', nama:'Diajukan'}, {key:'disetujui', warna:'#f59e0b', nama:'Dicairkan'}])}
      <div style="margin:16px 0 4px"><b style="font-size:14px">⚠️ Perlu perhatian (terlambat / jatuh tempo ≤ 3 hari)</b></div>${perhatian}`;
  }catch(e){ $('pkStat').innerHTML = '<div class="err">Gagal memuat data. Periksa koneksi internet.</div>'; }
}

/* ===== DATABASE ANGGOTA ===== */
let agData = [];
async function agMuat(){
  $('agList').innerHTML = '<p class="small">Memuat...</p>'; $('agInfo').innerText = '';
  try{
    const r = await pkApi({a:'anggota_db', token:pkToken});
    if(r.expired){ pkExpired(); return; }
    if(!r.ok){ $('agList').innerHTML = `<div class="err">${esc(r.msg)}</div>`; return; }
    agData = r.list; agRender();
  }catch(e){ $('agList').innerHTML = '<div class="err">Gagal memuat data. Periksa koneksi internet.</div>'; }
}
function agRender(){
  const q = $('agCari').value.trim().toLowerCase(), f = $('agFilter').value;
  const L = agData.filter(a => (!q || (a.nama + ' ' + a.nik + ' ' + a.jabatan + ' ' + a.base).toLowerCase().includes(q)) &&
    (!f || (f === 'berjalan' ? a.berjalan : f === 'terlambat' ? a.berjalan && a.berjalan.terlambat > 0 : f === 'proses' ? a.proses : a.layanan === f)));
  const MAX = 80;
  $('agInfo').innerText = `${L.length} dari ${agData.length} anggota` + (L.length > MAX ? ` • menampilkan ${MAX} pertama, gunakan pencarian` : '');
  $('agList').innerHTML = L.slice(0, MAX).map(a => {
    const tags = `<span class="tag">${a.layanan}</span>` + (a.berjalan ? `<span class="tag ${a.berjalan.terlambat ? 'r' : 'w'}">Berjalan • sisa ${pkRp(a.berjalan.sisa)}${a.berjalan.terlambat ? ' • terlambat' : ''}</span>` : '') +
      (a.proses ? `<span class="tag">${esc(pkLabel[a.proses.status] || a.proses.status)}</span>` : '') + (a.lunas ? `<span class="tag g">${a.lunas}× lunas</span>` : '');
    const rw = a.riwayat.length ? a.riwayat.map(x => `<div class="small" style="margin-top:3px">${pkBadge(x.jenis)}${esc(x.id)} • ${pkTgl(x.waktu)} • ${pkRp(x.nominal)}${x.jenis === 'KASBON' ? '' : ' / ' + x.tenor + ' bln'} • <b>${esc(pkLabel[x.status] || x.status)}</b></div>`).join('') : '<div class="small" style="margin-top:3px">Belum pernah mengajukan.</div>';
    return `<details class="agr"><summary><b>${esc(a.nama)}</b> <span class="small">• NIK ${esc(a.nik)}</span><br><span class="small">${esc(a.jabatan)}${a.base ? ' • ' + esc(a.base) : ''}</span><div>${tags}</div></summary>
      <div style="margin:6px 0 2px"><div class="small">Masuk kerja: <b>${pkTgl(a.tglMasuk)}</b> • masa kerja <b>${a.masaKerja} tahun</b> • total pengajuan <b>${a.jumlah}</b></div>${rw}</div></details>`;
  }).join('') || '<p class="small">Tidak ada anggota yang cocok.</p>';
}

/* ===== LAPORAN & EKSPOR ===== */
let lpData = null;
const isoLokal = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
function lpInit(){
  if(!$('lpSampai').value){ lpPreset('bulan', true); }
  pkMuat();
}
function lpPreset(k, diam){
  const t = new Date(pkHariIni || isoLokal(new Date()) + 'T00:00:00'), y = t.getFullYear(), m = t.getMonth();
  const dari = k === 'bulan' ? new Date(y, m, 1) : k === '3bulan' ? new Date(y, m - 2, 1) : new Date(y, 0, 1);
  $('lpDari').value = isoLokal(dari); $('lpSampai').value = isoLokal(t); lpStale();
}
function lpStale(){ lpData = null; $('lpHasil').classList.add('hidden'); pkPesan('', false, 'lpPesan'); }
async function lpMuat(){
  const dari = $('lpDari').value, sampai = $('lpSampai').value;
  if(!dari || !sampai){ pkPesan('Isi tanggal dari dan sampai.', true, 'lpPesan'); return false; }
  const b = $('lpBtn'); b.disabled = true; b.innerText = 'Memuat...';
  try{
    const r = await pkApi({a:'laporan_keu', token:pkToken, dari, sampai});
    if(r.expired){ pkExpired(); return false; }
    if(!r.ok){ pkPesan(r.msg, true, 'lpPesan'); return false; }
    lpData = r; lpTampil(); return true;
  }catch(e){ pkPesan('Gagal terhubung ke server.', true, 'lpPesan'); return false; }
  finally{ b.disabled = false; b.innerText = 'Tampilkan Laporan'; }
}
function lpTampil(){
  const r = lpData, k = r.ringkas;
  $('lpHasil').classList.remove('hidden');
  $('lpRingkas').innerHTML = `<b>Periode ${pkTgl(r.dari)} s.d. ${pkTgl(r.sampai)}</b><div class="stt" style="margin-top:8px">
    <div><b>${k.diajukan}</b><span class="small">Pengajuan</span></div><div><b>${k.ditolak}</b><span class="small">Ditolak</span></div>
    <div><b>${pkRp(k.dicairkanRp)}</b><span class="small">Dicairkan (${k.dicairkanN} pinjaman)</span></div><div><b>${pkRp(k.angsuranMasukRp)}</b><span class="small">Angsuran masuk (${k.angsuranMasukN}×)</span></div>
    <div><b>${pkRp(k.infaqRp)}</b><span class="small">Infaq</span></div><div><b>${pkRp(k.sisaBeredar)}</b><span class="small">Sisa beredar (saat ini)</span></div>
    <div style="grid-column:1/3;${k.tunggakanN ? 'border-color:#e74c3c' : ''}"><b>${k.tunggakanN} angsuran • ${pkRp(k.tunggakanRp)}</b><span class="small">Tunggakan (saat ini)</span></div></div>`;
  $('lpPreview').innerHTML = `<p class="small">Berkas ekspor memuat <b>${r.pengajuan.length}</b> baris pengajuan dan <b>${r.angsuran.length}</b> baris angsuran.</p>`;
}
const ST_TXT = {REVIEW_PENGURUS:'Review pengurus', MENUNGGU_PIMPINAN:'Menunggu pimpinan', MENUNGGU_PENCAIRAN:'Menunggu pencairan', DISETUJUI:'Berjalan', LUNAS:'Lunas', DITOLAK:'Ditolak', BELUM:'Belum bayar'};
function lpTabel(){ // data tabular untuk Excel & cetak
  const r = lpData, k = r.ringkas;
  return {
    ringkas: [['Laporan Koperasi Intisel Lampung Syariah', ''], ['Periode', pkTgl(r.dari) + ' s.d. ' + pkTgl(r.sampai)], ['Dibuat', r.dibuat + ' oleh ' + r.oleh], ['', ''],
      ['Pengajuan masuk', k.diajukan], ['Pengajuan ditolak', k.ditolak], ['Pengajuan masih diproses', k.diproses], ['Pinjaman dicairkan (jumlah)', k.dicairkanN], ['Total dana dicairkan (Rp)', k.dicairkanRp],
      ['Infaq (Rp)', k.infaqRp], ['Angsuran diterima (kali)', k.angsuranMasukN], ['Angsuran diterima (Rp)', k.angsuranMasukRp], ['Sisa pinjaman beredar saat ini (Rp)', k.sisaBeredar],
      ['Tunggakan saat ini (jumlah angsuran)', k.tunggakanN], ['Tunggakan saat ini (Rp)', k.tunggakanRp]],
    pengajuan: [['No. Pengajuan', 'Tanggal', 'Nama', 'NIK', 'Jenis', 'Nominal (Rp)', 'Tenor (bln)', 'Infaq (Rp)', 'Status', 'Jenis Pencairan', 'Tgl Dicairkan']]
      .concat(r.pengajuan.map(p => [p.id, pkTgl(p.tgl), p.nama, p.nik, p.jenis, p.nominal, p.tenor || '', p.infaq || 0, ST_TXT[p.status] || p.status, p.pencairan === 'REGULER' ? 'Reguler (tgl 6)' : p.pencairan === 'URGEN' ? 'Urgen' : '', p.tglCair ? pkTgl(p.tglCair) : ''])),
    angsuran: [['No. Pengajuan', 'Nama', 'NIK', 'Angsuran ke', 'Jatuh Tempo', 'Jumlah (Rp)', 'Status', 'Tgl Bayar']]
      .concat(r.angsuran.map(a => [a.id, a.nama, a.nik, a.ke, pkTgl(a.due), a.jumlah, a.status === 'LUNAS' ? 'Lunas' : 'Belum bayar', a.tglBayar ? pkTgl(a.tglBayar) : '']))
  };
}
async function lpExcel(){
  if(!lpData && !(await lpMuat())) return;
  const t = lpTabel();
  const bytes = xlsxBuat([{nama:'Ringkasan', rows:t.ringkas, lebar:[42, 34], tanpaHeader:true}, {nama:'Pengajuan', rows:t.pengajuan, lebar:[18, 12, 26, 12, 10, 14, 10, 12, 20, 16, 14]}, {nama:'Angsuran', rows:t.angsuran, lebar:[18, 26, 12, 11, 13, 14, 12, 13]}]);
  unduh(new Blob([bytes], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), `Laporan-Koperasi-Intisel_${lpData.dari}_${lpData.sampai}.xlsx`);
}
async function lpCetak(){
  if(!lpData && !(await lpMuat())) return;
  const t = lpTabel(), tbl = (rows, head) => '<table>' + (head ? '<tr>' + rows[0].map(c => `<th>${esc(c)}</th>`).join('') + '</tr>' : '') + rows.slice(head ? 1 : 0).map(r => '<tr>' + r.map(c => `<td${typeof c === 'number' ? ' class="n"' : ''}>${typeof c === 'number' ? c.toLocaleString('id-ID') : esc(c)}</td>`).join('') + '</tr>').join('') + '</table>';
  $('cetakArea').innerHTML = `<h2>${esc(t.ringkas[0][0])}</h2><div>${esc(t.ringkas[1][0])}: ${esc(t.ringkas[1][1])} &nbsp;•&nbsp; ${esc(t.ringkas[2][1])}</div>
    <h3>Ringkasan</h3>${tbl(t.ringkas.slice(4), false)}<h3>Daftar Pengajuan (${lpData.pengajuan.length})</h3>${tbl(t.pengajuan, true)}<h3>Daftar Angsuran (${lpData.angsuran.length})</h3>${tbl(t.angsuran, true)}`;
  document.body.classList.add('cetak');
  const bersih = () => { document.body.classList.remove('cetak'); $('cetakArea').innerHTML = ''; window.removeEventListener('afterprint', bersih); };
  window.addEventListener('afterprint', bersih); setTimeout(() => window.print(), 50);
}
function unduh(blob, nama){
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

/* ===== penulis .xlsx minimal (tanpa library, tanpa internet; ZIP tanpa kompresi) ===== */
const CRC_T = (() => { const t = []; for(let n = 0; n < 256; n++){ let c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u8 => { let c = 0xFFFFFFFF; for(let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zipBuat(files){ // files: [{nama, data:Uint8Array}]
  const enc = new TextEncoder(), parts = [], cd = []; let off = 0;
  const w16 = (v, n) => { v.push(n & 255, (n >> 8) & 255); }, w32 = (v, n) => { v.push(n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255); };
  files.forEach(f => {
    const nm = enc.encode(f.nama), crc = crc32(f.data), h = [];
    w32(h, 0x04034b50); w16(h, 20); w16(h, 0x0800); w16(h, 0); w16(h, 0); w16(h, 0x21); w32(h, crc); w32(h, f.data.length); w32(h, f.data.length); w16(h, nm.length); w16(h, 0);
    parts.push(new Uint8Array(h), nm, f.data);
    const c = []; w32(c, 0x02014b50); w16(c, 20); w16(c, 20); w16(c, 0x0800); w16(c, 0); w16(c, 0); w16(c, 0x21); w32(c, crc); w32(c, f.data.length); w32(c, f.data.length); w16(c, nm.length); w16(c, 0); w16(c, 0); w16(c, 0); w16(c, 0); w32(c, 0); w32(c, off);
    cd.push(new Uint8Array(c), nm);
    off += h.length + nm.length + f.data.length;
  });
  let cdLen = 0; cd.forEach(x => cdLen += x.length);
  const e = []; w32(e, 0x06054b50); w16(e, 0); w16(e, 0); w16(e, files.length); w16(e, files.length); w32(e, cdLen); w32(e, off); w16(e, 0);
  const all = parts.concat(cd, [new Uint8Array(e)]); let tot = 0; all.forEach(x => tot += x.length);
  const out = new Uint8Array(tot); let p = 0; all.forEach(x => { out.set(x, p); p += x.length; }); return out;
}
const xe = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const kolom = i => { let s = ''; i++; while(i > 0){ const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
function xlsxBuat(sheets){
  const enc = new TextEncoder(), u = s => enc.encode(s);
  const sheetXml = sh => {
    const rows = sh.rows.map((r, ri) => `<row r="${ri + 1}">` + r.map((c, ci) => {
      const ref = kolom(ci) + (ri + 1), head = ri === 0 && !sh.tanpaHeader, judul = sh.tanpaHeader && ri === 0;
      if(c === '' || c == null) return '';
      if(typeof c === 'number') return `<c r="${ref}" s="2"><v>${c}</v></c>`;
      return `<c r="${ref}" t="inlineStr" s="${head ? 1 : judul ? 3 : 0}"><is><t xml:space="preserve">${xe(c)}</t></is></c>`;
    }).join('') + '</row>').join('');
    const cols = sh.lebar ? '<cols>' + sh.lebar.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('') + '</cols>' : '';
    const pane = sh.tanpaHeader ? '' : '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${pane}${cols}<sheetData>${rows}</sheetData></worksheet>`;
  };
  const n = sheets.length, rid = i => 'rId' + (i + 1);
  const files = [
    {nama:'[Content_Types].xml', data:u(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`)},
    {nama:'_rels/.rels', data:u('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')},
    {nama:'xl/workbook.xml', data:u(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${xe(s.nama).slice(0, 31)}" sheetId="${i + 1}" r:id="${rid(i)}"/>`).join('')}</sheets></workbook>`)},
    {nama:'xl/_rels/workbook.xml.rels', data:u(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s, i) => `<Relationship Id="${rid(i)}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)},
    {nama:'xl/styles.xml', data:u('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="13"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCE9F8"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>')}
  ].concat(sheets.map((s, i) => ({nama:`xl/worksheets/sheet${i + 1}.xml`, data:u(sheetXml(s))})));
  return zipBuat(files);
}
