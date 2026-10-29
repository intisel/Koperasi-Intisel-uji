var pkBisaVerif = false;
// Dashboard Pengurus & Pimpinan: login (kode email / password), keputusan, angsuran & pelunasan, riwayat
let pkToken = sessionStorage.getItem('pk_token') || '', pkEmailAktif = '', pkBisaCatat = false, pkHariIni = '';
const pkRp = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const pkIc = v => v === 'Y' ? '✅' : v === 'N' ? '❌' : '⏳';
const pkTgl = s => s ? String(s).split('-').reverse().join('/') : '-';
const pkLabel = {REVIEW_PENGURUS:'⏳ Direview Pengurus', MENUNGGU_PIMPINAN:'⏳ Menunggu Pimpinan', MENUNGGU_PENCAIRAN:'💸 Menunggu Pencairan', DISETUJUI:'✅ Disetujui (berjalan)', LUNAS:'🎉 Lunas', DITOLAK:'❌ Ditolak'};
const pkBadge = j => j === 'KASBON' ? '<span class="badge" style="background:#fff3cd;color:#8a6100">KASBON</span> ' : '';
const pkApi = async body => (await fetch(API_URL, {method:'POST', body:JSON.stringify(body)})).json();
const pkPesan = (m, err, el) => { $(el || 'pkPesan').innerHTML = m ? `<div class="${err ? 'err' : 'ok'}">${esc(m)}</div>` : ''; };
const pkEmailVal = () => $('pkEmail').value.trim().toLowerCase();
const pkEmailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const pkPwErr = p => p.length < 8 ? 'Password minimal 8 karakter.' : (!/[A-Za-z]/.test(p) || !/\d/.test(p)) ? 'Password harus berisi huruf dan angka.' : '';
function pkLihat(ids, on){ ids.forEach(i => $(i).type = on ? 'text' : 'password'); }

// dipanggil router: 'pengurus' = layar login (sesi lama dibersihkan), 'pengurus-dashboard' = dasbor
function pengurusRender(name){
  if(name === 'pengurus'){
    if(pkToken) pkApi({a:'keluar', token:pkToken}).catch(() => {});
    pkToken = ''; sessionStorage.removeItem('pk_token');
    $('pkLogin').classList.remove('hidden'); $('pkDash').classList.add('hidden'); pkTab('pw');
  } else {
    $('pkLogin').classList.add('hidden'); $('pkDash').classList.remove('hidden');
    const v = PK_VIEW[name] || 'pkvMenu';
    document.querySelectorAll('#pkDash .pkv').forEach(e => e.classList.toggle('hidden', e.id !== v));
    if(name === 'pengurus-statistik') pkStatMuat();
    else if(name === 'pengurus-anggota') agMuat();
    else if(name === 'pengurus-laporan') lpInit();
    else if(name === 'pengurus-info') infoMuat();
    else if(name === 'pengurus-lokasi') lokMuat();
    else pkMuat();
  }
}
const PK_VIEW = {'pengurus-dashboard':'pkvMenu', 'pengurus-validasi':'pkvValidasi', 'pengurus-cair':'pkvCair', 'pengurus-berjalan':'pkvBerjalan', 'pengurus-statistik':'pkvStatistik', 'pengurus-anggota':'pkvAnggota', 'pengurus-laporan':'pkvLaporan', 'pengurus-info':'pkvInfo', 'pengurus-lokasi':'pkvLokasi'};
function pkTab(t){
  $('pkBoxKode').classList.toggle('hidden', t !== 'kode'); $('pkBoxPw').classList.toggle('hidden', t !== 'pw'); $('pkBoxAtur').classList.toggle('hidden', t !== 'atur');
  $('pkTabKode').classList.toggle('on', t === 'kode'); $('pkTabPw').classList.toggle('on', t === 'pw');
  pkPesan('');
}
function pkMasuk(r){ // sesi berhasil dibuat
  pkToken = r.token; sessionStorage.setItem('pk_token', pkToken);
  ['pkKode','pkPw','pkAturKode','pkBaru','pkBaru2'].forEach(i => $(i).value = ''); $('pkKodeWrap').classList.add('hidden');
  goReplace('pengurus-dashboard'); // ganti layar login di riwayat: tombol back dari dasbor langsung ke halaman depan
}
function pkSesiHapus(){ // dipanggil saat berpindah ke Anggota: sesi pengurus dihapus
  if(pkToken){ pkApi({a:'keluar', token:pkToken}).catch(() => {}); }
  pkToken = ''; sessionStorage.removeItem('pk_token');
}
function pengurusBuka(){ // tombol Pengurus di halaman depan: sesi aktif -> langsung ke dasbor; sesi anggota dihapus
  if(typeof anggotaSesiHapus === 'function') anggotaSesiHapus();
  if(pkToken) go('pengurus-dashboard'); else go('pengurus');
}

