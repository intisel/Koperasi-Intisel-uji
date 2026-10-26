// Layanan anggota: menu, kasbon, status approval, pinjaman berjalan, laporan pembayaran + foto bukti
let dataSaya = {list: [], laporan: [], bolehKoperasi: '', loaded: false}, fotoData = '';
const VIEW2ROUTE = {vKasbon:'anggota-kasbon', formPinjam:'anggota-koperasi', vApproval:'anggota-approval', vBerjalan:'anggota-berjalan', vBayar:'anggota-bayar', vKontak:'anggota-kontak'};
const ROUTE2VIEW = {'anggota-menu':'menuCard', 'anggota-kasbon':'vKasbon', 'anggota-koperasi':'formPinjam', 'anggota-approval':'vApproval', 'anggota-berjalan':'vBerjalan', 'anggota-bayar':'vBayar', 'anggota-kontak':'vKontak'};
const VIEWS = ['menuCard', 'formPinjam', 'vKasbon', 'vApproval', 'vBerjalan', 'vBayar', 'vKontak'];
const LABEL = {REVIEW_PENGURUS:'⏳ Direview Pengurus', MENUNGGU_PIMPINAN:'⏳ Menunggu Pimpinan', MENUNGGU_PENCAIRAN:'💸 Disetujui - Menunggu Pencairan', DISETUJUI:'✅ Disetujui (berjalan)', LUNAS:'🎉 Lunas', DITOLAK:'❌ Ditolak'};
const LAPLABEL = {MENUNGGU:'⏳ Menunggu verifikasi', DIVERIFIKASI:'✅ Terverifikasi', DITOLAK:'❌ Ditolak'};
const ICON = (v, selesai) => v === 'Y' ? '✅' : v === 'N' ? '❌' : (selesai ? '➖' : '⏳');
const KOMEN = a => a ? `<div style="margin:2px 0 6px 22px;color:#334"><i>“${esc(a)}”</i></div>` : '';
const rpf = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const tglf = s => s ? String(s).split('-').reverse().join('/') : '-';
const hariIniStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const apiPost = async body => (await fetch(API_URL, {method:'POST', body:JSON.stringify(body)})).json();
const badgeJenis = j => j === 'KASBON' ? '<span class="badge" style="background:#fff3cd;color:#8a6100">KASBON</span>' : '<span class="badge">KOPERASI</span>';

