// Layanan anggota: menu, kasbon, status approval, pinjaman berjalan, laporan pembayaran + foto bukti
let dataSaya = {list: [], laporan: [], bolehKoperasi: '', loaded: false}, fotoData = '';
const VIEW2ROUTE = {vKasbon:'anggota-kasbon', vTalangan:'anggota-talangan', formPinjam:'anggota-koperasi', vApproval:'anggota-approval', vBerjalan:'anggota-berjalan', vBayar:'anggota-bayar', vKeringanan:'anggota-keringanan', vKontak:'anggota-kontak', vProfil:'anggota-profil'};
const ROUTE2VIEW = {'anggota-menu':'menuCard', 'anggota-kasbon':'vKasbon', 'anggota-talangan':'vTalangan', 'anggota-koperasi':'formPinjam', 'anggota-approval':'vApproval', 'anggota-berjalan':'vBerjalan', 'anggota-bayar':'vBayar', 'anggota-keringanan':'vKeringanan', 'anggota-kontak':'vKontak', 'anggota-profil':'vProfil'};
const VIEWS = ['menuCard', 'formPinjam', 'vKasbon', 'vTalangan', 'vApproval', 'vBerjalan', 'vBayar', 'vKeringanan', 'vKontak', 'vProfil'];
const LABEL = {REVIEW_PENGURUS:'⏳ Direview Pengurus', MENUNGGU_PIMPINAN:'⏳ Menunggu Pimpinan', MENUNGGU_PENCAIRAN:'💸 Disetujui - Menunggu Pencairan', DISETUJUI:'✅ Disetujui (berjalan)', LUNAS:'🎉 Lunas', DITOLAK:'❌ Ditolak'};
const LAPLABEL = {MENUNGGU:'⏳ Menunggu verifikasi', DIVERIFIKASI:'✅ Terverifikasi', DITOLAK:'❌ Ditolak'};
const ICON = (v, selesai) => v === 'Y' ? '✅' : v === 'N' ? '❌' : (selesai ? '➖' : '⏳');
const KOMEN = a => a ? `<div style="margin:2px 0 6px 22px;color:#334"><i>“${esc(a)}”</i></div>` : '';
const rpf = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const tglf = s => s ? String(s).split('-').reverse().join('/') : '-';
const hariIniStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const apiPost = async body => { // sesi anggota yang ditolak server (habis / tidak sah) -> otomatis ke layar login
  const r = await (await fetch(API_URL, {method:'POST', body:JSON.stringify(body)})).json();
  if(r && r.expired && body.atoken && typeof anggotaAktif !== 'undefined' && anggotaAktif) sesiServerHabis();
  return r;
};
let sesiHabisTampil = false;
function sesiServerHabis(){
  if(sesiHabisTampil) return; sesiHabisTampil = true;
  sesiSpanduk(''); alert('Sesi berakhir. Silakan masuk lagi.'); keluarAnggota(); setTimeout(() => { sesiHabisTampil = false; }, 1500);
}
const BADGE_ST = {
  LUNAS:['LUNAS','#d4f5dd','#1b7a3a','#8fd5a6'], BERJALAN:['BERJALAN','#ffdd00','#0d3b6e','#e6c700'], TERLAMBAT:['TERLAMBAT','#fde0e0','#c0392b','#f1a9a9'],
  DITOLAK:['DITOLAK','#fde0e0','#c0392b','#f1a9a9'], REVIEW_PENGURUS:['DIREVIEW','#dbeafe','#134e8a','#a9c7ee'], MENUNGGU_PIMPINAN:['MENUNGGU PIMPINAN','#dbeafe','#134e8a','#a9c7ee'],
  MENUNGGU_PENCAIRAN:['MENUNGGU PENCAIRAN','#dbeafe','#134e8a','#a9c7ee']};
const badgeStatus = p => { // bulatan status pinjaman: hijau lunas, kuning berjalan, merah terlambat/ditolak, biru dalam proses
  const k = p.status === 'DISETUJUI' ? (p.angsuran && p.angsuran.terlambat > 0 ? 'TERLAMBAT' : 'BERJALAN') : p.status, b = BADGE_ST[k] || [String(p.status || ''), '#eef5ff', '#134e8a', '#b9d2f0'];
  return `<span class="badge" style="background:${b[1]};color:${b[2]};border-color:${b[3]};margin-left:0">${esc(b[0])}</span>`;
};
const badgeJenis = j => j === 'KASBON' ? '<span class="badge" style="background:#fff3cd;color:#8a6100">KASBON</span>' : '<span class="badge">KOPERASI</span>';

