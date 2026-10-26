// Dashboard Pengurus & Pimpinan: login kode email, daftar menunggu, setuju/tolak, riwayat, rekap
let pkToken = sessionStorage.getItem('pk_token') || '', pkEmailAktif = '';
const pkRp = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const pkIc = v => v === 'Y' ? '✅' : v === 'N' ? '❌' : '⏳';
const pkLabel = {REVIEW_PENGURUS:'⏳ Direview Pengurus', MENUNGGU_PIMPINAN:'⏳ Menunggu Pimpinan', DISETUJUI:'✅ Disetujui', DITOLAK:'❌ Ditolak'};
const pkApi = async body => (await fetch(API_URL, {method:'POST', body:JSON.stringify(body)})).json();
const pkPesan = (m, err) => { $('pkPesan').innerHTML = m ? `<div class="${err ? 'err' : 'ok'}">${esc(m)}</div>` : ''; };

// tampilkan login / dasbor saat halaman Pengurus dibuka
const _showPk = showPengurusNoPush;
showPengurusNoPush = function(){ _showPk(); pkMulai(); };

function pkMulai(){
  if(pkToken){ $('pkLogin').classList.add('hidden'); $('pkDash').classList.remove('hidden'); pkMuat(); }
  else { $('pkLogin').classList.remove('hidden'); $('pkDash').classList.add('hidden'); }
}
async function pkMinta(){
  const email = $('pkEmail').value.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){ pkPesan('Format email tidak valid.', true); return; }
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
    const r = await pkApi({a:'otp_ver', email:pkEmailAktif || $('pkEmail').value.trim().toLowerCase(), kode});
    if(r.ok){ pkToken = r.token; sessionStorage.setItem('pk_token', pkToken); $('pkKode').value = ''; $('pkKodeWrap').classList.add('hidden'); pkPesan(''); pkMulai(); }
    else pkPesan(r.msg, true);
  }catch(e){ pkPesan('Gagal terhubung ke server.', true); }
  b.disabled = false; b.innerText = 'Masuk';
}
async function pkKeluar(){
  try{ await pkApi({a:'keluar', token:pkToken}); }catch(e){}
  pkToken = ''; sessionStorage.removeItem('pk_token'); pkMulai();
}
function pkExpired(){ pkToken = ''; sessionStorage.removeItem('pk_token'); pkMulai(); pkPesan('Sesi berakhir. Silakan masuk lagi.', true); }