/* ===== NAVIGASI (router ada di index.html; tiap layar = 1 entri riwayat) ===== */
function tampilView(v){ // hanya menampilkan layar, tidak mengubah riwayat
  VIEWS.forEach(id => { const el = $(id); if(el) el.style.display = id === v ? 'block' : 'none'; });
  if(v === 'vKasbon') kbUpdate();
  if(v === 'vBayar') renderBayar();
  if(v === 'vKontak') renderKontak();
}
/* ===== KONTAK & BANTUAN ===== */
const KONTAK = [
  {jabatan:'Pimpinan', nama:'Mahmudi', hp:'6281271418883', tampil:'+62 812-7141-8883'},
  {jabatan:'Penasehat', nama:'Akhmad Sofyan', hp:'6281222225985', tampil:'+62 812-2222-5985'},
  {jabatan:'Ketua', nama:'Mulyana', hp:'6285215315314', tampil:'+62 852-1531-5314'},
  {jabatan:'Bendahara', nama:'Vivi Atvilina', hp:'628976099332', tampil:'+62 897-6099-332'}
];
function renderKontak(){
  const a = anggotaAktif, saya = a ? a.nama + ' (NIK ' + a.nik + ')' : '';
  $('kontakList').innerHTML = KONTAK.map(k => {
    const pesan = 'Assalamualaikum ' + k.jabatan + ' ' + k.nama + ', saya ' + saya + ' dari aplikasi Koperasi Intisel. Saya ingin bertanya: ';
    return `<div class="ok" style="background:#fff;margin-bottom:8px;display:flex;align-items:center;gap:10px">
      <div style="flex:1"><div class="small" style="color:#5a7aa0">${esc(k.jabatan)}</div><b>${esc(k.nama)}</b><div class="small" style="white-space:nowrap">${esc(k.tampil)}</div></div>
      <a href="https://wa.me/${k.hp}?text=${encodeURIComponent(pesan)}" target="_blank" rel="noopener" style="text-decoration:none;background:#16a34a;color:#fff;font-weight:800;padding:10px 10px;border-radius:10px;font-size:14px">💬 WA</a>
      <a href="tel:+${k.hp}" style="text-decoration:none;background:#134e8a;color:#fff;padding:10px 12px;border-radius:10px;font-size:14px" aria-label="Telepon ${esc(k.nama)}">📞</a></div>`;
  }).join('');
}
function anggotaRender(name){ // dipanggil router
  if(name === 'anggota'){ resetAnggota(); return; }
  $('loginForm').style.display = 'none'; $('sesiBar').style.display = 'flex';
  tampilView(ROUTE2VIEW[name]);
  muatData().then(terapkanBlokir);
}
function resetAnggota(){ // layar Cek NIK: sesi anggota dibersihkan
  anggotaAktif = null; dataSaya = {list: [], laporan: [], bolehKoperasi: '', loaded: false}; fotoData = '';
  $('nikInput').value = ''; ['lhTgl', 'lhBln', 'lhThn'].forEach(i => $(i).value = '');
  $('hasilCek').innerHTML = ''; $('sesiBar').style.display = 'none'; $('loginForm').style.display = 'block';
  VIEWS.forEach(id => $(id).style.display = 'none');
}
async function bukaMenu(v){
  if(v === 'vKasbon' && $('tlKasbon').classList.contains('off')) { alert('Kasbon khusus karyawan dengan masa kerja di bawah 2 tahun.'); return; }
  if(v === 'formPinjam' && $('tlKoperasi').classList.contains('off')) { alert('Pengajuan Koperasi khusus karyawan dengan masa kerja minimal 2 tahun.'); return; }
  if(v === 'vKasbon' || v === 'formPinjam'){ // cek pinjaman berjalan / pengajuan ganda sebelum membuka formulir
    if(!dataSaya.loaded) await muatData();
    const m = blokir(v === 'vKasbon' ? 'KASBON' : 'KOPERASI');
    if(m){ alert(m); return; }
  }
  go(VIEW2ROUTE[v]);
}
function masukMenu(){
  const a = anggotaAktif, koperasiOk = !limitAktif.notEligible;
  $('mnNama').innerText = 'Pilih Layanan'; $('mnJab').style.display = 'none';
  $('mnMasa').innerText = 'Masa kerja ' + a.masaKerja.toFixed(1) + ' tahun' + (koperasiOk ? ' • Limit koperasi ' + rpf(limitAktif.maxNominal) : ' • belum 2 tahun');
  $('tlKoperasi').classList.toggle('off', !koperasiOk); $('tlKasbon').classList.toggle('off', koperasiOk);
  $('tlKoperasiSub').innerText = koperasiOk ? 'Maks ' + rpf(limitAktif.maxNominal) + ' • ' + limitAktif.maxTenor + ' bln' : 'Khusus masa kerja ≥ 2 tahun';
  $('tlKasbonSub').innerText = koperasiOk ? 'Khusus masa kerja < 2 tahun' : 'Maks Rp 500.000 • 30 hari';
  $('sbNama').innerText = a.nama; $('sbInfo').innerText = 'NIK ' + a.nik + ' • ' + a.jabatan;
  go('anggota-menu');
}
function keluarAnggota(){ // mundur ke layar Cek NIK (sesi dibersihkan oleh router)
  const lv = (typeof ROUTE_LEVEL !== 'undefined' && ROUTE_LEVEL[currentRoute]) || 0;
  if(lv > 0) history.go(-lv); else renderRoute('anggota');
}