/* ===== NAVIGASI (router ada di index.html; tiap layar = 1 entri riwayat) ===== */
function tampilView(v){ // hanya menampilkan layar, tidak mengubah riwayat
  VIEWS.forEach(id => { const el = $(id); if(el) el.style.display = id === v ? 'block' : 'none'; });
  if(v === 'vKasbon') kbUpdate();
  if(v === 'vTalangan') tlnMuat();
  if(v === 'vBayar') renderBayar();
  if(v === 'vKeringanan') renderKeringanan();
  if(v === 'vKontak') renderKontak();
  if(v === 'vProfil') profilRender();
}
/* ===== KONTAK & BANTUAN ===== */
const KONTAK = [
  {jabatan:'Pimpinan', nama:'Mahmudi', sapaan:'Bpk.', hp:'6281271418883', tampil:'+62 812-7141-8883'},
  {jabatan:'Penasehat', nama:'Akhmad Sofyan', sapaan:'Bpk.', hp:'6281222225985', tampil:'+62 812-2222-5985'},
  {jabatan:'Ketua', nama:'Mulyana', sapaan:'Bpk.', hp:'6285215315314', tampil:'+62 852-1531-5314'},
  {jabatan:'Bendahara', nama:'Vivi Atvilina', sapaan:'Ibu', hp:'628976099332', tampil:'+62 897-6099-332'}
];
function renderKontak(){
  const a = anggotaAktif, saya = a ? a.nama + ' (NIK ' + a.nik + ')' : '';
  $('kontakList').innerHTML = KONTAK.map(k => {
    const pesan = 'Assalamualaikum ' + k.jabatan + ' ' + k.sapaan + ' ' + k.nama + ', saya ' + saya + ' dari aplikasi Koperasi Intisel. Saya ingin bertanya: ';
    return `<div class="ok" style="background:#fff;margin-bottom:8px;display:flex;align-items:center;gap:8px">
      <span class="av" data-kontak="${esc(k.jabatan)}" data-nama="${esc(k.nama)}">${esc(fotoInisial(k.nama))}</span>
      <div style="flex:1;min-width:0"><div style="color:#5a7aa0;font-size:14px;font-weight:700">${esc(k.jabatan)}</div><b style="font-size:18px;line-height:1.25;display:block">${esc(k.sapaan)} ${esc(k.nama)}</b></div>
      <a href="https://wa.me/${k.hp}?text=${encodeURIComponent(pesan)}" target="_blank" rel="noopener" style="text-decoration:none;background:#16a34a;color:#fff;font-weight:800;padding:10px 8px;border-radius:10px;font-size:14px;white-space:nowrap;flex:none">WA</a>
      <a href="tel:+${k.hp}" style="text-decoration:none;background:#134e8a;color:#fff;padding:10px 10px;border-radius:10px;font-size:14px;flex:none" aria-label="Telepon ${esc(k.nama)}">📞</a></div>`;
  }).join('');
  fotoMuatKontak();
}
function anggotaRender(name){ // dipanggil router
  if(name === 'anggota'){ resetAnggota(); return; }
  if(!sesiCek()) return;
  $('loginForm').style.display = 'none'; $('sesiBar').style.display = 'flex';
  tampilView(ROUTE2VIEW[name]);
  muatData().then(terapkanBlokir);
}
/* ===== SESI LOGIN ANGGOTA (bertahan saat refresh) + INGAT NIK ===== */
// Sesi dibuat & dipaksa kedaluwarsa di SERVER (token 'atoken', 1 jam). Di perangkat (localStorage) hanya NIK + token + waktu login yang disimpan, maksimal SESI_JAM jam (masuk otomatis TIDAK memperpanjang; lewat batas = wajib login ulang). Login memakai PIN 6 angka atau kode OTP email.
// Sesi HANYA dihapus saat anggota menekan Keluar (atau kedaluwarsa / ditolak server). Tombol back HP tidak menghapus sesi. NIK (tanpa token) diingat terus untuk memudahkan masuk kembali.
const SESI_KEY = 'ang_sesi', NIK_KEY = 'ang_nik', SESI_JAM = 1;
let sesiTetap = false, sesiLoginT = 0; // sesiTetap: true saat masuk otomatis (waktu login asli dipertahankan); sesiLoginT: waktu login sesi yang sedang berjalan
function sesiSimpan(nik, atoken, nama){ let t = Date.now(); if(sesiTetap){ const lama = sesiBaca(); if(lama && lama.nik === nik) t = lama.t; } sesiLoginT = t; try{ localStorage.setItem(SESI_KEY, JSON.stringify({nik, atoken, nama: nama || '', t})); localStorage.setItem(NIK_KEY, nik); }catch(e){} }
function sesiHapus(){ try{ localStorage.removeItem(SESI_KEY); }catch(e){} }
function sesiBaca(){
  try{
    const s = JSON.parse(localStorage.getItem(SESI_KEY) || 'null');
    if(!s) return null;
    if(!/^\d{4,12}$/.test(String(s.nik)) || !/^[0-9a-f-]{40,80}$/.test(String(s.atoken)) || !(Date.now() - s.t < SESI_JAM * 36e5)){ sesiHapus(); return null; }
    return s;
  }catch(e){ return null; }
}
function nikIngat(){ try{ return localStorage.getItem(NIK_KEY) || ''; }catch(e){ return ''; } }
function nikLupakan(){ try{ localStorage.removeItem(NIK_KEY); }catch(e){} $('nikInput').value = ''; $('nikLupaWrap').style.display = 'none'; }
async function sesiMasuk(s){ // masuk otomatis dari sesi tersimpan (token masih divalidasi server)
  try{
    sesiTetap = true;
    $('nikInput').value = s.nik;
    await masukDenganToken(s.nik, s.atoken);
  } catch(e){ /* masukDenganToken menampilkan pesan sendiri */ } finally { sesiTetap = false; }
}
function anggotaSesiHapus(){ // dipanggil saat berpindah ke Pengurus: sesi anggota (memori + tersimpan) dihapus
  sesiHapus(); if(anggotaAktif) resetAnggota(); anggotaAktif = null; sesiLoginT = 0;
}
function sesiBuka(){ // tombol Anggota di halaman depan & refresh di layar anggota
  if(typeof pkSesiHapus === 'function') pkSesiHapus(); // berpindah ke Anggota: sesi pengurus dihapus
  if(anggotaAktif && sesiLoginT){ // masih login di memori: langsung ke menu utama, tanpa layar login
    if(Date.now() - sesiLoginT < SESI_JAM * 36e5){ go('anggota-menu'); return; }
    sesiHapus(); anggotaAktif = null; sesiLoginT = 0; alert('Sesi berakhir (maksimal ' + SESI_JAM + ' jam). Silakan masuk lagi.');
  }
  const s = sesiBaca(); // setelah refresh: pulihkan dari sesi tersimpan (menu menggantikan layar login di riwayat)
  go('anggota');
  if(s) sesiMasuk(s);
}
/* Peringatan sebelum sesi habis: spanduk (tidak memblokir layar) selama SESI_PERINGATAN_MENIT menit terakhir; saat habis, otomatis keluar. */
const SESI_PERINGATAN_MENIT = 5;
function sesiSpanduk(teks){
  let e = document.getElementById('sesiSpanduk');
  if(!teks){ if(e) e.remove(); return; }
  if(!e){
    e = document.createElement('div'); e.id = 'sesiSpanduk'; e.setAttribute('role', 'status');
    e.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:250;background:#fff3cd;color:#7a5200;border-bottom:2px solid #f0b429;padding:9px 14px;font-size:13.5px;font-weight:700;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.2)';
    document.body.appendChild(e);
  }
  e.textContent = teks;
}
function sesiDetak(){
  if(typeof currentPage === 'undefined' || currentPage !== 'anggota' || !anggotaAktif || !sesiLoginT){ sesiSpanduk(''); return; }
  const sisa = SESI_JAM * 36e5 - (Date.now() - sesiLoginT);
  if(sisa <= 0){
    if(typeof ttdOpen !== 'undefined' && ttdOpen) return; // sedang menandatangani: tunda sampai selesai
    sesiSpanduk(''); sesiCek(); return;
  }
  if(sisa <= SESI_PERINGATAN_MENIT * 6e4){
    const mnt = Math.ceil(sisa / 6e4);
    sesiSpanduk('⏳ Sesi berakhir dalam ' + mnt + ' menit. Selesaikan transaksi Anda; setelah itu Anda perlu masuk lagi.');
  } else sesiSpanduk('');
}
setInterval(sesiDetak, 15000);
function sesiCek(){ // false (dan keluar ke layar login) bila batas SESI_JAM jam sejak login sudah lewat
  if(!anggotaAktif || !sesiLoginT || Date.now() - sesiLoginT < SESI_JAM * 36e5) return true;
  sesiSpanduk('');
  alert('Sesi berakhir (maksimal ' + SESI_JAM + ' jam). Silakan masuk lagi.');
  keluarAnggota(); return false;
}
document.addEventListener('visibilitychange', () => { if(!document.hidden && typeof currentPage !== 'undefined' && currentPage === 'anggota'){ if(sesiCek()) sesiDetak(); } });
function sesiLanjut(){ const s = sesiBaca(); if(s) sesiMasuk(s); else { $('sesiLanjutWrap').style.display = 'none'; alert('Sesi sudah berakhir. Silakan masuk lagi.'); } }
function resetAnggota(){ // layar Cek NIK: data layar anggota dibersihkan (sesi tersimpan TIDAK dihapus; itu hanya oleh tombol Keluar)
  anggotaAktif = null; dataSaya = {list: [], laporan: [], bolehKoperasi: '', loaded: false}; fotoData = '';
  const ss = sesiBaca(); $('sesiLanjutWrap').style.display = ss ? 'block' : 'none'; if(ss) $('sesiLanjutNama').innerText = ss.nama || ('NIK ' + ss.nik);
  $('nikInput').value = nikIngat(); $('nikLupaWrap').style.display = nikIngat() ? 'block' : 'none'; lgReset(); pinPadKosong();
  $('hasilCek').innerHTML = ''; $('sesiBar').style.display = 'none'; $('loginForm').style.display = 'block';
  VIEWS.forEach(id => $(id).style.display = 'none');
}
/* ===== KUOTA / BUDGET PINJAMAN BULANAN ===== */
let kuotaBulanPilih = {KOPERASI:'', KASBON:''}; // bulan budget yang dipilih anggota (kosong = bulan alami)
function kuotaNamaJenis(j){ return j === 'KASBON' ? 'kasbon' : 'pinjaman koperasi'; }
async function kuotaTanya(jenis, nominal){ // null bila gagal terhubung (server tetap memeriksa saat kirim)
  try{ const r = await apiPost({a:'kuota_info', nik:anggotaAktif.nik, atoken:anggotaAktif.atoken, jenis, nominal:nominal || 0, bulan:kuotaBulanPilih[jenis] || ''}); return r && r.ok ? r : null; }
  catch(e){ return null; }
}
// Dipanggil saat anggota membuka formulir: bila kuota bulan ini penuh, tawarkan masuk pencairan bulan berikutnya
async function kuotaGerbang(jenis){
  kuotaBulanPilih[jenis] = '';
  const r = await kuotaTanya(jenis, 0); if(!r || !r.penuh) return true;
  if(!r.tawaran){ alert('Kuota ' + kuotaNamaJenis(jenis) + ' bulan ' + r.bulan.label + ' sudah penuh, dan belum ada kuota tersedia dalam 6 bulan ke depan. Silakan hubungi pengurus koperasi.'); return false; }
  const tambahan = jenis === 'KASBON' ? '\n\nKuota kasbon terisi kembali bila ada kasbon yang dilunasi, jadi Anda juga bisa mencoba lagi nanti.' : '';
  const ya = await dialogKonfirmasi('Kuota ' + kuotaNamaJenis(jenis) + ' bulan ' + r.bulan.label + ' sudah penuh.\n\nApakah Anda bersedia masuk pencairan bulan ' + r.tawaran.label + '?' + tambahan);
  if(!ya) return false;
  kuotaBulanPilih[jenis] = r.tawaran.ym; return true;
}
// Dipanggil sebelum tanda tangan: pastikan nominal muat di kuota. setNominal(sisa) menurunkan nominal di formulir dan mengembalikan nominal baru (atau 0 bila tidak bisa).
async function kuotaPastikan(jenis, nominal, setNominal){
  for(let i = 0; i < 4; i++){
    const r = await kuotaTanya(jenis, nominal);
    if(!r || r.cukup) return nominal;
    if(r.bisaTurun && setNominal){
      const baru = setNominal(r.bulan.sisa);
      if(baru > 0 && await dialogKonfirmasi('Sisa kuota ' + kuotaNamaJenis(jenis) + ' bulan ' + r.bulan.label + ' tinggal ' + rpf(r.bulan.sisa) + ', sedangkan Anda mengajukan ' + rpf(nominal) + '.\n\nTurunkan nominal menjadi ' + rpf(baru) + '?')){ nominal = baru; setNominal(r.bulan.sisa, true); continue; }
    }
    if(r.tawaran){
      if(await dialogKonfirmasi('Kuota ' + kuotaNamaJenis(jenis) + ' bulan ' + r.bulan.label + (r.penuh ? ' sudah penuh.' : ' tinggal ' + rpf(r.bulan.sisa) + '.') + '\n\nApakah Anda bersedia masuk pencairan bulan ' + r.tawaran.label + '?')){ kuotaBulanPilih[jenis] = r.tawaran.ym; continue; }
      return 0;
    }
    alert('Kuota ' + kuotaNamaJenis(jenis) + ' bulan ' + r.bulan.label + ' tidak mencukupi dan belum ada kuota tersedia dalam 6 bulan ke depan. Silakan hubungi pengurus koperasi.'); return 0;
  }
  return 0;
}
async function bukaMenu(v){
  if(v === 'vKasbon' && $('tlKasbon').classList.contains('off')) { alert('Kasbon khusus karyawan dengan masa kerja di bawah 2 tahun.'); return; }
  if(v === 'formPinjam' && $('tlKoperasi').classList.contains('off')) { alert('Pengajuan Koperasi khusus karyawan dengan masa kerja minimal 2 tahun.'); return; }
  if(v === 'vKasbon' || v === 'formPinjam'){ // cek pinjaman berjalan / pengajuan ganda sebelum membuka formulir
    if(!dataSaya.loaded) await muatData();
    const m = blokir(v === 'vKasbon' ? 'KASBON' : 'KOPERASI');
    if(m){ alert(m); return; }
    if(v === 'vKasbon'){ if(!await kuotaGerbang('KASBON')) return; }
    else { rcData = null; rcFoto = ''; rcMuat(); } // koperasi: anggota memilih bulan pencairan di formulir
  }
  go(VIEW2ROUTE[v]);
}
function masukMenu(){
  const a = anggotaAktif, koperasiOk = !limitAktif.notEligible;
  fotoMuatAnggota();
  $('tlKoperasi').classList.toggle('off', !koperasiOk); $('tlKasbon').classList.toggle('off', koperasiOk);
  const pg = !!a.pengelola; $('tlKasbon').style.display = pg ? 'none' : ''; $('tlTalangan').style.display = pg ? '' : 'none'; // pengelola: menu Kasbon diganti Dana Talangan
  $('tlKoperasiSub').innerText = koperasiOk ? 'Maks ' + rpf(limitAktif.maxNominal) + ' • ' + limitAktif.maxTenor + ' bln' : 'Khusus masa kerja ≥ 2 tahun';
  $('tlKasbonSub').innerText = koperasiOk ? 'Khusus masa kerja < 2 tahun' : 'Maks Rp 500.000 • 30 hari';
  profilBarIsi(a); inboxMuat();
  goReplace('anggota-menu'); // ganti layar login di riwayat: tombol back dari menu langsung ke halaman depan
}
async function keluarKonfirmasi(){ if(await dialogKonfirmasi('Apakah Anda yakin ingin keluar?')) keluarAnggota(); }
function keluarAnggota(){ // tombol Keluar: cabut sesi di server, hapus sesi tersimpan, lalu kembali ke halaman depan
  try{ const t = anggotaAktif && anggotaAktif.atoken; if(t) fetch(API_URL, {method:'POST', body:JSON.stringify({a:'keluar_a', atoken:t})}).catch(() => {}); }catch(e){}
  sesiHapus(); anggotaAktif = null; sesiLoginT = 0; sesiSpanduk(''); // keluar = sesi di memori ikut dihapus (tanpa ini, membuka Anggota lagi memunculkan 'Sesi berakhir')
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
  // masa tunggu tidak lagi memblokir: dihitung terhadap bulan pencairan yang dipilih (lihat rencana.js)
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
    const r = await apiPost({a:'status', nik:anggotaAktif.nik, atoken:anggotaAktif.atoken});
    if(!r.ok){ $('apBox').innerHTML = `<div class="err">${esc(r.msg)}</div>`; return; }
    dataSaya = {list: r.list || [], laporan: r.laporan || [], keringanan: r.keringanan || [], krTerpakai: r.krTerpakai || {}, krMaks: r.krMaks || 3, bolehKoperasi: r.bolehKoperasi || '', loaded: true};
  }catch(e){ $('apBox').innerHTML = '<div class="err">Gagal memuat data. Periksa koneksi internet.</div>'; return; }
  renderApproval(); renderBerjalan(); renderBayar(); renderKeringanan(); renderSub(); terapkanBlokir();
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
  else if(dataSaya.bolehKoperasi && hariIniStr() < dataSaya.bolehKoperasi && !limitAktif.notEligible) info = `⏳ Masa tunggu 3 bulan setelah pelunasan berakhir <b>${tglf(dataSaya.bolehKoperasi)}</b>. Anda tetap dapat mengajukan sekarang dengan memilih bulan pencairan pada atau sesudah tanggal itu.`;
  st.style.display = info ? 'block' : 'none'; st.innerHTML = info;
  const tunggu = dataSaya.laporan.filter(l => l.status === 'MENUNGGU').length;
  $('tlBayarSub').innerText = tunggu ? tunggu + ' menunggu verifikasi' : 'Upload foto bukti transaksi';
}
function renderApproval(){
  const L = dataSaya.list;
  $('apBox').innerHTML = L.length ? L.map(p => {
    const selesai = ['DITOLAK', 'MENUNGGU_PENCAIRAN', 'DISETUJUI', 'LUNAS'].includes(p.status), done = p.pengurus.filter(x => x.v === 'Y').length;
    return `<div class="ok" style="margin-bottom:10px;background:#fff">
      ${badgeStatus(p)} <b>${esc(p.id)}</b> • ${esc(p.waktu)}<br>${p.jenis === 'KASBON' ? 'Kasbon' : 'Koperasi'} • ${rpf(p.nominal)} / ${p.jenis === 'KASBON' ? '30 hari' : p.tenor + ' bln'}<br>
      <b>${LABEL[p.status] || esc(p.status)}</b>
      ${p.pencairan ? `<div class="small" style="margin-top:4px;color:#134e8a">💸 ${esc(p.pencairan.label)}${p.pencairan.tglCair ? '<br>✅ Dicairkan ' + tglf(p.pencairan.tglCair) : ''}${p.pencairan.adaBukti ? '<br><span class="chip" onclick="buktiCairLihat(\'' + esc(p.id) + '\')">🧾 Lihat bukti transfer</span><div id="bcA-' + esc(p.id) + '"></div>' : ''}</div>` : ''}
      <div class="small" style="margin-top:6px">
        ${p.pengurus.map(x => `<div>${ICON(x.v, selesai)} ${esc(x.nama)}${x.jabatan ? ' <span class="small">(' + esc(x.jabatan) + ')</span>' : ''}</div>${KOMEN(x.a)}`).join('')}
        ${p.status === 'REVIEW_PENGURUS' ? '<div>Review pengurus: ' + done + '/3</div>' : ''}
        ${p.status !== 'REVIEW_PENGURUS' ? `<div>${ICON(p.pimpinan, selesai)} ${esc(p.pimpinanNama || 'Pimpinan')} <span class="small">(${esc(p.pimpinanJabatan || 'Pimpinan')})</span></div>${KOMEN(p.pimpinanA)}` : ''}
      </div></div>`;
  }).join('') : '<p class="small">Belum ada pengajuan. Pilih Pengajuan Kasbon atau Pengajuan Koperasi di menu.</p>';
}
async function buktiCairLihat(id, boxId){ // anggota melihat bukti transfer pencairan miliknya sendiri
  const box = $(boxId || 'bcA-' + id); if(!box) return; box.innerHTML = '<span class="small">Memuat foto...</span>';
  try{
    const r = await apiPost({a:'bukti_cair_a', nik:anggotaAktif.nik, atoken:anggotaAktif.atoken, id});
    if(!r.ok){ box.innerHTML = `<div class="err">${esc(r.msg)}</div>`; return; }
    const img = document.createElement('img'); img.src = r.data; img.alt = 'Bukti transfer pencairan';
    img.style.cssText = 'max-width:100%;border-radius:10px;margin-top:8px;border:1px solid #b9d2f0';
    box.innerHTML = ''; box.appendChild(img);
  }catch(e){ box.innerHTML = '<div class="err">Gagal memuat foto.</div>'; }
}
function jadwalTabel(a){
  const today = hariIniStr();
  return `<table class="small" style="margin-top:6px;border-collapse:collapse"><tr style="color:#5a7aa0"><td>Ke</td><td>Jatuh tempo</td><td>Jumlah</td><td>Status</td></tr>` +
    a.jadwal.map(j => `<tr><td style="padding:2px 8px 2px 0">${j.ke}</td><td style="padding:2px 8px 2px 0">${tglf(j.due)}</td><td style="padding:2px 8px 2px 0">${rpf(j.jumlah)}</td>
      <td>${j.status === 'LUNAS' ? (j.asli === 0 ? '⏸ ditunda' : '✅ ' + tglf(j.tglBayar)) : j.status === 'SEBAGIAN' ? '<span style="color:#b45309">🟡 sebagian (sudah ' + rpf(j.terbayar) + ')</span>' + (j.due < today ? ' <span style="color:#c0392b">⚠️</span>' : '') : (j.due < today ? '<span style="color:#c0392b">⚠️ terlambat</span>' : '⏳')}</td></tr>`).join('') +
    ((a.infaq && a.infaq.riwayat || []).map(x => `<tr><td style="padding:2px 8px 2px 0">Infaq</td><td style="padding:2px 8px 2px 0">-</td><td style="padding:2px 8px 2px 0">${rpf(x.jumlah)}</td><td>✅ ${tglf(x.tgl)}</td></tr>`).join('')) + '</table>';
}
/* ===== KUITANSI PDF ===== */
function kwBuka(r, tombol){ // r: balasan server { ok, data (data URL PDF), nama }
  if(!r.ok){ alert('❌ ' + r.msg); return; }
  const bin = atob(r.data.split(',')[1]), u8 = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([u8], {type:'application/pdf'})), a = document.createElement('a');
  a.href = url; a.download = r.nama || 'Kuitansi.pdf'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
