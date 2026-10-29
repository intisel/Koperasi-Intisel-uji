/* ===== PERMOHONAN KERINGANAN ANGSURAN =====
   Anggota: menu "Ajukan Keringanan" (template alasan + foto bukti). Pengurus: tab "Keringanan" (hanya Ketua/Bendahara yang memutuskan). */
const KR_TEMPLATE = {
  gaji: {label:'Penghasilan bulan ini berkurang', teks:
`Assalamu'alaikum Bapak/Ibu Pengurus Koperasi Intisel.

Dengan hormat, saya memohon keringanan pembayaran angsuran ke-{ke} bulan ini. Penghasilan saya bulan ini berkurang karena [jelaskan, misalnya: saya tidak bekerja selama 2 minggu / lembur dan tunjangan tidak saya terima], sehingga gaji yang saya terima lebih kecil dari biasanya.

Saya sanggup membayar sebesar {sanggup} bulan ini, dan mohon sisanya dapat digeser ke angsuran bulan berikutnya. Saya berkomitmen untuk melunasinya. Bukti pendukung saya lampirkan.

Terima kasih atas pengertian dan kebijaksanaan Bapak/Ibu.`},
  sakit: {label:'Sakit / biaya pengobatan', teks:
`Assalamu'alaikum Bapak/Ibu Pengurus Koperasi Intisel.

Dengan hormat, saya memohon keringanan pembayaran angsuran ke-{ke} bulan ini. Saya/keluarga saya ([sebutkan siapa]) sedang sakit dan membutuhkan biaya pengobatan sebesar kurang lebih [perkiraan biaya], sehingga dana untuk angsuran bulan ini tidak mencukupi.

Saya sanggup membayar sebesar {sanggup} bulan ini, dan mohon sisanya dapat digeser ke angsuran bulan berikutnya. Saya berkomitmen untuk melunasinya. Surat keterangan/bukti pengobatan saya lampirkan.

Terima kasih atas pengertian dan kebijaksanaan Bapak/Ibu.`},
  musibah: {label:'Musibah / kedukaan keluarga', teks:
`Assalamu'alaikum Bapak/Ibu Pengurus Koperasi Intisel.

Dengan hormat, saya memohon keringanan pembayaran angsuran ke-{ke} bulan ini. Keluarga saya sedang tertimpa musibah, yaitu [jelaskan musibahnya, misalnya: kedukaan / kebakaran / kerusakan rumah], sehingga saya harus mengeluarkan biaya yang tidak terduga.

Saya sanggup membayar sebesar {sanggup} bulan ini, dan mohon sisanya dapat digeser ke angsuran bulan berikutnya. Saya berkomitmen untuk melunasinya. Bukti pendukung saya lampirkan.

Terima kasih atas pengertian dan kebijaksanaan Bapak/Ibu.`},
  mendesak: {label:'Kebutuhan mendesak keluarga', teks:
`Assalamu'alaikum Bapak/Ibu Pengurus Koperasi Intisel.

Dengan hormat, saya memohon keringanan pembayaran angsuran ke-{ke} bulan ini. Bulan ini saya memiliki kebutuhan keluarga yang mendesak, yaitu [jelaskan, misalnya: biaya sekolah anak / biaya persalinan / perbaikan kendaraan untuk bekerja], sehingga dana untuk angsuran bulan ini berkurang.

Saya sanggup membayar sebesar {sanggup} bulan ini, dan mohon sisanya dapat digeser ke angsuran bulan berikutnya. Saya berkomitmen untuk melunasinya. Bukti pendukung saya lampirkan.

Terima kasih atas pengertian dan kebijaksanaan Bapak/Ibu.`},
  tanggungan: {label:'Kewajiban / potongan lain meningkat', teks:
`Assalamu'alaikum Bapak/Ibu Pengurus Koperasi Intisel.

Dengan hormat, saya memohon keringanan pembayaran angsuran ke-{ke} bulan ini. Bulan ini potongan/kewajiban lain saya meningkat, yaitu [jelaskan, misalnya: potongan gaji atau cicilan lain], sehingga gaji bersih yang saya terima berkurang.

Saya sanggup membayar sebesar {sanggup} bulan ini, dan mohon sisanya dapat digeser ke angsuran bulan berikutnya. Saya berkomitmen untuk melunasinya. Bukti pendukung (mis. slip gaji) saya lampirkan.

Terima kasih atas pengertian dan kebijaksanaan Bapak/Ibu.`},
  lain: {label:'Alasan lain', teks:
`Assalamu'alaikum Bapak/Ibu Pengurus Koperasi Intisel.

Dengan hormat, saya memohon keringanan pembayaran angsuran ke-{ke} bulan ini karena [jelaskan alasan Anda dengan jelas dan jujur].

Saya sanggup membayar sebesar {sanggup} bulan ini, dan mohon sisanya dapat digeser ke angsuran bulan berikutnya. Saya berkomitmen untuk melunasinya. Bukti pendukung saya lampirkan.

Terima kasih atas pengertian dan kebijaksanaan Bapak/Ibu.`}
};
const KR_LABEL = {MENUNGGU:'⏳ Menunggu keputusan pengurus', DISETUJUI:'✅ Disetujui', DITOLAK:'❌ Belum dapat disetujui'};
let krFotoData = '', krLaluTpl = null, krKeAktif = 0, krSisaAktif = 0;