/* ===== CEGAH PINJAMAN GANDA ===== */
function blokir(jenis){ // '' bila boleh mengajukan, selain itu pesan alasan
  const L = dataSaya.list, today = hariIniStr();
  const proses = L.find(p => p.status === 'REVIEW_PENGURUS' || p.status === 'MENUNGGU_PIMPINAN');
  const mc = L.find(p => p.status === 'MENUNGGU_PENCAIRAN');
  if(mc) return 'Pengajuan Anda (' + mc.id + ') sudah disetujui dan menunggu pencairan' + (mc.pencairan ? ' (paling lambat ' + tglf(mc.pencairan.target) + ')' : '') + '. Pengajuan baru bisa dilakukan setelah pinjaman dicairkan dan lunas.';
  if(proses) return 'Anda masih memiliki pengajuan yang sedang diproses (' + proses.id + '). Tunggu keputusan pengurus dan pimpinan sebelum mengajukan lagi.';
  const bj = L.find(p => p.status === 'DISETUJUI');
  if(bj) return 'Anda masih memiliki pinjaman berjalan (' + bj.id + ', sisa ' + rpf(bj.angsuran ? bj.angsuran.sisa : 0) + '). Pengajuan baru bisa dilakukan setelah lunas' + (jenis === 'KOPERASI' ? ' dan melewati masa tunggu 3 bulan.' : '.');
  if(jenis === 'KOPERASI' && dataSaya.bolehKoperasi && today < dataSaya.bolehKoperasi) return 'Masa tunggu 3 bulan setelah pelunasan. Pengajuan Koperasi bisa dilakukan mulai ' + tglf(dataSaya.bolehKoperasi) + '.';
  return '';
}
function terapkanBlokir(){
  if(!anggotaAktif) return;
  [['KASBON', 'kbBlok', 'btnKb'], ['KOPERASI', 'kpBlok', 'btnKirim']].forEach(([j, bid, btn]) => {
    const m = blokir(j), el = $(bid);
    el.style.display = m ? 'block' : 'none'; el.innerText = m;
    if(!(j === 'KOPERASI' && limitAktif.notEligible)) $(btn).disabled = !!m;
  });
}