async function kwUnduhAnggota(id, i, btn){
  if(btn){ btn.disabled = true; }
  try{ kwBuka(await apiPost({a:'kuitansi', nik:anggotaAktif.nik, atoken:anggotaAktif.atoken, id, i})); }
  catch(e){ alert('Gagal mengunduh kuitansi. Periksa koneksi lalu coba lagi.'); }
  if(btn){ btn.disabled = false; }
}
function kwDaftarAnggota(p){
  const k = (p.kuitansi || []).slice().reverse();
  if(!k.length) return '';
  return `<details style="margin-top:8px"><summary class="small" style="cursor:pointer;color:#134e8a;font-weight:700">🧾 Kuitansi pembayaran (${k.length})</summary>` +
    k.map(x => `<div class="small" style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-top:1px solid #d6e6f8"><span><b>${esc(x.no)}</b><br>${tglf(x.tgl)} • ${rpf(x.jumlah)}</span><button class="btn" style="width:auto;padding:8px 12px;font-size:13px;margin:0" onclick="kwUnduhAnggota('${esc(p.id)}',${x.i},this)">⬇️ PDF</button></div>`).join('') + '</details>';
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
      <div class="small"><b>${a.lunas}/${a.total} lunas</b> • sisa ${rpf(a.sisa)}${a.infaq && a.infaq.target ? '<br>Infaq: ' + rpf(a.infaq.terbayar) + ' / ' + rpf(a.infaq.target) + (a.infaq.sisa ? ' • <b style="color:#b45309">sisa ' + rpf(a.infaq.sisa) + '</b>' : ' ✅ lunas') : ''}${a.berikut ? '<br>Berikutnya: ke-' + a.berikut.ke + ', jatuh tempo <b>' + tglf(a.berikut.due) + '</b> (' + rpf(a.berikut.jumlah) + ')' : ''}</div>
      <button class="btn" style="margin-top:10px;padding:12px;font-size:14px" onclick="goReplace('anggota-bayar')">🧾 Lapor Pembayaran</button>
      ${p.jenis !== 'KASBON' && a.total - a.lunas >= 1 ? `<button class="btn" style="margin-top:8px;padding:12px;font-size:14px;background:#7c3aed" onclick="goReplace('anggota-keringanan')">🤝 Ajukan Keringanan Angsuran</button>` : ''}
      <button class="btn btn-yellow" style="margin-top:8px;padding:12px;font-size:14px" onclick="kartuBuka('${p.id}')">📄 Lihat Kartu Pinjaman</button>
      ${p.pencairan && p.pencairan.adaBukti ? `<button class="btn" style="margin-top:8px;padding:12px;font-size:14px;background:#6b7f99" onclick="buktiCairLihat('${esc(p.id)}', 'bcB-${esc(p.id)}')">🧾 Lihat Bukti Transfer Pencairan</button><div id="bcB-${esc(p.id)}"></div>` : ''}
      ${kwDaftarAnggota(p)}
      <details style="margin-top:8px"><summary class="small" style="cursor:pointer;color:#134e8a;font-weight:700">Jadwal angsuran</summary>${jadwalTabel(a)}</details>
    </div>`;
  }).join('') : '<p class="small">Tidak ada pinjaman yang sedang berjalan.</p>';
  if(lunas.length) h += '<div style="font-weight:800;margin-top:14px">Sudah lunas</div>' + lunas.map(p => `<div class="small" style="padding:6px 0;border-bottom:1px solid #d6e6f8">🎉 ${badgeJenis(p.jenis)} ${esc(p.id)} • ${rpf(p.nominal)} • lunas ${tglf(p.tglLunas)} <span class="chip" style="margin-left:6px" onclick="kartuBuka('${p.id}')">📄 Kartu</span></div>`).join('');
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
  const d = {a:'ajukan', jenis:'KASBON', nik:anggotaAktif.nik, atoken:anggotaAktif.atoken, nominal:parseInt($('kbNominal').value, 10), tenor:1,
    alasan:g('kbAlasan'), alamat:g('kbAlamat'), hp:g('kbHp'), email:g('kbEmail'), rek:onlyDigits(g('kbRek')), gajiUnder:g('kbGajiUnder'), gaji1:moneyVal('kbGaji1'),
    namaDarurat:g('kbNamaD'), hpDarurat:g('kbHpD'), hubungan:g('kbHub')};
  const mb = blokir('KASBON'); if(mb){ alert(mb); return; }
  d.nominal = await kuotaPastikan('KASBON', d.nominal, (sisa, terapkan) => { const n = Math.floor(sisa / 50000) * 50000; if(n < 50000) return 0; if(terapkan){ $('kbNominal').value = n; kbUpdate(); } return n; });
  if(!d.nominal) return;
  d.bulanBudget = kuotaBulanPilih.KASBON || '';
  const png = await ttdMinta({nama:anggotaAktif.nama, jenis:'KASBON', nominal:d.nominal, tenor:1, infaq:0});
  if(!png) return; // dibatalkan
  d.ttd = png; d.setuju = true;
  d.lok = await lokasiMinta();
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
function byPinjaman(){ return dataSaya.list.find(x => x.status === 'DISETUJUI' && x.angsuran); }
function byKes(){ return Array.from(document.querySelectorAll('#byList input:checked')).map(e => parseInt(e.value, 10)).sort((a, b) => a - b); } // angsuran yang dicentang
function byTotalPilih(){ const p = byPinjaman(), k = byKes(); return p ? p.angsuran.jadwal.filter(j => k.indexOf(j.ke) >= 0).reduce((t, j) => t + j.jumlah, 0) : 0; }
function byToggle(el){ // mencentang angsuran ke-N otomatis mencentang yang lebih awal; membatalkan, membatalkan yang lebih akhir (pembayaran berurutan)
  const cb = Array.from(document.querySelectorAll('#byList input')), i = cb.indexOf(el);
  cb.forEach((c, j) => { if(el.checked ? j < i : j > i) c.checked = el.checked; });
  byIsiJumlah();
}
function byIsiJumlah(){
  document.querySelectorAll('#byList .byck').forEach(l => l.classList.toggle('on', l.querySelector('input').checked));
  const k = byKes(), inf = $('byInfaqWrap').style.display === 'none' ? 0 : (moneyVal('byInfaq') || 0), tot = byTotalPilih() + inf;
  $('byJumlah').value = tot ? fmtMoney(String(tot)) : '';
  const h = $('byHintPilih');
  h.innerHTML = k.length ? '<b>' + k.length + ' angsuran dipilih</b> (ke-' + k.join(', ') + ') = ' + rpf(byTotalPilih()) + (inf ? ' + infaq ' + rpf(inf) + ' = <b>' + rpf(tot) + '</b>' : '') : ($('byInfaqWrap').style.display === 'none' ? '' : 'Tidak ada angsuran dicentang: laporan ini hanya untuk <b>infaq</b>.');
  byCekSebagian();
}
function byCekSebagian(){ // peringatan bila jumlah < angsuran: catatan alasan jadi wajib
  const p = byPinjaman(), k = byKes(), h = $('byHintSebagian'); if(!h) return;
  const sisa = byTotalPilih();
  const inf = $('byInfaqWrap').style.display === 'none' ? 0 : (moneyVal('byInfaq') || 0), uang = moneyVal('byJumlah') - inf;
  if(p && k.length && uang > 0 && uang < sisa){
    h.style.display = 'block'; h.innerHTML = '🟡 Jumlah ini <b>kurang ' + rpf(sisa - uang) + '</b> dari angsuran. Pembayaran dicatat sebagai <b>sebagian</b> dan <b>catatan alasan wajib diisi</b>. Bila kekurangan belum dilunasi sampai tanggal 15, akan digeser ke angsuran bulan berikutnya. Kesulitan membayar? Ajukan <a href="#" onclick="goReplace(\'anggota-keringanan\');return false" style="color:#7c3aed;font-weight:700">keringanan</a> dulu.';
    $('byCatLbl').innerText = 'Catatan alasan (WAJIB karena pembayaran kurang)';
  } else { h.style.display = 'none'; $('byCatLbl').innerText = 'Catatan (opsional)'; }
}
function renderBayar(){
  const p = dataSaya.list.find(x => x.status === 'DISETUJUI' && x.angsuran), wait = {};
  dataSaya.laporan.filter(l => l.status === 'MENUNGGU').forEach(l => (l.kes || (l.ke ? [l.ke] : [])).forEach(k => wait[l.id + '|' + k] = true));
  if(!p){
    $('byInfo').innerText = 'Tidak ada pinjaman berjalan, jadi belum ada angsuran yang perlu dilaporkan.'; $('byForm').style.display = 'none';
  } else {
    const opsi = p.angsuran.jadwal.filter(j => j.status !== 'LUNAS' && !wait[p.id + '|' + j.ke]), ik = p.angsuran.infaq || {target:0, terbayar:0, sisa:0};
    $('byInfo').innerHTML = `Pinjaman <b>${esc(p.id)}</b> (${p.jenis === 'KASBON' ? 'Kasbon' : 'Koperasi'}) • sisa ${rpf(p.angsuran.sisa)}. Transfer angsuran lalu unggah foto bukti transaksi.${ik.target ? '<br>Infaq: terbayar ' + rpf(ik.terbayar) + ' dari ' + rpf(ik.target) + (ik.sisa ? ' • <b>sisa ' + rpf(ik.sisa) + '</b>' : ' ✅ lunas') : ''}`;
    if(!opsi.length && !ik.sisa){ $('byForm').style.display = 'none'; $('byInfo').innerHTML += '<div class="ok" style="margin-top:8px">Semua angsuran yang tersisa sedang menunggu verifikasi pengurus.</div>'; }
    else {
      const sebelum = Array.from(document.querySelectorAll('#byList input:checked')).map(e => e.value), ada = document.querySelectorAll('#byList input').length > 0;
      $('byForm').style.display = 'block';
      $('byList').innerHTML = opsi.map(j => `<label class="byck"><input type="checkbox" value="${j.ke}" onchange="byToggle(this)"><span><b>Angsuran ke-${j.ke}</b> • ${rpf(j.jumlah)}${j.status === 'SEBAGIAN' ? ' <i>(kurang)</i>' : ''}<br><span class="small">jatuh tempo ${tglf(j.due)}</span></span></label>`).join('');
      document.querySelectorAll('#byList input').forEach((c, i) => { c.checked = ada ? sebelum.indexOf(c.value) >= 0 : (i === 0 && opsi.length > 0); }); // angsuran terdekat tercentang bawaan
      $('byInfaqWrap').style.display = ik.sisa ? 'block' : 'none';
      $('byInfaqLbl').innerText = ik.sisa ? 'Infaq (sisa ' + rpf(ik.sisa) + ' dari ' + rpf(ik.target) + ') — boleh dicicil atau lebih; wajib lunas bersama angsuran terakhir' : '';
      if(!$('byTgl').value) $('byTgl').value = hariIniStr(); $('byTgl').max = hariIniStr();
      if(!$('byJumlah').value) byIsiJumlah(); else { document.querySelectorAll('#byList .byck').forEach(l => l.classList.toggle('on', l.querySelector('input').checked)); byCekSebagian(); }
    }
  }
  const L = dataSaya.laporan;
  $('byRiwayat').innerHTML = L.length ? L.map(l => `<div style="border-bottom:1px solid #d6e6f8;padding:8px 0" class="small">
      <b>${esc(l.id)} • ${(l.kes && l.kes.length) || l.ke ? 'angsuran ke-' + ((l.kes && l.kes.length) ? l.kes.join(', ') : l.ke) : 'infaq'}${l.infaq && (l.ke || (l.kes && l.kes.length)) ? ' + infaq ' + rpf(l.infaq) : ''}</b> • ${rpf(l.jumlah)}<br>Dibayar ${tglf(l.tgl)} • dilaporkan ${esc(l.waktu)}<br><b>${LAPLABEL[l.status] || esc(l.status)}</b>${l.alasan ? '<br><i>“' + esc(l.alasan) + '”</i>' : ''}</div>`).join('')
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
  const p = byPinjaman(); if(!p){ alert('Tidak ada pinjaman berjalan.'); return; }
  const kesP = byKes(), infaqP = $('byInfaqWrap').style.display === 'none' ? 0 : (moneyVal('byInfaq') || 0), ikP = p.angsuran.infaq || {sisa:0};
  if(!kesP.length && !infaqP){ alert(ikP.sisa ? 'Centang angsuran yang dibayar, atau isi jumlah infaq bila hanya membayar infaq.' : 'Centang angsuran yang dibayar.'); return; }
  const belumP = p.angsuran.jadwal.filter(j => j.status !== 'LUNAS'), jP = belumP.filter(j => kesP.indexOf(j.ke) >= 0), sisaP = jP.reduce((t, j) => t + j.jumlah, 0), uangP = moneyVal('byJumlah') - infaqP;
  if(kesP.length){
    if(!(uangP > 0)){ alert('Jumlah untuk angsuran harus lebih dari Rp 0 (jumlah dibayar dikurangi infaq).'); return; }
    if(uangP > sisaP){ alert('Jumlah melebihi angsuran yang harus dibayar (' + rpf(sisaP) + (infaqP ? ' + infaq ' + rpf(infaqP) : '') + '). Periksa kembali.'); return; }
    if(uangP < sisaP && !$('byCatatan').value.trim()){ alert('Pembayaran kurang dari angsuran (kurang ' + rpf(sisaP - uangP) + '). Isi catatan alasan pembayaran sebagian.'); $('byCatatan').focus(); return; }
  }
  if(kesP.length && kesP.length === belumP.length && ikP.sisa > infaqP && !(uangP < sisaP)){ alert('Ini angsuran terakhir, infaq harus lunas bersamanya. Isi infaq minimal ' + rpf(ikP.sisa) + ' (boleh lebih).'); return; }
  if(!$('byTgl').value){ alert('Isi tanggal pembayaran.'); return; }
  if(!validasiForm($('byForm'))) return;
  if(!fotoData){ alert('Lampirkan foto bukti transaksi (ambil foto atau pilih dari galeri).'); return; }
  const lok = await lokasiMinta();
  const btn = $('btnBayar'); btn.disabled = true; btn.innerText = 'Mengunggah...';
  try{
    const r = await apiPost({a:'lapor', nik:anggotaAktif.nik, atoken:anggotaAktif.atoken, id:p.id, kes:kesP, ke:kesP[0] || 0, infaq:infaqP,
      tgl:$('byTgl').value, jumlah:moneyVal('byJumlah'), catatan:$('byCatatan').value.trim(), foto:fotoData, lok});
    if(r.ok){ alert('✅ Laporan terkirim. Menunggu verifikasi pengurus.'); hapusFoto(); $('byCatatan').value = ''; $('byJumlah').value = ''; $('byInfaq').value = ''; await muatData(); }
    else alert('❌ ' + r.msg);
  }catch(e){ alert('Gagal mengunggah. Periksa koneksi lalu coba lagi.'); }
  btn.disabled = false; btn.innerText = 'Kirim Laporan Pembayaran';
}


/* ---------- KARTU PINJAMAN (bukti pembayaran pinjaman, bisa dicetak / disimpan PDF) ---------- */
const BLN_K = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const HARI_K = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'], BLN_KP = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
function kTgl(s){ const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? (+m[3]) + ' ' + BLN_K[+m[2] - 1] + ' ' + m[1] : ''; }
function kTglS(s){ const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? m[3] + '/' + m[2] + '/' + m[1].slice(2) : ''; }
const kDua = (lg, sm) => `<span class="lg">${lg}</span><span class="sm">${sm}</span>`;
function kTglPanjang(d){ return HARI_K[d.getDay()] + ', ' + ('0' + d.getDate()).slice(-2) + ' ' + BLN_KP[d.getMonth()] + ' ' + d.getFullYear(); }
function kSelisih(a, b){ const x = Date.parse(a + 'T00:00:00Z'), y = Date.parse(b + 'T00:00:00Z'); return isNaN(x) || isNaN(y) ? 0 : Math.round((x - y) / 864e5); }
const kAngka = n => Number(n || 0).toLocaleString('id-ID');
function kartuBuka(id){
  const p = (dataSaya.list || []).find(x => x.id === id && x.angsuran);
  if(!p){ alert('Data kartu belum tersedia. Muat ulang halaman lalu coba lagi.'); return; }
  const a = p.angsuran, k = p.kartu || {}, kas = p.jenis === 'KASBON', jad = a.jadwal || [], ik = a.infaq || {target: +k.infaq || 0, terbayar: 0, sisa: +k.infaq || 0, riwayat: []}, infaq = ik.target;
  const infaqTxt = infaq ? kAngka(infaq) + (ik.sisa ? ' (Terbayar ' + kAngka(ik.terbayar) + ', sisa ' + kAngka(ik.sisa) + ')' : ' (Lunas' + (ik.terbayar > infaq ? ', terbayar ' + kAngka(ik.terbayar) : '') + ')') : '-';
  const infaqBaris = (ik.riwayat || []).map(x => ({tgl: x.tgl, jumlah: x.jumlah}));
  const today = new Date().toISOString().slice(0, 10);
  const info = (l, v, bold) => `<div class="kr"><span>${l}</span><b${bold ? '' : ' class="nb"'}>${v}</b></div>`;
  const baris = jad.map(j => {
    const bayar = j.status === 'LUNAS';
    const telat = bayar ? Math.max(0, kSelisih(j.tglBayar, j.due)) : (j.due < today ? kSelisih(today, j.due) : null);
    return `<tr><td class="c">${j.ke}</td><td>${kas ? 'Kasbon' : kDua('Angsuran Ke ' + j.ke, 'Ke ' + j.ke)}</td><td class="c">${kDua(esc(kTgl(j.due)), kTglS(j.due))}</td><td class="c">${bayar ? kDua(esc(kTgl(j.tglBayar)), kTglS(j.tglBayar)) : ''}</td>` +
      `<td class="r">${bayar ? kAngka(j.jumlah) : ''}</td><td class="c"${!bayar && telat ? ' style="color:#c0392b;font-weight:700"' : ''}>${telat === null ? '' : telat + ' Hari'}</td><td class="c">${bayar ? 'Lunas' : ''}</td></tr>`;
  }).join('') + infaqBaris.map(x => `<tr><td class="c">-</td><td>Infaq</td><td class="c"></td><td class="c">${kDua(esc(kTgl(x.tgl)), kTglS(x.tgl))}</td><td class="r">${kAngka(x.jumlah)}</td><td class="c"></td><td class="c">Infaq</td></tr>`).join('');
  const nm = anggotaAktif ? anggotaAktif.nama : '';
  window.KARTU_CUR = { id: p.id, kas, judul: 'BUKTI PEMBAYARAN ' + (kas ? 'KASBON' : 'PINJAMAN KOPERASI'), info: [
    ['No Registrasi', p.id, 1], ['Nama', nm, 1], ['Jumlah Pinjaman', kAngka(p.nominal)], ['Alamat', k.alamat || '-'],
    ['Lama Pinjaman', kas ? '30 Hari' : p.tenor + ' Bulan'], ['No.HP', k.hp || '-'], ['Angsuran', jad.length ? kAngka((jad.find(j => j.asli > 0) || jad[0]).asli) : '-'], ['Email', k.email || '-'],
    ['Tanggal Pencairan', kTgl(k.tglCair) || '-'], ['Sisa Pinjaman', 'Rp ' + kAngka(a.sisa), 1], ['Infaq', infaqTxt, 1]],
    rows: jad.map(j => {
      const bayar = j.status === 'LUNAS', part = j.status === 'SEBAGIAN';
      const telat = bayar ? Math.max(0, kSelisih(j.tglBayar, j.due)) : (j.due < today ? kSelisih(today, j.due) : null);
      return [String(j.ke), kas ? 'Kasbon' : 'Angsuran Ke ' + j.ke, kTgl(j.due), bayar || part ? kTgl(j.tglBayar) : '', bayar ? kAngka(j.jumlah) : part ? kAngka(j.terbayar) : '', telat === null ? '' : telat + ' Hari', bayar ? (j.asli === 0 ? 'Ditunda' : 'Lunas') : part ? 'Sebagian' : '', !bayar && telat > 0];
    }).concat(infaqBaris.map(x => ['-', 'Infaq', '', kTgl(x.tgl), kAngka(x.jumlah), '', 'Infaq', false])), tgl: kTglPanjang(new Date()) };
  const html = `<div class="kartu-box" id="kartuBox">
    <div class="kartu-judul">BUKTI PEMBAYARAN ${kas ? 'KASBON' : 'PINJAMAN KOPERASI'}</div>
    <div class="kartu-info">
      ${info('No Registrasi', esc(p.id), 1)}${info('Nama', esc(anggotaAktif ? anggotaAktif.nama : ''), 1)}
      ${info('Jumlah Pinjaman', kAngka(p.nominal))}${info('Alamat', esc(k.alamat || '-'))}
      ${info('Lama Pinjaman', kas ? '30 Hari' : p.tenor + ' Bulan')}${info('No.HP', esc(k.hp || '-'))}
      ${info('Angsuran', jad.length ? kAngka((jad.find(j => j.asli > 0) || jad[0]).asli) : '-')}${info('Email', esc(k.email || '-'))}
      ${info('Tanggal Pencairan', esc(kTgl(k.tglCair) || '-'))}${info('Sisa Pinjaman', 'Rp ' + kAngka(a.sisa), 1)}
      ${info('Infaq', infaqTxt, 1)}
    </div>
    <div style="overflow-x:auto"><table class="kartu-tbl"><thead><tr><th>NO</th><th>${kDua('Keterangan', 'Ket.')}</th><th>${kDua('Jatuh Tempo', 'Jatuh Tempo')}</th><th>${kDua('Tanggal Pembayaran', 'Tgl Bayar')}</th><th>${kDua('Jumlah Pembayaran', 'Jumlah')}</th><th>${kDua('Keterlambatan', 'Telat')}</th><th>${kDua('Keterangan', 'Status')}</th></tr></thead><tbody>${baris}</tbody></table></div>
    <div class="kartu-ttd">${esc(kTglPanjang(new Date()))}<img src="logo-intisel.png" alt="Koperasi Intisel"><div style="height:34px"></div>Pengurus Koperasi</div>
  </div>`;
  let m = document.getElementById('kartuModal');
  if(!m){ m = document.createElement('div'); m.id = 'kartuModal'; m.className = 'kartu-modal'; m.onclick = e => { if(e.target === m) kartuTutup(); }; document.body.appendChild(m); }
  m.innerHTML = `<div class="kartu-wrap"><div id="kartuZoomBox">${html}</div><div class="kartu-aksi"><button class="btn" id="kartuBtnDl" onclick="kartuUnduh()">⬇️ Download</button><button class="btn" id="kartuBtnBagi" style="background:#25a244" onclick="kartuBagikan()">📤 Bagikan</button><button class="btn" style="background:#6b7f99" onclick="kartuTutup()">Tutup</button></div></div>`;
  m.classList.remove('hidden'); document.body.classList.add('kartu-open');
  kartuZoomSet(1); kartuPinchPasang(m); modalPush(kartuTutupUI);
}
let KZ = 1;
function kartuZoomSet(z){
  KZ = Math.max(1, Math.min(3, Math.round(z * 100) / 100));
  const b = document.getElementById('kartuZoomBox'), t = document.getElementById('kartuZoomTxt');
  if(b) b.style.zoom = KZ;
  if(t) t.textContent = Math.round(KZ * 100) + '%';
}
function kartuZoom(d){ kartuZoomSet(KZ + d); }
function kartuPinchPasang(m){ // cubit dua jari untuk memperbesar / memperkecil
  if(m._pinch) return; m._pinch = true;
  let d0 = 0, z0 = 1;
  const jarak = e => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  m.addEventListener('touchstart', e => { if(e.touches.length === 2){ d0 = jarak(e); z0 = KZ; } }, { passive: true });
  m.addEventListener('touchmove', e => { if(e.touches.length === 2 && d0){ e.preventDefault(); kartuZoomSet(z0 * jarak(e) / d0); } }, { passive: false });
  m.addEventListener('touchend', e => { if(e.touches.length < 2) d0 = 0; }, { passive: true });
}
/* ---- gambar kartu (JPEG) digambar langsung dengan canvas: hasil sama di semua HP, tidak ikut zoom layar ---- */
function kImg(src){ return new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; }); }
function kWrap(c, t, w){ const out = []; String(t).split('\n').forEach(par => { let line = ''; par.split(' ').forEach(w1 => { const x = line ? line + ' ' + w1 : w1; if(c.measureText(x).width > w && line){ out.push(line); line = w1; } else line = x; }); out.push(line); }); return out; }
function kGambar(c, K, W, logo, dry){
  const P = 44, F = 'Arial, Helvetica, sans-serif'; let y = P;
  if(!dry){ c.fillStyle = '#fff'; c.fillRect(0, 0, W, 99999); }
  c.fillStyle = '#111'; c.textBaseline = 'top'; c.textAlign = 'center'; c.font = '800 36px ' + F; c.fillText(K.judul, W / 2, y + 6); y += 70;
  // info 2 kolom
  const colW = (W - 2 * P - 30) / 2, lab = colW * .42; c.textAlign = 'left'; c.font = '26px ' + F;
  const ys = [y, y];
  K.info.forEach((r, i) => { const j = i % 2, x = P + j * (colW + 30); c.font = (r[2] ? '700 ' : '400 ') + '26px ' + F; const L = kWrap(c, r[1], colW - lab - 14);
    if(!dry){ c.font = '400 26px ' + F; c.fillStyle = '#333'; c.fillText(r[0], x, ys[j]); c.fillStyle = '#111'; c.font = (r[2] ? '700 ' : '400 ') + '26px ' + F; L.forEach((l, n) => c.fillText(l, x + lab, ys[j] + n * 34)); }
    ys[j] += L.length * 34 + 8; });
  y = Math.max(ys[0], ys[1]);
  y += 14;
  // tabel
  const hd = ['NO', 'Keterangan', 'Jatuh Tempo', 'Tgl Pembayaran', 'Jumlah', 'Telat', 'Status'], fr = [.06, .17, .17, .19, .15, .11, .15], TW = W - 2 * P;
  const xs = []; let ax = P; fr.forEach(f => { xs.push(ax); ax += f * TW; }); xs.push(P + TW);
  const RH = 54; c.font = '600 22px ' + F;
  if(!dry){ c.fillStyle = '#19d3e3'; c.fillRect(P, y, TW, RH); }
  const drow = (cells, yy, bold, red) => { cells.forEach((t, i) => { c.font = (bold ? '600 ' : '400 ') + '22px ' + F; c.fillStyle = red && i === 5 ? '#c0392b' : '#111'; if(red && i === 5) c.font = '700 22px ' + F;
    const cw = xs[i + 1] - xs[i]; let tx = xs[i] + cw / 2; c.textAlign = 'center'; if(i === 4 && !bold){ c.textAlign = 'right'; tx = xs[i + 1] - 10; }
    let tt = String(t); while(c.measureText(tt).width > cw - 8 && tt.length > 3) tt = tt.slice(0, -1); c.fillText(tt, tx, yy + 16); }); };
  if(!dry) drow(hd, y, true, false);
  let ty = y; y += RH;
  K.rows.forEach(r => { if(!dry) drow(r.slice(0, 7), y, false, r[7]); y += RH; });
  if(!dry){ c.strokeStyle = '#000'; c.lineWidth = 2; c.strokeRect(P, ty, TW, y - ty); xs.forEach(x => { c.beginPath(); c.moveTo(x, ty); c.lineTo(x, y); c.stroke(); });
    for(let yy = ty + RH; yy < y; yy += RH){ c.beginPath(); c.moveTo(P, yy); c.lineTo(P + TW, yy); c.stroke(); } }
  y += 36;
  // tanda tangan
  const cx = W - P - 190; c.textAlign = 'center'; c.font = '24px ' + F; c.fillStyle = '#111';
  if(!dry){ c.fillText(K.tgl, cx, y); if(logo) c.drawImage(logo, cx - 95, y + 36, 190, 190 * logo.height / logo.width); c.fillText('Pengurus Koperasi', cx, y + 36 + (logo ? 190 * logo.height / logo.width : 60) + 54); }
  y += 36 + (logo ? 190 * logo.height / logo.width : 60) + 54 + 28 + P;
  return Math.ceil(y);
}
async function kartuGambar(){
  const K = window.KARTU_CUR; if(!K) throw new Error('Kartu belum dibuka');
  const W = 1200, logo = await kImg('logo-intisel.png');
  const h = kGambar(document.createElement('canvas').getContext('2d'), K, W, logo, true);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = h; const c = cv.getContext('2d');
  kGambar(c, K, W, logo, false);
  // watermark transparan, jarang-jarang
  c.save(); c.globalAlpha = .13; c.fillStyle = '#134e8a'; c.font = '700 22px Arial, sans-serif';
  for(let ry = 60, n = 0; ry < h + 200; ry += 250, n++) for(let rx = (n % 2 ? 260 : 20); rx < W + 200; rx += 520){ c.save(); c.translate(rx, ry); c.rotate(-28 * Math.PI / 180); c.fillText('KOPERASI INTISEL', 0, 0); c.restore(); }
  c.restore();
  return await new Promise(ok => cv.toBlob(ok, 'image/jpeg', .92));
}
function kartuNama(){ const K = window.KARTU_CUR; return 'Kartu-Pinjaman-' + K.id + '-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '.jpg'; }
async function kartuUnduh(){
  const b = document.getElementById('kartuBtnDl'); const t0 = b.innerText; b.disabled = true; b.innerText = 'Menyiapkan...';
  try{ const blob = await kartuGambar(), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = kartuNama(); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 8000); }
  catch(e){ alert('Gagal membuat gambar kartu. Coba lagi.'); }
  b.disabled = false; b.innerText = t0;
}
async function kartuBagikan(){
  const b = document.getElementById('kartuBtnBagi'); const t0 = b.innerText; b.disabled = true; b.innerText = 'Menyiapkan...';
  try{
    const blob = await kartuGambar(), f = new File([blob], kartuNama(), { type: 'image/jpeg' });
    if(navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: 'Kartu Pinjaman Koperasi Intisel', text: 'Bukti pembayaran ' + window.KARTU_CUR.id });
    else { await kartuUnduh(); alert('Perangkat ini belum mendukung bagikan langsung. Gambar sudah disimpan, silakan lampirkan secara manual ke WhatsApp.'); }
  }catch(e){ if(e && e.name !== 'AbortError') alert('Gagal membagikan kartu. Coba tombol Download.'); }
  b.disabled = false; b.innerText = t0;
}
function modalPush(tutupUI){ history.pushState({r: currentRoute}, '', '#' + currentRoute); window.modalRiwayat = tutupUI; } // popup ikut riwayat: tombol back HP = tutup popup
function kartuTutupUI(){ const m = document.getElementById('kartuModal'); if(m) m.classList.add('hidden'); document.body.classList.remove('kartu-open'); }
function kartuTutup(){ if(window.modalRiwayat) history.back(); else kartuTutupUI(); }


/* ===== LOGIN ANGGOTA: PIN / OTP EMAIL / BUAT PIN ===== */
let lgNik = '', lgToken = '';
function lgMode(m){ // 'pin' | 'otp' | 'setpin'
  ['pin', 'otp', 'setpin'].forEach(k => { const e = $({pin: 'lgPin', otp: 'lgOtp', setpin: 'lgSetPin'}[k]); if(e) e.style.display = k === m ? 'block' : 'none'; });
  if(m === 'setpin') { $('nikInput').readOnly = true; setTimeout(() => $('pinBaru1').focus(), 50); } else $('nikInput').readOnly = false;
  if(m !== 'setpin'){ $('pinBaru1').value = ''; $('pinBaru2').value = ''; }
  $('hasilCek').innerHTML = '';
}
function lgReset(){ // NIK diubah / layar login dibuka ulang: kembali ke masuk dengan PIN
  lgNik = ''; lgToken = ''; if($('otpWrap')) $('otpWrap').style.display = 'none'; if($('otpInput')) $('otpInput').value = ''; if($('lgPin')) lgMode('pin');
}
let lgPopT = 0;
function lgPesan(t, ok){ // peringatan login tampil sebagai popup di atas layar (tidak tertutup keypad / keterbatasan layar HP)
  $('hasilCek').innerHTML = ''; let el = $('lgPop'); clearTimeout(lgPopT);
  if(!t){ if(el) el.style.display = 'none'; return; }
  if(!ok){ if(el) el.style.display = 'none'; alert(t); return; } // peringatan/kesalahan: dialog 'Koperasi Intisel' di tengah layar, sama seperti 'Sesi berakhir'
  if(!el){ el = document.createElement('div'); el.id = 'lgPop'; el.setAttribute('role', 'alert'); el.onclick = () => { el.style.display = 'none'; }; document.body.appendChild(el); }
  el.className = ok ? 'lgpop ok' : 'lgpop err'; el.innerHTML = `<b>${ok ? '✅' : '⚠️'}</b><span>${esc(t)}</span><i>✕</i>`; el.style.display = 'flex';
  lgPopT = setTimeout(() => { el.style.display = 'none'; }, ok ? 6000 : 5000);
}
const lgNikVal = () => $('nikInput').value.replace(/\D/g, '');
async function loginPin(){
  if(cekBusy) return;
  const nik = lgNikVal(), pin = $('pinInput').value.replace(/\D/g, '');
  if(nik.length < 4 || pin.length !== 6){ lgPesan('Isi NIK dulu, lalu masukkan PIN 6 angka'); pinPadKosong(); return; }
  cekBusy = true; const btn = $('btnCekNik'); btn.disabled = true; btn.innerText = 'Memeriksa...';
  pinPadSibuk(true, 'Memeriksa PIN...');
  let token = '';
  try{
    const r = await fetch(API_URL, {method:'POST', body:JSON.stringify({a:'pin_login', nik, pin})}).then(x => x.json());
    if(!r.ok){ lgPesan(r.msg || 'NIK atau PIN tidak sesuai'); pinPadKosong(); if(r.perluOtp) lgMode('otp'), lgPesan(r.msg); return; }
    pinPadKosong(); nikSimpanIngat(nik);
    if(r.wajibPin){ lgNik = nik; lgToken = r.atoken; lgMode('setpin'); lgPesan('PIN Anda adalah PIN sementara dari pengurus. Buat PIN baru untuk melanjutkan.', true); return; }
    token = r.atoken;
  }catch(e){ lgPesan('Gagal terhubung ke server. Periksa internet lalu coba lagi.'); }
  finally{ cekBusy = false; btn.disabled = false; btn.innerText = '🔍 Masuk'; if(!token) pinPadSibuk(false); }
  if(token){ pinPadSibuk(true, 'Berhasil, memuat data Anda...'); try{ await masukDenganToken(nik, token); } finally{ pinPadSibuk(false); } }
}
function nikSimpanIngat(nik){ try{ localStorage.setItem(NIK_KEY, nik); }catch(e){} }
async function otpMintaAng(){
  const nik = lgNikVal(); if(nik.length < 4){ lgPesan('Isi NIK dulu di atas'); return; }
  const btn = $('btnOtpMinta'); btn.disabled = true; btn.innerText = 'Mengirim...';
  try{
    const r = await fetch(API_URL, {method:'POST', body:JSON.stringify({a:'otp_a_req', nik})}).then(x => x.json());
    lgPesan(r.msg || (r.ok ? 'Kode dikirim.' : 'Gagal mengirim kode.'), r.ok);
    if(r.ok){ $('otpWrap').style.display = 'block'; $('otpInput').value = ''; $('otpInput').focus(); }
  }catch(e){ lgPesan('Gagal terhubung ke server. Coba lagi.'); }
  setTimeout(() => { btn.disabled = false; btn.innerText = '✉️ Kirim Ulang Kode'; }, 20000);
}
async function otpVerAng(){
  if(cekBusy) return;
  const nik = lgNikVal(), kode = $('otpInput').value.replace(/\D/g, '');
  if(kode.length !== 6){ lgPesan('Isi kode 6 angka dari email'); return; }
  cekBusy = true; const btn = $('btnOtpVer'); btn.disabled = true; btn.innerText = 'Memeriksa...';
  let token = '';
  try{
    const r = await fetch(API_URL, {method:'POST', body:JSON.stringify({a:'otp_a_ver', nik, kode, reset: true})}).then(x => x.json());
    if(!r.ok){ lgPesan(r.msg || 'Kode salah atau kedaluwarsa'); return; }
    $('otpInput').value = ''; nikSimpanIngat(nik);
    lgNik = nik; lgToken = r.atoken; lgMode('setpin'); lgPesan('Email terverifikasi. Buat PIN baru Anda.', true);
  }catch(e){ lgPesan('Gagal terhubung ke server. Coba lagi.'); }
  finally{ cekBusy = false; btn.disabled = false; btn.innerText = '✔ Verifikasi'; }
}
async function pinAturAng(){
  if(cekBusy) return;
  const p1 = $('pinBaru1').value, p2 = $('pinBaru2').value;
  if(!/^\d{6}$/.test(p1)){ lgPesan('PIN harus 6 angka'); return; }
  if(p1 !== p2){ lgPesan('Kedua PIN tidak sama'); return; }
  cekBusy = true; const btn = $('btnPinSimpan'); btn.disabled = true; btn.innerText = 'Menyimpan...';
  let ok = false;
  try{
    const r = await fetch(API_URL, {method:'POST', body:JSON.stringify({a:'pin_atur', nik: lgNik, atoken: lgToken, pinBaru: p1})}).then(x => x.json());
    if(r.expired){ lgPesan('Waktu habis. Silakan ulangi dari awal.'); lgMode('pin'); return; }
    if(!r.ok){ lgPesan(r.msg || 'Gagal menyimpan PIN'); return; }
    ok = true;
  }catch(e){ lgPesan('Gagal terhubung ke server. Coba lagi.'); }
  finally{ cekBusy = false; btn.disabled = false; btn.innerText = '💾 Simpan PIN & Masuk'; }
  if(ok){ const n = lgNik, t = lgToken; $('pinBaru1').value = ''; $('pinBaru2').value = ''; await masukDenganToken(n, t); }
}
async function pinGantiAng(){ // anggota yang sudah masuk: ganti PIN (butuh PIN lama)
  if(!anggotaAktif) return;
  const lama = $('pinLama').value, p1 = $('pinGanti1').value, p2 = $('pinGanti2').value;
  if(!/^\d{6}$/.test(lama) || !/^\d{6}$/.test(p1)){ alert('PIN lama dan PIN baru harus 6 angka.'); return; }
  if(p1 !== p2){ alert('Kedua PIN baru tidak sama.'); return; }
  const btn = $('btnPinGanti'); btn.disabled = true;
  try{
    const r = await apiPost({a:'pin_atur', nik: anggotaAktif.nik, atoken: anggotaAktif.atoken, pinLama: lama, pinBaru: p1});
    alert(r.ok ? '✅ PIN berhasil diganti.' : '❌ ' + (r.msg || 'Gagal mengganti PIN'));
    if(r.ok){ $('pinLama').value = ''; $('pinGanti1').value = ''; $('pinGanti2').value = ''; }
  }catch(e){ alert('Gagal terhubung ke server.'); }
  btn.disabled = false;
}

/* ===== Catat akses (aplikasi terpasang / browser) — hanya waktu, mode, jenis HP; maks sekali per 30 menit per perangkat ===== */
function aksesInfo(){
  const mm = q => { try{ return !!(window.matchMedia && matchMedia(q).matches); }catch(e){ return false; } };
  const pwa = mm('(display-mode: standalone)') || mm('(display-mode: fullscreen)') || mm('(display-mode: minimal-ui)') || navigator.standalone === true || (document.referrer || '').indexOf('android-app://') === 0;
  const ua = navigator.userAgent || '', ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return {mode: pwa ? 'PWA' : 'BROWSER', os: /android/i.test(ua) ? 'ANDROID' : ios ? 'IOS' : 'LAINNYA'};
}
function aksesLapor(){
  try{
    const a = anggotaAktif; if(!a) return;
    const k = 'akses_t', t = parseInt(sessionStorage.getItem(k) || '0', 10) || 0, nik = sessionStorage.getItem('akses_n') || '';
    if(nik === a.nik && Date.now() - t < 30 * 60000) return;
    sessionStorage.setItem(k, String(Date.now())); sessionStorage.setItem('akses_n', a.nik);
    apiPost(Object.assign({a:'akses_catat', nik:a.nik, atoken:a.atoken}, aksesInfo())).catch(() => {});
  }catch(e){}
}