/* --- login kode email --- */
async function pkMinta(){
  const email = pkEmailVal();
  if(!pkEmailOk(email)){ pkPesan('Format email tidak valid.', true); return; }
  const b = $('pkBtnMinta'); b.disabled = true; b.innerText = 'Mengirim...';
  try{
    const r = await pkApi({a:'otp_req', email});
    pkPesan(r.msg, !r.ok);
    if(r.ok){ pkEmailAktif = email; $('pkKodeWrap').classList.remove('hidden'); $('pkKode').focus(); }
  }catch(e){ pkPesan('Gagal terhubung ke server.', true); }
  b.disabled = false; b.innerText = 'Kirim Kode';
}
async function pkVerifikasi(){
  const kode = $('pkKode').value.replace(/\D/g, '');
  if(kode.length !== 6){ pkPesan('Masukkan 6 angka kode.', true); return; }
  const b = $('pkBtnVer'); b.disabled = true; b.innerText = 'Memeriksa...';
  try{
    const r = await pkApi({a:'otp_ver', email:pkEmailAktif || pkEmailVal(), kode});
    if(r.ok) pkMasuk(r); else pkPesan(r.msg, true);
  }catch(e){ pkPesan('Gagal terhubung ke server.', true); }
  b.disabled = false; b.innerText = 'Masuk';
}

/* --- login password, aktivasi, lupa password --- */
function pkTampilAtur(info){
  pkEmailAktif = pkEmailVal(); pkTab('atur');
  $('pkAturInfo').innerText = info; $('pkAturKode').focus();
}
async function pkLoginPw(){
  const email = pkEmailVal(), password = $('pkPw').value;
  if(!pkEmailOk(email)){ pkPesan('Isi email dengan benar.', true); return; }
  if(!password){ pkPesan('Isi password.', true); return; }
  const b = $('pkBtnPw'); b.disabled = true; b.innerText = 'Memeriksa...';
  try{
    const r = await pkApi({a:'pw_login', email, password});
    if(r.ok) pkMasuk(r);
    else if(r.aktivasi){ pkTampilAtur(r.msg); }
    else pkPesan(r.msg, true);
  }catch(e){ pkPesan('Gagal terhubung ke server.', true); }
  b.disabled = false; b.innerText = 'Masuk';
}
async function pkLupa(){
  const email = pkEmailVal();
  if(!pkEmailOk(email)){ pkPesan('Isi email Anda di kolom atas terlebih dulu.', true); return; }
  try{
    const r = await pkApi({a:'otp_req', email});
    if(r.ok) pkTampilAtur('Jika email terdaftar, kode 6 angka telah dikirim. Masukkan kode dan buat password baru.');
    else pkPesan(r.msg, true);
  }catch(e){ pkPesan('Gagal terhubung ke server.', true); }
}
async function pkAtur(){
  const kode = $('pkAturKode').value.replace(/\D/g, ''), baru = $('pkBaru').value, baru2 = $('pkBaru2').value;
  if(kode.length !== 6){ pkPesan('Masukkan 6 angka kode.', true); return; }
  const e = pkPwErr(baru); if(e){ pkPesan(e, true); return; }
  if(baru !== baru2){ pkPesan('Ulangi password tidak sama.', true); return; }
  const b = $('pkBtnAtur'); b.disabled = true; b.innerText = 'Menyimpan...';
  try{
    const r = await pkApi({a:'pw_atur', email:pkEmailAktif || pkEmailVal(), kode, baru});
    if(r.ok) pkMasuk(r); else pkPesan(r.msg, true);
  }catch(e){ pkPesan('Gagal terhubung ke server.', true); }
  b.disabled = false; b.innerText = 'Simpan & Masuk';
}
function pkGantiTampil(on){
  const el = $('pkGanti'), tampil = on === undefined ? el.classList.contains('hidden') : on;
  el.classList.toggle('hidden', !tampil); pkPesan('', false, 'pkGantiPesan');
  ['pkLama','pkGBaru','pkGBaru2'].forEach(i => $(i).value = '');
}
async function pkGantiSimpan(){
  const lama = $('pkLama').value, baru = $('pkGBaru').value;
  if(!lama){ pkPesan('Isi password lama.', true, 'pkGantiPesan'); return; }
  const e = pkPwErr(baru); if(e){ pkPesan(e, true, 'pkGantiPesan'); return; }
  if(baru !== $('pkGBaru2').value){ pkPesan('Ulangi password tidak sama.', true, 'pkGantiPesan'); return; }
  try{
    const r = await pkApi({a:'pw_ganti', token:pkToken, lama, baru});
    if(r.expired){ pkExpired(); return; }
    pkPesan(r.msg, !r.ok, 'pkGantiPesan');
    if(r.ok) ['pkLama','pkGBaru','pkGBaru2'].forEach(i => $(i).value = '');
  }catch(e){ pkPesan('Gagal terhubung ke server.', true, 'pkGantiPesan'); }
}
async function pkKeluar(){
  try{ await pkApi({a:'keluar', token:pkToken}); }catch(e){}
  pkToken = ''; sessionStorage.removeItem('pk_token');
  const lv = ROUTE_LEVEL[currentRoute] || 0;
  if(lv > 0) history.go(-lv); else goReplace('pengurus');
}
function pkExpired(){ pkToken = ''; sessionStorage.removeItem('pk_token'); goReplace('pengurus'); pkPesan('Sesi berakhir. Silakan masuk lagi.', true); }