/* ===== DATA SAYA (status, pinjaman, laporan) ===== */
async function muatData(){
  if(!anggotaAktif) return;
  try{
    const r = await apiPost({a:'status', nik:anggotaAktif.nik, lahir:anggotaAktif.lahir});
    if(!r.ok){ $('apBox').innerHTML = `<div class="err">${esc(r.msg)}</div>`; return; }
    dataSaya = {list: r.list || [], laporan: r.laporan || [], bolehKoperasi: r.bolehKoperasi || '', loaded: true};
  }catch(e){ $('apBox').innerHTML = '<div class="err">Gagal memuat data. Periksa koneksi internet.</div>'; return; }
  renderApproval(); renderBerjalan(); renderBayar(); renderSub(); terapkanBlokir();
}
function renderSub(){
  const proses = dataSaya.list.filter(p => p.status === 'REVIEW_PENGURUS' || p.status === 'MENUNGGU_PIMPINAN').length;
  $('tlApprovalSub').innerText = proses ? proses + ' sedang diproses' : 'Koperasi / Kasbon';
  const bj = dataSaya.list.filter(p => p.status === 'DISETUJUI'), sisa = bj.reduce((t, p) => t + (p.angsuran ? p.angsuran.sisa : 0), 0);
  $('tlBerjalanSub').innerText = bj.length ? 'Sisa ' + rpf(sisa) : 'Tidak ada pinjaman berjalan';
  const st = $('mnStatus'), menungguCair = dataSaya.list.find(p => p.status === 'MENUNGGU_PENCAIRAN'), sedangProses = dataSaya.list.find(p => p.status === 'REVIEW_PENGURUS' || p.status === 'MENUNGGU_PIMPINAN');
  let info = '';
  if(bj.length){ const p = bj[0], a = p.angsuran; info = `📌 Pinjaman berjalan <b>${esc(p.id)}</b>: sisa <b>${rpf(sisa)}</b>` + (a && a.berikut ? ` • jatuh tempo berikutnya ${tglf(a.berikut.due)}` : '') + '. Pengajuan baru dapat dilakukan setelah lunas.'; }
  else if(menungguCair) info = `💸 Pengajuan <b>${esc(menungguCair.id)}</b> sudah disetujui, <b>menunggu pencairan</b>` + (menungguCair.pencairan ? ' (paling lambat ' + tglf(menungguCair.pencairan.target) + ')' : '') + '. Pengajuan baru belum dapat dibuat.';
  else if(sedangProses) info = `⏳ Pengajuan <b>${esc(sedangProses.id)}</b> sedang diproses. Pengajuan baru belum dapat dibuat.`;
  else if(dataSaya.bolehKoperasi && hariIniStr() < dataSaya.bolehKoperasi && !limitAktif.notEligible) info = `⏳ Masa tunggu 3 bulan setelah pelunasan. Pengajuan Koperasi bisa dilakukan mulai <b>${tglf(dataSaya.bolehKoperasi)}</b>.`;
  st.style.display = info ? 'block' : 'none'; st.innerHTML = info;
  const tunggu = dataSaya.laporan.filter(l => l.status === 'MENUNGGU').length;
  $('tlBayarSub').innerText = tunggu ? tunggu + ' menunggu verifikasi' : 'Upload foto bukti transaksi';
}
function renderApproval(){
  const L = dataSaya.list;
  $('apBox').innerHTML = L.length ? L.map(p => {
    const selesai = ['DITOLAK', 'MENUNGGU_PENCAIRAN', 'DISETUJUI', 'LUNAS'].includes(p.status), done = p.pengurus.filter(x => x.v === 'Y').length;
    return `<div class="ok" style="margin-bottom:10px;background:#fff">
      ${badgeJenis(p.jenis)} <b>${esc(p.id)}</b> • ${esc(p.waktu)}<br>${rpf(p.nominal)} / ${p.jenis === 'KASBON' ? '30 hari' : p.tenor + ' bln'}<br>
      <b>${LABEL[p.status] || esc(p.status)}</b>
      ${p.pencairan ? `<div class="small" style="margin-top:4px;color:#134e8a">💸 ${esc(p.pencairan.label)}${p.pencairan.tglCair ? '<br>✅ Dicairkan ' + tglf(p.pencairan.tglCair) : ''}</div>` : ''}
      <div class="small" style="margin-top:6px">
        ${p.pengurus.map(x => `<div>${ICON(x.v, selesai)} ${esc(x.nama)}</div>${KOMEN(x.a)}`).join('')}
        ${p.status === 'REVIEW_PENGURUS' ? '<div>Review pengurus: ' + done + '/3</div>' : ''}
        ${p.status !== 'REVIEW_PENGURUS' ? `<div>${ICON(p.pimpinan, selesai)} ${esc(p.pimpinanNama || 'Pimpinan')} (Pimpinan)</div>${KOMEN(p.pimpinanA)}` : ''}
      </div></div>`;
  }).join('') : '<p class="small">Belum ada pengajuan. Pilih Pengajuan Kasbon atau Pengajuan Koperasi di menu.</p>';
}
function jadwalTabel(a){
  const today = hariIniStr();
  return `<table class="small" style="margin-top:6px;border-collapse:collapse"><tr style="color:#5a7aa0"><td>Ke</td><td>Jatuh tempo</td><td>Jumlah</td><td>Status</td></tr>` +
    a.jadwal.map(j => `<tr><td style="padding:2px 8px 2px 0">${j.ke}</td><td style="padding:2px 8px 2px 0">${tglf(j.due)}</td><td style="padding:2px 8px 2px 0">${rpf(j.jumlah)}</td>
      <td>${j.status === 'LUNAS' ? '✅ ' + tglf(j.tglBayar) : (j.due < today ? '<span style="color:#c0392b">⚠️ terlambat</span>' : '⏳')}</td></tr>`).join('') + '</table>';
}
function renderBerjalan(){
  const bj = dataSaya.list.filter(p => p.status === 'DISETUJUI' && p.angsuran);
  const lunas = dataSaya.list.filter(p => p.status === 'LUNAS');
  let h = bj.length ? bj.map(p => {
    const a = p.angsuran, persen = a.total ? Math.round(a.lunas / a.total * 100) : 0, telat = a.terlambat > 0;
    return `<div class="ok" style="background:#fff;margin-bottom:10px${telat ? ';border-color:#e74c3c' : ''}">
      ${badgeJenis(p.jenis)} <b>${esc(p.id)}</b>${telat ? ' <span style="color:#c0392b;font-weight:800">⚠️ TERLAMBAT</span>' : ''}<br>
      <span class="small">${rpf(p.nominal)} • ${p.jenis === 'KASBON' ? '30 hari' : p.tenor + ' bulan'}</span>
      <div style="background:#d6e6f8;border-radius:8px;height:10px;margin:8px 0 4px;overflow:hidden"><div style="width:${persen}%;height:100%;background:#16a34a"></div></div>
      <div class="small"><b>${a.lunas}/${a.total} lunas</b> • sisa ${rpf(a.sisa)}${a.berikut ? '<br>Berikutnya: ke-' + a.berikut.ke + ', jatuh tempo <b>' + tglf(a.berikut.due) + '</b> (' + rpf(a.berikut.jumlah) + ')' : ''}</div>
      <button class="btn" style="margin-top:10px;padding:12px;font-size:14px" onclick="goReplace('anggota-bayar')">🧾 Lapor Pembayaran</button>
      <details style="margin-top:8px"><summary class="small" style="cursor:pointer;color:#134e8a;font-weight:700">Jadwal angsuran</summary>${jadwalTabel(a)}</details>
    </div>`;
  }).join('') : '<p class="small">Tidak ada pinjaman yang sedang berjalan.</p>';
  if(lunas.length) h += '<div style="font-weight:800;margin-top:14px">Sudah lunas</div>' + lunas.map(p => `<div class="small" style="padding:6px 0;border-bottom:1px solid #d6e6f8">🎉 ${badgeJenis(p.jenis)} ${esc(p.id)} • ${rpf(p.nominal)} • lunas ${tglf(p.tglLunas)}</div>`).join('');
  $('bjBox').innerHTML = h;
}