async function pkMuat(){
  $('pkMenunggu').innerHTML = '<p class="small">Memuat...</p>';
  try{
    const r = await pkApi({a:'dasbor', token:pkToken});
    if(!r.ok){ if(r.expired) pkExpired(); else $('pkMenunggu').innerHTML = `<div class="err">${esc(r.msg)}</div>`; return; }
    $('pkNama').innerText = r.nama; $('pkPeran').innerText = r.peran;
    const c = r.rekap.cnt, bj = r.rekap.berjalan;
    const tile = (t, v) => `<div class="ok" style="text-align:center"><div style="font-size:22px;font-weight:900">${v}</div><div class="small">${t}</div></div>`;
    $('pkRekap').innerHTML = tile('Direview pengurus', c.REVIEW_PENGURUS) + tile('Menunggu pimpinan', c.MENUNGGU_PIMPINAN) +
      tile('Disetujui', c.DISETUJUI) + tile('Ditolak', c.DITOLAK) +
      `<div class="ok" style="grid-column:1/3;text-align:center"><div style="font-size:18px;font-weight:900">${pkRp(bj.total)}</div><div class="small">Pinjaman berjalan (${bj.n} pengajuan) • angsuran ${pkRp(bj.angsuranBulanan)}/bulan</div></div>`;
    $('pkRekapCatatan').innerText = 'Pinjaman berjalan = disetujui dan belum melewati tenor (perkiraan; pencatatan pelunasan belum tersedia).';
    $('pkMenunggu').innerHTML = r.menunggu.length ? r.menunggu.map(pkKartu).join('') : '<p class="small">Tidak ada pengajuan yang menunggu keputusan Anda. ✅</p>';
    $('pkRiwayat').innerHTML = r.riwayat.length ? r.riwayat.map(pkBaris).join('') : '<p class="small">Belum ada pengajuan.</p>';
  }catch(e){ $('pkMenunggu').innerHTML = '<div class="err">Gagal memuat data. Coba ↻ Muat ulang.</div>'; }
}
function pkVotes(p){
  const k = x => `<div>${pkIc(x.v)} ${esc(x.nama)}</div>` + (x.a ? `<div style="margin:0 0 4px 22px"><i>“${esc(x.a)}”</i></div>` : '');
  return p.pengurus.map(k).join('') + (p.status !== 'REVIEW_PENGURUS' ? k(p.pimpinan) : '');
}
function pkKartu(p){
  const d = p.detail, row = (a, b) => `<tr><td style="padding:2px 10px 2px 0;color:#5a7aa0;vertical-align:top">${a}</td><td><b>${esc(b)}</b></td></tr>`;
  return `<div class="ok" style="background:#fff;margin-bottom:12px" id="pk-${esc(p.id)}">
    <b>${esc(p.nama)}</b> <span class="small">(${esc(p.id)} • ${esc(p.waktu)})</span>
    <table class="small" style="margin:6px 0;border-collapse:collapse">
      ${row('Jabatan', d.posisi)}${row('Masa kerja', d.masaKerja)}
      ${row('Pinjaman', pkRp(p.nominal) + ' / ' + p.tenor + ' bln')}${row('Angsuran', pkRp(Math.round(p.nominal / p.tenor)) + '/bln')}
      ${row('Infaq', pkRp(d.infaq))}${row('Alasan', d.alasan)}
      ${row('Pinjaman sebelumnya', d.pernahPinjam + (d.tglLunas ? ' (lunas ' + d.tglLunas + ')' : ''))}${row('Gaji ditahan', d.gajiDitahan)}
      ${row('Gaji 3 bulan', pkRp(d.gaji1) + ' | ' + pkRp(d.gaji2) + ' | ' + pkRp(d.gaji3))}
      ${row('Kontak darurat', d.namaDarurat + ' (' + d.hubungan + ') ' + d.hpDarurat)}
    </table>
    <div class="small" style="margin-bottom:6px">${pkVotes(p)}</div>
    <textarea id="pkA-${esc(p.id)}" rows="2" placeholder="Komentar (wajib bila menolak). Komentar tampil di status anggota."></textarea>
    <div style="display:flex;gap:8px">
      <button class="btn" style="background:#16a34a" onclick="pkVote('${esc(p.id)}','Y')">✔ Setuju</button>
      <button class="btn" style="background:#dc2626" onclick="pkVote('${esc(p.id)}','N')">✖ Tolak</button>
    </div></div>`;
}
function pkBaris(p){
  return `<div style="border-bottom:1px solid #d6e6f8;padding:8px 0"><b>${esc(p.nama)}</b> <span class="small">${esc(p.id)} • ${esc(p.waktu)}</span><br>
    <span class="small">${pkRp(p.nominal)} / ${p.tenor} bln</span> • <b>${pkLabel[p.status] || esc(p.status)}</b>
    <div class="small" style="margin-top:4px">${pkVotes(p)}</div></div>`;
}
async function pkVote(id, v){
  const a = $('pkA-' + id).value.trim();
  if(v === 'N' && !a){ alert('Alasan penolakan wajib diisi.'); $('pkA-' + id).focus(); return; }
  if(!confirm((v === 'Y' ? 'SETUJU' : 'TOLAK') + ' pengajuan ' + id + '?')) return;
  document.querySelectorAll('#pk-' + id + ' button').forEach(b => b.disabled = true);
  try{
    const r = await pkApi({a:'vote', token:pkToken, id, v, komentar:a});
    if(r.expired){ pkExpired(); return; }
    alert(r.ok ? r.msg : '❌ ' + r.msg);
  }catch(e){ alert('Gagal terhubung ke server.'); }
  pkMuat();
}

// buka langsung lewat #pengurus (halaman sudah tampil sebelum file ini dimuat)
if(typeof currentPage !== 'undefined' && currentPage === 'pengurus') pkMulai();