/* ---------- ANGGOTA ---------- */
function krPinjamanAktif(){ return (dataSaya.list || []).find(x => x.status === 'DISETUJUI' && x.angsuran && x.jenis !== 'KASBON'); }
function krTplTeks(){
  const a = $('krAlasan').value, t = KR_TEMPLATE[a]; if(!t) return '';
  return t.teks.replace(/\{ke\}/g, String(krKeAktif)).replace(/\{sanggup\}/g, 'Rp ' + (fmtMoney($('krSanggup').value) || '0'));
}
function krIsiTemplate(paksa){ // isi uraian dengan template; bila sanggup berubah dan uraian belum diedit, perbarui jumlahnya
  const u = $('krUraian'); if(!u) return;
  if(paksa || !u.value.trim() || krLaluTpl === u.value){ const t = krTplTeks(); u.value = t; krLaluTpl = t; }
}
function krHitung(){
  const p = krPinjamanAktif(), box = $('krHitung'); if(!p || !box) return;
  const jad = p.angsuran.jadwal, idx = jad.findIndex(j => j.ke === krKeAktif), t = jad[idx], nx = jad.slice(idx + 1).find(j => j.status !== 'LUNAS');
  const raw = $('krSanggup').value.trim(); if(raw === '' || !t){ box.innerHTML = ''; krIsiTemplate(false); return; }
  const sg = moneyVal('krSanggup');
  if(sg >= t.jumlah) box.innerHTML = '<span style="color:#c0392b">Jumlah harus kurang dari sisa angsuran (' + rpf(t.jumlah) + ').</span>';
  else if(!nx) box.innerHTML = 'Ini angsuran terakhir. Kekurangan <b>' + rpf(t.jumlah - sg) + '</b> akan menjadi <b>angsuran tambahan</b> bulan berikutnya.';
  else box.innerHTML = 'Yang digeser ke angsuran ke-' + nx.ke + ': <b>' + rpf(t.jumlah - sg) + '</b>. Angsuran ke-' + nx.ke + ' menjadi <b>' + rpf(nx.jumlah + (t.jumlah - sg)) + '</b> (dari ' + rpf(nx.jumlah) + ').';
  krIsiTemplate(false);
}
function renderKeringanan(){
  if(!$('krInfo')) return;
  const p = krPinjamanAktif(), L = dataSaya.keringanan || [];
  $('krRiwayat').innerHTML = L.length ? L.map(k => `<div style="border-bottom:1px solid #d6e6f8;padding:8px 0" class="small">
      <b>${esc(k.id)} • angsuran ke-${k.ke}</b> • sanggup ${rpf(k.sanggup)} dari ${rpf(k.sisa)}<br>${esc(k.alasan)} • diajukan ${esc(k.waktu)}<br><b>${KR_LABEL[k.status] || esc(k.status)}</b>${k.komentar ? '<br><i>“' + esc(k.komentar) + '”</i>' : ''}</div>`).join('')
    : '<p class="small">Belum ada permohonan.</p>';
  const form = $('krForm'); form.style.display = 'none';
  if(!p){ $('krInfo').innerText = 'Tidak ada pinjaman koperasi yang sedang berjalan. Keringanan hanya untuk pinjaman koperasi (kasbon harus dilunasi sekaligus).'; return; }
  const belum = p.angsuran.jadwal.filter(j => j.status !== 'LUNAS'), t = belum[0];
  if(L.some(k => k.status === 'MENUNGGU' && k.id === p.id)){ $('krInfo').innerHTML = '⏳ Permohonan Anda sedang <b>menunggu keputusan pengurus</b>. Anda akan menerima pemberitahuan.'; return; }
  const terpakai = (dataSaya.krTerpakai || {})[p.id] || 0, maks = dataSaya.krMaks || 3;
  if(terpakai >= maks){ $('krInfo').innerText = 'Keringanan sudah disetujui ' + terpakai + ' kali untuk pinjaman ini (maksimal ' + maks + ' kali). Silakan hubungi pengurus koperasi.'; return; }
  $('krInfo').innerHTML = 'Bila bulan ini Anda tidak sanggup membayar angsuran secara penuh (misalnya gaji berkurang), ajukan permohonan di sini. Permohonan harus disetujui oleh <b>ketiga pengurus</b> (Penasehat, Ketua, Bendahara). Bila disetujui, kekurangannya digeser ke angsuran bulan berikutnya.<br>Keringanan yang sudah disetujui untuk pinjaman ini: <b>' + terpakai + ' dari maksimal ' + maks + ' kali</b>.';
  krKeAktif = t.ke; krSisaAktif = t.jumlah; form.style.display = 'block';
  $('krAngsuran').innerHTML = `Pinjaman <b>${esc(p.id)}</b><br>Angsuran ke-${t.ke} • jatuh tempo ${tglf(t.due)} • sisa <b>${rpf(t.jumlah)}</b>`;
  if(!$('krAlasan').options.length) $('krAlasan').innerHTML = Object.keys(KR_TEMPLATE).map(k => `<option value="${k}">${esc(KR_TEMPLATE[k].label)}</option>`).join('');
  krHitung(); krIsiTemplate(false);
}
async function krPilihFoto(input){
  const f = input.files && input.files[0]; if(!f) return;
  try{ krFotoData = await kompres(f); $('krPreview').src = krFotoData; $('krPreviewWrap').style.display = 'block'; }catch(e){ alert(e.message); }
  input.value = '';
}
function krHapusFoto(){ krFotoData = ''; $('krPreviewWrap').style.display = 'none'; $('krPreview').removeAttribute('src'); }
async function krKirim(){
  const p = krPinjamanAktif(); if(!p){ alert('Tidak ada pinjaman koperasi berjalan.'); return; }
  if($('krSanggup').value.trim() === ''){ alert('Isi jumlah yang sanggup Anda bayar bulan ini (isi 0 bila tidak sanggup sama sekali).'); $('krSanggup').focus(); return; }
  const sg = moneyVal('krSanggup'); if(sg >= krSisaAktif){ alert('Jumlah yang sanggup dibayar harus kurang dari sisa angsuran (' + rpf(krSisaAktif) + ').'); return; }
  const u = $('krUraian').value.trim();
  if(/\[[^\]]*\]/.test(u)){ alert('Lengkapi dulu bagian dalam tanda [ ] pada uraian dengan keadaan Anda yang sebenarnya, lalu hapus tandanya.'); $('krUraian').focus(); return; }
  if(u.length < 30){ alert('Tuliskan uraian alasan dengan jelas (minimal 30 huruf).'); return; }
  if(!krFotoData){ alert('Lampirkan foto bukti pendukung (ambil foto atau pilih dari galeri).'); return; }
  if(!await dialogKonfirmasi('Kirim permohonan keringanan angsuran ke-' + krKeAktif + '?\nSanggup dibayar: ' + rpf(sg) + '\nDigeser ke bulan depan: ' + rpf(krSisaAktif - sg) + '\nPermohonan harus disetujui ketiga pengurus.\n\nKeterangan yang Anda isi harus benar.')) return;
  const btn = $('btnKr'); btn.disabled = true; btn.innerText = 'Mengirim...';
  try{
    const r = await apiPost({a:'kr_ajukan', nik:anggotaAktif.nik, atoken:anggotaAktif.atoken, id:p.id, ke:krKeAktif, sanggup:sg, alasan:$('krAlasan').value, uraian:u, foto:krFotoData});
    if(r.ok){ alert('✅ ' + r.msg); krHapusFoto(); $('krUraian').value = ''; krLaluTpl = null; $('krSanggup').value = ''; await muatData(); }
    else alert('❌ ' + r.msg);
  }catch(e){ alert('Gagal mengirim. Periksa koneksi lalu coba lagi.'); }
  btn.disabled = false; btn.innerText = 'Kirim Permohonan';
}