/* --- dasbor --- */
async function pkMuat(){
  $('pkMenunggu').innerHTML = '<p class="small">Memuat...</p>';
  try{
    const r = await pkApi({a:'dasbor', token:pkToken});
    if(!r.ok){ if(r.expired) pkExpired(); else $('pkMenunggu').innerHTML = `<div class="err">${esc(r.msg)}</div>`; return; }
    pkBisaCatat = r.bisaCatat; pkBisaVerif = !!r.bisaVerif; pkHariIni = r.hariIni; $('tileLokasi').classList.toggle('hidden', !(r.lokasi !== undefined ? r.lokasi : r.ketua));
    $('pkNama').innerText = r.nama; $('pkPeran').innerText = r.jabatan || r.peran; profilBarPk(r); if(!$('avPk').dataset.foto) fotoTerapkan($('avPk'), fotoCache.pk, r.nama); fotoMuatPk();
    const bj = r.rekap.berjalan;
    $('pkMenunggu').innerHTML = r.menunggu.length ? r.menunggu.map(pkKartu).join('') : '<p class="small">Tidak ada pengajuan yang menunggu keputusan Anda. ✅</p>';
    fotoMuatPelamar(r.menunggu);
    pkBadge2('pbValidasi', r.menunggu.length); pkBadge2('pbCair', r.pencairan.length); pkBadge2('pbBerjalan', r.laporan.length + bj.terlambat);
    $('byTabNV').innerText = r.laporan.length ? '(' + r.laporan.length + ')' : ''; $('byTabNP').innerText = bj.terlambat ? '(⚠️' + bj.terlambat + ')' : '';
    if(!pkBayarTabSet){ pkBayarTabSet = true; pkBayarTab(r.laporan.length ? 'V' : 'P'); }
    $('pkPencairan').innerHTML = r.pencairan.length ? r.pencairan.map(pkCairKartu).join('') : '<p class="small">Tidak ada pinjaman yang menunggu pencairan.</p>';
    $('pkLaporan').innerHTML = r.laporan.length ? r.laporan.map(pkLaporanKartu).join('') : '<p class="small">Tidak ada laporan pembayaran yang menunggu verifikasi.</p>';
    $('pkPinjaman').innerHTML = r.pinjaman.length ? r.pinjaman.map(pkPinjamanKartu).join('') : '<p class="small">Tidak ada pinjaman yang sedang berjalan.</p>'; pkCari();
    $('pkRiwayat').innerHTML = r.riwayat.length ? r.riwayat.map(pkBaris).join('') : '<p class="small">Belum ada pengajuan.</p>';
  }catch(e){ $('pkMenunggu').innerHTML = '<div class="err">Gagal memuat data. Coba ↻ Muat ulang.</div>'; }
}
let pkBayarTabSet = false;
function pkBayarTab(t){ ['V','P'].forEach(k => { $('byTab' + k).classList.toggle('hidden', t !== k); $('byTabBtn' + k).classList.toggle('on', t === k); }); }
function pkBadge2(id, n){ const e = $(id); e.innerText = n; e.style.display = n > 0 ? 'block' : 'none'; }
function pkVotes(p){
  const k = x => `<div>${pkIc(x.v)} ${esc(x.nama)}${x.jabatan ? ' <span class="small">(' + esc(x.jabatan) + ')</span>' : ''}</div>` + (x.a ? `<div style="margin:0 0 4px 22px"><i>“${esc(x.a)}”</i></div>` : '');
  return p.pengurus.map(k).join('') + (p.status !== 'REVIEW_PENGURUS' ? k(p.pimpinan) : '');
}
function pkKartu(p){
  const d = p.detail, kas = p.jenis === 'KASBON', row = (a, b) => `<tr><td style="padding:2px 10px 2px 0;color:#5a7aa0;vertical-align:top">${a}</td><td><b>${esc(b)}</b></td></tr>`;
  const rows = kas
    ? row('Jenis', 'KASBON (30 hari)') + row('Jabatan', d.posisi) + row('Masa kerja', d.masaKerja) + row('Kasbon', pkRp(p.nominal)) + row('Alasan', d.alasan) +
      row('Gaji terakhir', pkRp(d.gaji1)) + row('Kontak darurat', d.namaDarurat + ' (' + d.hubungan + ') ' + d.hpDarurat)
    : row('Jabatan', d.posisi) + row('Masa kerja', d.masaKerja) + row('Pinjaman', pkRp(p.nominal) + ' / ' + p.tenor + ' bln') + row('Angsuran', pkRp(Math.round(p.nominal / p.tenor)) + '/bln') +
      row('Infaq', pkRp(d.infaq)) + row('Alasan', d.alasan) + row('Pinjaman sebelumnya', d.pernahPinjam + (d.tglLunas ? ' (lunas ' + d.tglLunas + ')' : '')) + row('Gaji ditahan', d.gajiDitahan) +
      row('Gaji 3 bulan', pkRp(d.gaji1) + ' | ' + pkRp(d.gaji2) + ' | ' + pkRp(d.gaji3)) + row('Kontak darurat', d.namaDarurat + ' (' + d.hubungan + ') ' + d.hpDarurat);
  return `<div class="ok" style="background:#fff;margin-bottom:12px" id="pk-${esc(p.id)}">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px"><span class="av sm" data-nik="${esc(p.nik)}" data-nama="${esc(p.nama)}">${esc(fotoInisial(p.nama))}</span><div>${pkBadge(p.jenis)}<b>${esc(p.nama)}</b> <span class="small">(${esc(p.id)} • ${esc(p.waktu)})</span></div></div>
    <table class="small" style="margin:6px 0;border-collapse:collapse">${rows}</table>
    <div class="small" style="margin-bottom:6px">${pkVotes(p)}</div>
    ${pilihanCair(p)}
    <textarea id="pkA-${esc(p.id)}" rows="2" placeholder="Komentar (wajib bila menolak). Komentar tampil di status anggota."></textarea>
    <div style="display:flex;gap:8px">
      <button class="btn" style="background:#16a34a" onclick="pkVote('${esc(p.id)}','Y')">✔ Setuju</button>
      <button class="btn" style="background:#dc2626" onclick="pkVote('${esc(p.id)}','N')">✖ Tolak</button>
    </div></div>`;
}
function pilihanCair(p){ // hanya muncul untuk pimpinan pada pinjaman koperasi; kasbon otomatis urgen
  const o = p.detail.opsiPencairan; if(!o) return '';
  if(p.jenis === 'KASBON') return `<div class="ok" style="margin:8px 0"><b>💸 Pencairan:</b> urgen, maksimal 2 hari kerja (paling lambat ${pkTgl(o.URGEN)}).</div>`;
  return `<div class="ok" style="margin:8px 0"><b>💸 Jadwal pencairan (bila disetujui)</b>
    <label style="display:flex;gap:8px;align-items:flex-start;margin:6px 0"><input type="radio" name="pc-${esc(p.id)}" value="REGULER" checked style="width:auto;margin-top:3px"><span>Reguler - tanggal 6 (<b>${pkTgl(o.REGULER)}</b>)</span></label>
    <label style="display:flex;gap:8px;align-items:flex-start;margin:6px 0"><input type="radio" name="pc-${esc(p.id)}" value="URGEN" style="width:auto;margin-top:3px"><span>Urgen - maksimal 2 hari kerja (paling lambat <b>${pkTgl(o.URGEN)}</b>)</span></label></div>`;
}
const pkCairFoto = {}; // id pinjaman -> foto bukti transfer (data URL JPEG) yang sudah dikompres
function pkKompres(file){ // kecilkan foto di HP (maks 1280px, JPEG) supaya ringan dikirim
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
async function pkCairPilih(id, input){
  const f = input.files && input.files[0]; if(!f) return;
  try{
    pkCairFoto[id] = await pkKompres(f);
    $('pkCP-' + id).src = pkCairFoto[id]; $('pkCPW-' + id).style.display = 'block';
    $('pkCI-' + id).innerText = 'Ukuran terkirim ±' + Math.round(pkCairFoto[id].length * 0.75 / 1024) + ' KB';
  }catch(e){ alert(e.message); }
  input.value = '';
}
function pkCairHapusFoto(id){ delete pkCairFoto[id]; $('pkCPW-' + id).style.display = 'none'; $('pkCP-' + id).removeAttribute('src'); }
function pkCairKartu(p){
  const jenis = p.pencairanJenis === 'REGULER' ? 'Reguler (tgl 6)' : 'Urgen (maks 2 hari kerja)';
  const aksi = pkBisaCatat ? `<label class="small" style="margin:6px 0 0">Tanggal dana ditransfer</label>
    <input type="date" id="pkC-${esc(p.id)}" value="${esc(pkHariIni)}" min="${esc(p.setujuTgl)}" max="${esc(pkHariIni)}" style="margin-bottom:8px">
    <label class="small" style="margin:6px 0 4px;display:block"><b>Bukti transfer</b> (wajib) — foto/screenshot transfer ke rekening anggota</label>
    <input type="file" accept="image/*" id="pkCF-${esc(p.id)}" onchange="pkCairPilih('${esc(p.id)}', this)" style="margin-bottom:6px">
    <div id="pkCPW-${esc(p.id)}" style="display:${pkCairFoto[p.id] ? 'block' : 'none'};margin-bottom:8px">
      <img id="pkCP-${esc(p.id)}" alt="Bukti transfer" ${pkCairFoto[p.id] ? 'src="' + pkCairFoto[p.id] + '"' : ''} style="max-width:100%;max-height:220px;border-radius:10px;border:1px solid #b9d2f0"><br>
      <span class="small" id="pkCI-${esc(p.id)}"></span> <a href="#" class="small" onclick="pkCairHapusFoto('${esc(p.id)}');return false" style="color:#c0392b">Hapus foto</a>
    </div>
    <button class="btn" style="background:#0f766e;padding:12px;font-size:14px" onclick="pkCairkan('${esc(p.id)}')">✔ Sudah dicairkan</button>` : '<p class="small">Pencairan dicatat oleh pengurus.</p>';
  return `<div class="ok" style="background:#fff;margin-bottom:12px${p.telat ? ';border-color:#e74c3c' : ''}" id="pc-${esc(p.id)}">
    ${pkBadge(p.jenis)}<b>${esc(p.nama)}</b> <span class="small">(${esc(p.id)})</span>${p.telat ? ' <span style="color:#c0392b;font-weight:800">⚠️ WAKTUNYA / TERLEWAT</span>' : ''}<br>
    <span class="small">${pkRp(p.nominal)} / ${p.jenis === 'KASBON' ? '30 hari' : p.tenor + ' bln'} • Rek. ${esc(p.rek)}</span><br>
    <span class="small">${jenis} • target <b>${pkTgl(p.target)}</b></span>${aksi}</div>`;
}
async function pkCairkan(id){
  const tgl = $('pkC-' + id).value, foto = pkCairFoto[id] || '';
  if(!foto){ alert('Lampirkan foto bukti transfer dulu (ambil foto atau pilih dari galeri).'); return; }
  if(!await dialogKonfirmasi('Tandai pinjaman ' + id + ' sudah dicairkan pada ' + pkTgl(tgl) + '? Bukti transfer akan disimpan. Jadwal angsuran akan dibuat sejak tanggal ini.')) return;
  document.querySelectorAll('#pc-' + id + ' button').forEach(b => b.disabled = true);
  try{
    const r = await pkApi({a:'cairkan', token:pkToken, id, tgl, foto});
    if(r.expired){ pkExpired(); return; }
    if(r.ok) delete pkCairFoto[id];
    alert(r.ok ? r.msg : '❌ ' + r.msg);
  }catch(e){ alert('Gagal mengunggah. Periksa koneksi lalu coba lagi.'); }
  pkMuat();
}
async function pkLihatBuktiCair(id){ // pengurus/pimpinan melihat bukti transfer pencairan
  const box = $('bc-' + id); if(!box) return; box.innerHTML = '<span class="small">Memuat foto...</span>';
  try{
    const r = await pkApi({a:'bukti_cair', token:pkToken, id});
    if(r.expired){ pkExpired(); return; }
    if(!r.ok){ box.innerHTML = `<div class="err">${esc(r.msg)}</div>`; return; }
    const img = document.createElement('img'); img.src = r.data; img.alt = 'Bukti transfer pencairan';
    img.style.cssText = 'max-width:100%;border-radius:10px;margin-top:8px;border:1px solid #b9d2f0';
    box.innerHTML = ''; box.appendChild(img);
  }catch(e){ box.innerHTML = '<div class="err">Gagal memuat foto.</div>'; }
}
function pkBaris(p){
  return `<div style="border-bottom:1px solid #d6e6f8;padding:8px 0">${pkBadge(p.jenis)}<b>${esc(p.nama)}</b> <span class="small">${esc(p.id)} • ${esc(p.waktu)}</span><br>
    <span class="small">${pkRp(p.nominal)} / ${p.jenis === 'KASBON' ? '30 hari' : p.tenor + ' bln'}</span> • <b>${pkLabel[p.status] || esc(p.status)}</b>
    <div class="small" style="margin-top:4px">${pkVotes(p)}</div></div>`;
}
async function pkVote(id, v){
  const a = $('pkA-' + id).value.trim(), rd = document.querySelector(`input[name="pc-${id}"]:checked`), pencairan = rd ? rd.value : '';
  if(v === 'N' && !a){ alert('Alasan penolakan wajib diisi.'); $('pkA-' + id).focus(); return; }
  if(!await dialogKonfirmasi((v === 'Y' ? 'SETUJU' : 'TOLAK') + ' pengajuan ' + id + '?')) return;
  document.querySelectorAll('#pk-' + id + ' button').forEach(b => b.disabled = true);
  try{
    const r = await pkApi({a:'vote', token:pkToken, id, v, komentar:a, pencairan});
    if(r.expired){ pkExpired(); return; }
    alert(r.ok ? r.msg : '❌ ' + r.msg);
  }catch(e){ alert('Gagal terhubung ke server.'); }
  pkMuat();
}

/* --- pinjaman berjalan: catat angsuran / pelunasan --- */
function pkPinjamanKartu(p){
  if(!p.total) return `<div class="ok" style="background:#fff;margin-bottom:12px"><b>${esc(p.nama)}</b> <span class="small">(${esc(p.id)})</span><br><span class="small">Jadwal angsuran belum dibuat. Hubungi admin sistem.</span></div>`;
  const persen = Math.round(p.lunas / p.total * 100), telat = p.terlambat > 0;
  const baris = p.jadwal.map(j => {
    const lewat = j.status !== 'LUNAS' && j.due < pkHariIni;
    return `<tr><td style="padding:2px 8px 2px 0">${j.ke}</td><td style="padding:2px 8px 2px 0">${pkTgl(j.due)}</td><td style="padding:2px 8px 2px 0">${pkRp(j.jumlah)}</td>
      <td>${j.status === 'LUNAS' ? '✅ ' + pkTgl(j.tglBayar) : (lewat ? '<span style="color:#c0392b">⚠️ terlambat</span>' : '⏳')}</td></tr>`;
  }).join('');
  const id = esc(p.id), belum = p.jadwal.filter(j => j.status !== 'LUNAS'), ik = p.infaq || {target:0, terbayar:0, sisa:0, riwayat:[]};
  const aksi = !pkBisaCatat ? '<p class="small">Pencatatan angsuran dilakukan oleh pengurus.</p>' : !belum.length && !ik.sisa ? '' : `
    <button class="btn" style="padding:12px;font-size:14px;margin-top:8px" onclick="pkPanel('${id}')">✔ Tandai Lunas Angsuran Ke</button>
    <div id="pkP-${id}" style="display:${pkPanelBuka[p.id] ? 'block' : 'none'};margin-top:8px;padding:10px;border:1px solid #b9d2f0;border-radius:10px;background:#f4f9ff">
      <div class="small"><b>Pilih angsuran yang dibayar</b> (boleh lebih dari satu)</div>
      ${belum.map(j => { const lewat = j.due < pkHariIni;
        return `<label style="display:flex;gap:8px;align-items:center;margin:6px 0;font-size:14px"><input type="checkbox" class="pkK-${id}" value="${j.ke}" data-nom="${j.jumlah}" onchange="pkHitung('${id}')" style="width:auto">
        <span>Ke-${j.ke} • ${pkTgl(j.due)} • <b>${pkRp(j.jumlah)}</b>${lewat ? ' <span style="color:#c0392b">⚠️</span>' : ''}</span></label>`; }).join('')}
      ${ik.sisa > 0 ? `<label style="display:flex;gap:8px;align-items:center;margin:6px 0;font-size:14px"><input type="checkbox" id="pkIQ-${id}" data-sisa="${ik.sisa}" onchange="pkInfaqToggle('${id}')" style="width:auto">
        <span>Infaq • sisa <b>${pkRp(ik.sisa)}</b> <span class="small">(perjanjian ${pkRp(ik.target)}, terbayar ${pkRp(ik.terbayar)})</span></span></label>
        <div id="pkIW-${id}" style="display:none;margin:0 0 6px 26px"><label class="small" style="margin:0">Jumlah infaq dibayar (Rp) — boleh dicicil, boleh lebih, total akhir tidak boleh kurang</label>
        <input type="text" inputmode="numeric" id="pkIJ-${id}" oninput="this.value=fmtMoney(this.value);pkHitung('${id}')"></div>` : ''}
      <label class="small" style="margin:8px 0 0">Tanggal pembayaran</label>
      <input type="date" id="pkT-${id}" value="${esc(pkHariIni)}" max="${esc(pkHariIni)}" style="margin-bottom:8px">
      <label class="small" style="margin:0">Jumlah uang diterima (Rp)</label>
      <input type="text" inputmode="numeric" id="pkJ-${id}" placeholder="Terisi otomatis sesuai angsuran yang dipilih" oninput="pkJumlahUbah('${id}')" style="margin-bottom:8px">
      <label class="small" style="margin:0 0 4px;display:block"><b>Foto bukti pembayaran (wajib)</b></label>
      <input type="file" accept="image/*" onchange="pkBayarPilih('${id}', this)" style="margin-bottom:6px">
      <div id="pkBW-${id}" style="display:${pkBayarFoto[p.id] ? 'block' : 'none'};margin-bottom:8px">
        <img id="pkBP-${id}" alt="Bukti pembayaran" ${pkBayarFoto[p.id] ? 'src="' + pkBayarFoto[p.id] + '"' : ''} style="max-width:100%;max-height:200px;border-radius:10px;border:1px solid #b9d2f0"><br>
        <a href="#" class="small" onclick="pkBayarHapusFoto('${id}');return false" style="color:#c0392b">Hapus foto</a>
      </div>
      <label class="small" style="margin:0">Catatan (opsional)</label>
      <textarea id="pkN-${id}" rows="2" maxlength="300" placeholder="Mis. dibayar tunai / transfer lewat WA, infaq, dll." style="margin-bottom:8px"></textarea>
      <button class="btn" style="background:#0f766e;padding:12px;font-size:14px" onclick="pkSimpanBayar('${id}')">💾 Simpan pembayaran</button>
    </div>`;
  const rwy = (p.pembayaran || []).slice().reverse().map(x => `<div style="border-top:1px solid #d6e6f8;padding:6px 0">
      <b>${x.kes.length ? 'Ke-' + x.kes.join(', ') : ''}${x.infaq ? (x.kes.length ? ' + ' : '') + 'Infaq ' + pkRp(x.infaq) : ''}</b> • ${pkTgl(x.tgl)} • ${pkRp(x.jumlah)}${x.jumlah !== x.wajib ? ' <span style="color:#b45309">(tagihan ' + pkRp(x.wajib) + ')</span>' : ''}<br>
      <span class="small">oleh ${esc(x.oleh)}${x.catatan ? ' — “' + esc(x.catatan) + '”' : ''}</span>
      ${x.adaBukti ? ` <a href="#" class="small" onclick="pkLihatBuktiBayar('${id}',${x.i});return false">📎 Lihat bukti</a><div id="bb-${id}-${x.i}"></div>` : ''}</div>`).join('');
  return `<div class="ok" style="background:#fff;margin-bottom:12px${telat ? ';border-color:#e74c3c' : ''}" id="pj-${esc(p.id)}" data-cari="${esc((p.nama + ' ' + p.id).toLowerCase())}">
    ${pkBadge(p.jenis)}<b>${esc(p.nama)}</b> <span class="small">(${esc(p.id)})</span>${telat ? ' <span style="color:#c0392b;font-weight:800">⚠️ TERLAMBAT</span>' : ''}<br>
    <span class="small">${pkRp(p.nominal)} / ${p.jenis === 'KASBON' ? '30 hari' : p.tenor + ' bln'} • angsuran ${pkRp(p.angsuran)}</span>${ik.target ? `<br><span class="small">Infaq: ${pkRp(ik.terbayar)} / ${pkRp(ik.target)} ${ik.sisa ? '• <b style="color:#b45309">sisa ' + pkRp(ik.sisa) + '</b>' : '✅ lunas'}</span>` : ''}
    <div style="background:#d6e6f8;border-radius:8px;height:10px;margin:8px 0 4px;overflow:hidden"><div style="width:${persen}%;height:100%;background:#16a34a"></div></div>
    <div class="small"><b>${p.lunas}/${p.total} lunas</b> • sisa ${pkRp(p.sisa)}${p.berikut ? '<br>Berikutnya: ke-' + p.berikut.ke + ', jatuh tempo ' + pkTgl(p.berikut.due) + ' (' + pkRp(p.berikut.jumlah) + ')' : ''}</div>
    ${pkIngatkan(p)}
    ${aksi}
    ${p.adaBuktiCair ? `<div style="margin-top:8px"><button class="btn" style="padding:10px;font-size:13px;background:#6b7f99" onclick="pkLihatBuktiCair('${esc(p.id)}')">🧾 Lihat bukti transfer pencairan</button><div id="bc-${esc(p.id)}"></div></div>` : ''}
    <details style="margin-top:8px"><summary class="small" style="cursor:pointer;color:#134e8a;font-weight:700">Jadwal angsuran</summary>
      <table class="small" style="margin-top:6px;border-collapse:collapse"><tr style="color:#5a7aa0"><td>Ke</td><td>Jatuh tempo</td><td>Jumlah</td><td>Status</td></tr>${baris}</table>
      ${rwy ? '<div class="small" style="margin-top:10px"><b>Riwayat pencatatan</b>' + rwy + '</div>' : ''}
      ${pkBisaCatat && (p.lunas > 0 || (p.pembayaran || []).length) ? `<button class="btn" style="margin-top:8px;padding:8px;font-size:13px;background:#6b7f99" onclick="pkBatalBayar('${esc(p.id)}')">↩ Batalkan pencatatan terakhir (salah input)</button>` : ''}
    </details></div>`;
}
async function pkKirimAng(body, konfirmasi){
  if(konfirmasi && !await dialogKonfirmasi(konfirmasi)) return;
  document.querySelectorAll('#pj-' + body.id + ' button').forEach(b => b.disabled = true);
  try{
    const r = await pkApi(Object.assign({token:pkToken}, body));
    if(r.expired){ pkExpired(); return; }
    alert(r.ok ? r.msg : '❌ ' + r.msg);
  }catch(e){ alert('Gagal terhubung ke server.'); }
  pkMuat();
}
const pkPanelBuka = {}, pkBayarFoto = {};
function pkPanel(id){ const e = $('pkP-' + id); if(!e) return; const b = e.style.display === 'none'; e.style.display = b ? 'block' : 'none'; pkPanelBuka[id] = b; }
function pkHitung(id){ // isi otomatis jumlah = angsuran terpilih + infaq (selama belum diubah manual)
  const all = Array.from(document.querySelectorAll('.pkK-' + id)), pil = all.filter(c => c.checked), iq = $('pkIQ-' + id);
  if(iq && all.length && pil.length === all.length && !iq.checked){ iq.checked = true; pkInfaqToggle(id, true); } // angsuran terakhir: infaq harus lunas
  const j = $('pkJ-' + id); if(j.dataset.manual) return;
  const inf = iq && iq.checked ? parseInt(onlyDigits($('pkIJ-' + id).value) || '0', 10) : 0;
  const t = pil.reduce((a, c) => a + (+c.dataset.nom || 0), 0) + inf;
  j.value = t ? fmtMoney(String(t)) : '';
}
function pkInfaqToggle(id, tanpaHitung){
  const iq = $('pkIQ-' + id), w = $('pkIW-' + id), f = $('pkIJ-' + id);
  w.style.display = iq.checked ? 'block' : 'none';
  if(iq.checked && !f.value) f.value = fmtMoney(iq.dataset.sisa); // bawaan: sisa infaq (bisa diubah)
  if(!iq.checked) f.value = '';
  if(!tanpaHitung) pkHitung(id);
}
function pkJumlahUbah(id){ const j = $('pkJ-' + id); j.value = fmtMoney(j.value); j.dataset.manual = j.value ? '1' : ''; if(!j.value) pkHitung(id); }
async function pkBayarPilih(id, input){
  const f = input.files && input.files[0]; if(!f) return;
  try{
    pkBayarFoto[id] = await pkKompres(f);
    $('pkBP-' + id).src = pkBayarFoto[id]; $('pkBW-' + id).style.display = 'block';
  }catch(e){ alert(e.message); }
  input.value = '';
}
function pkBayarHapusFoto(id){ delete pkBayarFoto[id]; $('pkBW-' + id).style.display = 'none'; $('pkBP-' + id).removeAttribute('src'); }
async function pkSimpanBayar(id){
  const kes = Array.from(document.querySelectorAll('.pkK-' + id + ':checked')).map(c => +c.value), semua = document.querySelectorAll('.pkK-' + id).length;
  const iq = $('pkIQ-' + id), infaq = iq && iq.checked ? parseInt(onlyDigits($('pkIJ-' + id).value) || '0', 10) : 0, sisaInf = iq ? +iq.dataset.sisa : 0;
  if(iq && iq.checked && !infaq){ alert('Isi jumlah infaq yang dibayar.'); return; }
  if(!kes.length && !infaq){ alert('Pilih dulu angsuran atau infaq yang dibayar.'); return; }
  if(kes.length && kes.length === semua && sisaInf > infaq){ alert('Ini angsuran terakhir. Infaq harus lunas bersamanya: isi infaq minimal ' + pkRp(sisaInf) + ' (boleh lebih).'); return; }
  const tgl = $('pkT-' + id).value; if(!tgl){ alert('Isi tanggal pembayaran.'); return; }
  const jumlah = parseInt(onlyDigits($('pkJ-' + id).value) || '0', 10); if(!jumlah){ alert('Isi jumlah uang yang diterima.'); return; }
  const catatan = $('pkN-' + id).value.trim(), foto = pkBayarFoto[id] || '';
  if(!foto){ alert('Foto bukti pembayaran wajib dilampirkan (ambil foto atau pilih dari galeri).'); return; }
  if(!await dialogKonfirmasi('Catat pembayaran pengajuan ' + id + (kes.length ? '\nTandai LUNAS angsuran ke-' + kes.join(', ') : '') + (infaq ? '\nInfaq: ' + pkRp(infaq) : '') + '\nTanggal: ' + pkTgl(tgl) + '\nJumlah diterima: ' + pkRp(jumlah) + '\n\nLanjutkan?')) return;
  document.querySelectorAll('#pj-' + id + ' button').forEach(b => b.disabled = true);
  try{
    const r = await pkApi({a:'bayar', token:pkToken, id, kes, infaq, tgl, jumlah, catatan, foto});
    if(r.expired){ pkExpired(); return; }
    if(r.ok){ delete pkBayarFoto[id]; delete pkPanelBuka[id]; }
    alert(r.ok ? r.msg : '❌ ' + r.msg);
  }catch(e){ alert('Gagal terhubung ke server. Periksa koneksi lalu coba lagi.'); }
  pkMuat();
}
async function pkLihatBuktiBayar(id, i){
  const box = $('bb-' + id + '-' + i); if(!box) return; box.innerHTML = '<span class="small">Memuat foto...</span>';
  try{
    const r = await pkApi({a:'bukti_bayar', token:pkToken, id, i});
    if(r.expired){ pkExpired(); return; }
    if(!r.ok){ box.innerHTML = `<div class="err">${esc(r.msg)}</div>`; return; }
    const img = document.createElement('img'); img.src = r.data; img.alt = 'Bukti pembayaran';
    img.style.cssText = 'max-width:100%;border-radius:10px;margin-top:6px;border:1px solid #b9d2f0';
    box.innerHTML = ''; box.appendChild(img);
  }catch(e){ box.innerHTML = '<div class="err">Gagal memuat foto.</div>'; }
}
function pkCari(){ // saring kartu pinjaman berjalan menurut nama / nomor pengajuan
  const q = ($('pkCari') ? $('pkCari').value : '').trim().toLowerCase(); let n = 0;
  document.querySelectorAll('#pkPinjaman [data-cari]').forEach(e => { const ok = !q || e.dataset.cari.indexOf(q) >= 0; e.style.display = ok ? '' : 'none'; if(ok) n++; });
  const k = $('pkCariInfo'); if(k) k.innerText = q ? (n ? n + ' pinjaman ditemukan' : 'Tidak ada peminjam dengan nama tersebut.') : '';
}
function pkBatalBayar(id){ pkKirimAng({a:'batal_bayar', id}, 'Batalkan pencatatan pembayaran terakhir (angsuran dan infaq di dalamnya) untuk ' + id + '?'); }

/* --- laporan pembayaran dari anggota: lihat bukti, verifikasi --- */
function pkLaporanKartu(l){
  const aksi = pkBisaVerif ? `
    <textarea id="pkLA-${esc(l.lid)}" rows="2" placeholder="Komentar (wajib bila menolak)"></textarea>
    <div style="display:flex;gap:8px">
      <button class="btn" style="background:#16a34a;padding:12px;font-size:14px" onclick="pkVerif('${esc(l.lid)}','Y')">✔ Verifikasi</button>
      <button class="btn" style="background:#dc2626;padding:12px;font-size:14px" onclick="pkVerif('${esc(l.lid)}','N')">✖ Tolak</button>
    </div>` : '<p class="small">Verifikasi pembayaran hanya dapat dilakukan oleh Ketua dan Bendahara.</p>';
  return `<div class="ok" style="background:#fff;margin-bottom:12px" id="lp-${esc(l.lid)}">
    <b>${esc(l.nama)}</b> <span class="small">(${esc(l.id)})</span><br>
    <span class="small">${l.ke ? 'Angsuran ke-' + l.ke : 'Infaq saja'}${l.infaq ? (l.ke ? ' + infaq ' : ' ') + pkRp(l.infaq) : ''} • <b>${pkRp(l.jumlah)}</b> • dibayar ${pkTgl(l.tgl)} • dilaporkan ${esc(l.waktu)}${l.catatan ? '<br>Catatan: ' + esc(l.catatan) : ''}</span>
    <div style="margin:8px 0"><button class="btn" style="padding:10px;font-size:13px;background:#6b7f99" onclick="pkBukti('${esc(l.lid)}')">🖼️ Lihat foto bukti</button><div id="bk-${esc(l.lid)}"></div></div>
    ${aksi}</div>`;
}
async function pkBukti(lid){
  const box = $('bk-' + lid); box.innerHTML = '<span class="small">Memuat foto...</span>';
  try{
    const r = await pkApi({a:'bukti', token:pkToken, lid});
    if(r.expired){ pkExpired(); return; }
    if(!r.ok){ box.innerHTML = `<div class="err">${esc(r.msg)}</div>`; return; }
    const img = document.createElement('img'); img.src = r.data; img.alt = 'Bukti transaksi';
    img.style.cssText = 'max-width:100%;border-radius:10px;margin-top:8px;border:1px solid #b9d2f0';
    box.innerHTML = ''; box.appendChild(img);
  }catch(e){ box.innerHTML = '<div class="err">Gagal memuat foto.</div>'; }
}
async function pkVerif(lid, v){
  const k = $('pkLA-' + lid).value.trim();
  if(v === 'N' && !k){ alert('Alasan penolakan wajib diisi.'); $('pkLA-' + lid).focus(); return; }
  if(!await dialogKonfirmasi((v === 'Y' ? 'VERIFIKASI & catat pembayaran' : 'TOLAK laporan') + ' ' + lid + '?')) return;
  document.querySelectorAll('#lp-' + lid + ' button').forEach(b => b.disabled = true);
  try{
    const r = await pkApi({a:'verif_lapor', token:pkToken, lid, v, komentar:k});
    if(r.expired){ pkExpired(); return; }
    alert(r.ok ? r.msg : '❌ ' + r.msg);
  }catch(e){ alert('Gagal terhubung ke server.'); }
  pkMuat();
}