/* ===== KASBON ===== */
function kbUpdate(){
  const n = parseInt($('kbNominal').value, 10); $('kbNomTxt').innerText = rpf(n);
  const d = new Date(Date.now() + 30 * 864e5); $('kbTempo').innerText = d.toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) + ' (30 hari)';
}
async function kirimKasbon(){
  if(!anggotaAktif){ alert('Masuk dulu'); return; }
  if(!validasiForm($('vKasbon'))) return;
  const g = id => $(id).value.trim();
  if(!g('kbAlasan') || !g('kbAlamat') || !g('kbGajiUnder') || !g('kbNamaD') || !g('kbHub')){ alert('Semua kolom wajib diisi.'); return; }
  if(!$('kbSetuju').checked){ alert('Centang pernyataan persetujuan dulu'); return; }
  const d = {a:'ajukan', jenis:'KASBON', nik:anggotaAktif.nik, lahir:anggotaAktif.lahir, nominal:parseInt($('kbNominal').value, 10), tenor:1,
    alasan:g('kbAlasan'), alamat:g('kbAlamat'), hp:g('kbHp'), email:g('kbEmail'), rek:onlyDigits(g('kbRek')), gajiUnder:g('kbGajiUnder'), gaji1:moneyVal('kbGaji1'),
    namaDarurat:g('kbNamaD'), hpDarurat:g('kbHpD'), hubungan:g('kbHub')};
  const mb = blokir('KASBON'); if(mb){ alert(mb); return; }
  const png = await ttdMinta({nama:anggotaAktif.nama, jenis:'KASBON', nominal:d.nominal, tenor:1, infaq:0});
  if(!png) return; // dibatalkan
  d.ttd = png; d.setuju = true;
  const btn = $('btnKb'); btn.disabled = true; btn.innerText = 'Mengirim...';
  let sukses = false, pesan = '';
  try{
    const r = await apiPost(d);
    if(r.ok){ sukses = true; pesan = '✅ Pengajuan kasbon terkirim. No: ' + r.id; await muatData(); }
    else pesan = '❌ ' + r.msg;
  }catch(e){ pesan = 'Gagal terhubung ke server. Coba lagi.'; }
  ttdTutup(sukses ? 'anggota-approval' : null);
  alert(pesan);
  btn.innerText = 'Kirim Pengajuan Kasbon'; terapkanBlokir();
}