/* ---------- PENGURUS ---------- */
async function pkKrMuat(){
  const box = $('pkKeringanan'); if(!box) return;
  try{
    const r = await pkApi({a:'kr_daftar', token:pkToken});
    if(r.expired){ pkExpired(); return; }
    if(!r.ok){ box.innerHTML = `<div class="err">${esc(r.msg)}</div>`; return; }
    const n = r.menunggu.length;
    $('byTabNK').innerText = n ? '(' + n + ')' : '';
    pkBadge2('pbBerjalan', pkLapBase + n);
    box.innerHTML = (n ? r.menunggu.map(k => pkKrKartu(k)).join('') : '<p class="small">Tidak ada permohonan keringanan yang menunggu. ✅</p>') +
      (r.riwayat.length ? '<div style="font-weight:800;margin:14px 0 6px">Riwayat terakhir</div>' + r.riwayat.map(k => pkKrKartu(k, false)).join('') : '');
    if(n && !pkKrTabSet){ pkKrTabSet = true; if(!pkLapBase) pkBayarTab('K'); }
  }catch(e){ box.innerHTML = '<div class="err">Gagal memuat permohonan keringanan.</div>'; }
}
let pkKrTabSet = false;
function pkKrKartu(k){
  const kid = esc(k.kid), geser = k.sisa - k.sanggup, st = KR_LABEL[k.status] || esc(k.status);
  return `<div class="ok" style="background:#fff;margin-bottom:12px" id="kr-${kid}">
    <b>${esc(k.nama)}</b> <span class="small">(${esc(k.id)} • ${esc(k.waktu)})</span><br>
    <span class="small">Angsuran ke-${k.ke} • sisa <b>${pkRp(k.sisa)}</b> • sanggup <b>${pkRp(k.sanggup)}</b> • digeser ke bulan depan <b>${pkRp(geser)}</b></span><br>
    <span class="small">Alasan: <b>${esc(k.alasanTeks)}</b></span>
    <div class="small" style="white-space:pre-wrap;margin:6px 0;padding:8px;background:#f4f9ff;border-radius:8px">${esc(k.uraian)}</div>
    <a href="#" class="small" onclick="pkKrBukti('${kid}');return false">📎 Lihat bukti pendukung</a><div id="krb-${kid}"></div>
    <div class="small" style="margin-top:6px"><b>Suara pengurus:</b> ${(k.suara || []).map(x => (x.v === 'Y' ? '✅' : x.v === 'N' ? '❌' : '⏳') + ' ' + esc(x.jabatan || x.nama) + (x.k ? ' <i>“' + esc(x.k) + '”</i>' : '')).join(' • ')}</div>
    ${k.status === 'MENUNGGU' ? (k.bisaPutus ? `
      <textarea id="krK-${kid}" rows="2" placeholder="Komentar (wajib bila menolak). Komentar tampil di aplikasi anggota." style="margin-top:8px"></textarea>
      <div style="display:flex;gap:8px"><button class="btn" style="background:#16a34a;padding:12px;font-size:14px" onclick="pkKrPutus('${kid}','Y')">✔ Setujui</button><button class="btn" style="background:#dc2626;padding:12px;font-size:14px" onclick="pkKrPutus('${kid}','N')">✖ Tolak</button></div>`
      : '<p class="small">Menunggu suara pengurus lain. Keputusan hanya dapat diberikan oleh Penasehat, Ketua, dan Bendahara (ketiganya harus setuju).</p>')
      : `<div class="small" style="margin-top:6px"><b>${st}</b> oleh ${esc(k.oleh)} • ${esc(k.waktuPutus)}${k.komentar ? '<br><i>“' + esc(k.komentar) + '”</i>' : ''}</div>`}
  </div>`;
}
async function pkKrBukti(kid){
  const box = $('krb-' + kid); if(!box) return; box.innerHTML = '<span class="small">Memuat foto...</span>';
  try{
    const r = await pkApi({a:'kr_foto', token:pkToken, kid});
    if(r.expired){ pkExpired(); return; }
    if(!r.ok){ box.innerHTML = `<div class="err">${esc(r.msg)}</div>`; return; }
    const img = document.createElement('img'); img.src = r.data; img.alt = 'Bukti pendukung';
    img.style.cssText = 'max-width:100%;border-radius:10px;margin-top:6px;border:1px solid #b9d2f0';
    box.innerHTML = ''; box.appendChild(img);
  }catch(e){ box.innerHTML = '<div class="err">Gagal memuat foto.</div>'; }
}
async function pkKrPutus(kid, v){
  const kom = ($('krK-' + kid).value || '').trim();
  if(v === 'N' && !kom){ alert('Alasan penolakan wajib diisi.'); return; }
  if(!await dialogKonfirmasi((v === 'Y' ? 'Setujui permohonan keringanan ini? Permohonan baru berlaku bila ketiga pengurus menyetujui.' : 'Tolak permohonan keringanan ini?') + '\n\nLanjutkan?')) return;
  document.querySelectorAll('#kr-' + kid + ' button').forEach(b => b.disabled = true);
  try{
    const r = await pkApi({a:'kr_putus', token:pkToken, kid, v, komentar:kom});
    if(r.expired){ pkExpired(); return; }
    alert(r.ok ? r.msg : '❌ ' + r.msg);
  }catch(e){ alert('Gagal terhubung ke server.'); }
  pkMuat();
}