/* ===== LAPORAN PEMBAYARAN ===== */
function byIsiJumlah(){
  const p = dataSaya.list.find(x => x.status === 'DISETUJUI' && x.angsuran), ke = parseInt($('bySelect').value, 10);
  const j = p && p.angsuran.jadwal.find(x => x.ke === ke); $('byJumlah').value = j ? fmtMoney(String(j.jumlah)) : '';
}
function renderBayar(){
  const p = dataSaya.list.find(x => x.status === 'DISETUJUI' && x.angsuran), wait = {};
  dataSaya.laporan.filter(l => l.status === 'MENUNGGU').forEach(l => wait[l.id + '|' + l.ke] = true);
  if(!p){
    $('byInfo').innerText = 'Tidak ada pinjaman berjalan, jadi belum ada angsuran yang perlu dilaporkan.'; $('byForm').style.display = 'none';
  } else {
    const opsi = p.angsuran.jadwal.filter(j => j.status !== 'LUNAS' && !wait[p.id + '|' + j.ke]);
    $('byInfo').innerHTML = `Pinjaman <b>${esc(p.id)}</b> (${p.jenis === 'KASBON' ? 'Kasbon' : 'Koperasi'}) • sisa ${rpf(p.angsuran.sisa)}. Transfer angsuran lalu unggah foto bukti transaksi.`;
    if(!opsi.length){ $('byForm').style.display = 'none'; $('byInfo').innerHTML += '<div class="ok" style="margin-top:8px">Semua angsuran yang tersisa sedang menunggu verifikasi pengurus.</div>'; }
    else {
      const sebelum = $('bySelect').value;
      $('byForm').style.display = 'block';
      $('bySelect').innerHTML = opsi.map(j => `<option value="${j.ke}">Angsuran ke-${j.ke} • jatuh tempo ${tglf(j.due)} • ${rpf(j.jumlah)}</option>`).join('');
      if(sebelum && opsi.some(j => String(j.ke) === sebelum)) $('bySelect').value = sebelum;
      if(!$('byTgl').value) $('byTgl').value = hariIniStr(); $('byTgl').max = hariIniStr();
      if(!$('byJumlah').value) byIsiJumlah();
    }
  }
  const L = dataSaya.laporan;
  $('byRiwayat').innerHTML = L.length ? L.map(l => `<div style="border-bottom:1px solid #d6e6f8;padding:8px 0" class="small">
      <b>${esc(l.id)} • angsuran ke-${l.ke}</b> • ${rpf(l.jumlah)}<br>Dibayar ${tglf(l.tgl)} • dilaporkan ${esc(l.waktu)}<br><b>${LAPLABEL[l.status] || esc(l.status)}</b>${l.alasan ? '<br><i>“' + esc(l.alasan) + '”</i>' : ''}</div>`).join('')
    : '<p class="small">Belum ada laporan.</p>';
}
// kompres foto di perangkat (maks 1280px, JPEG) agar ringan dikirim
function kompres(file){
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const sc = Math.min(1, 1280 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * sc)); c.height = Math.max(1, Math.round(img.height * sc));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      let q = 0.72, out = c.toDataURL('image/jpeg', q);
      while(out.length > 1.4e6 && q > 0.35){ q -= 0.1; out = c.toDataURL('image/jpeg', q); }
      res(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Foto tidak dapat dibaca. Gunakan format JPG atau PNG.')); };
    img.src = url;
  });
}
async function pilihFoto(input){
  const f = input.files && input.files[0]; if(!f) return;
  try{
    fotoData = await kompres(f);
    $('byPreview').src = fotoData; $('byPreviewWrap').style.display = 'block';
    $('byFotoInfo').innerText = 'Ukuran terkirim ±' + Math.round(fotoData.length * 0.75 / 1024) + ' KB';
  }catch(e){ alert(e.message); }
  input.value = '';
}
function hapusFoto(){ fotoData = ''; $('byPreviewWrap').style.display = 'none'; $('byPreview').removeAttribute('src'); }
async function kirimLaporan(){
  const p = dataSaya.list.find(x => x.status === 'DISETUJUI' && x.angsuran); if(!p){ alert('Tidak ada pinjaman berjalan.'); return; }
  if(!$('bySelect').value){ alert('Pilih angsuran.'); return; }
  if(!$('byTgl').value){ alert('Isi tanggal pembayaran.'); return; }
  if(!validasiForm($('byForm'))) return;
  if(!fotoData){ alert('Lampirkan foto bukti transaksi (ambil foto atau pilih dari galeri).'); return; }
  const btn = $('btnBayar'); btn.disabled = true; btn.innerText = 'Mengunggah...';
  try{
    const r = await apiPost({a:'lapor', nik:anggotaAktif.nik, lahir:anggotaAktif.lahir, id:p.id, ke:parseInt($('bySelect').value, 10),
      tgl:$('byTgl').value, jumlah:moneyVal('byJumlah'), catatan:$('byCatatan').value.trim(), foto:fotoData});
    if(r.ok){ alert('✅ Laporan terkirim. Menunggu verifikasi pengurus.'); hapusFoto(); $('byCatatan').value = ''; $('byJumlah').value = ''; await muatData(); }
    else alert('❌ ' + r.msg);
  }catch(e){ alert('Gagal mengunggah. Periksa koneksi lalu coba lagi.'); }
  btn.disabled = false; btn.innerText = 'Kirim Laporan Pembayaran';
}
