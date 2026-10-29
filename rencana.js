/* RENCANA PENCAIRAN (pinjaman koperasi): anggota memilih bulan pencairan (hingga 6 bulan ke depan) dan jenis Reguler / Urgen.
   Urgen wajib alasan + foto bukti sebagai bahan pertimbangan; keputusan akhir tetap di pimpinan. Masa tunggu dihitung terhadap tanggal pencairan yang dipilih. */
let rcData = null, rcFoto = '', rcTimer = null;
function rcTunda(){ clearTimeout(rcTimer); rcTimer = setTimeout(rcMuat, 500); } // dipanggil saat nominal / tanggal lunas berubah
function rcJenis(){ const r = document.querySelector('input[name="rcJenis"]:checked'); return r ? r.value : 'REGULER'; }
function rcUbahJenis(){ $('rcUrgenBox').style.display = rcJenis() === 'URGEN' ? 'block' : 'none'; rcRender(); }
async function rcMuat(){
  const box = $('rcBox'); if(!box || !anggotaAktif) return;
  try{
    const nom = parseInt($('nomRange').value, 10) || 0, ya = $('pernahPinjam') && $('pernahPinjam').value === 'Ya';
    const r = await apiPost({a:'kuota_bulan', nik:anggotaAktif.nik, atoken:anggotaAktif.atoken, nominal:nom, tglLunas: ya && $('tglLunas') ? $('tglLunas').value : ''});
    if(!r || !r.ok){ $('rcInfo').innerText = 'Daftar bulan belum dapat dimuat. Anda tetap dapat mengirim; server akan memeriksa.'; return; }
    rcData = r; rcRender();
  }catch(e){ $('rcInfo').innerText = 'Daftar bulan belum dapat dimuat. Periksa koneksi.'; }
}
function rcBolehPilih(b){ return b.cukup && (rcJenis() === 'URGEN' ? b.urgOk : b.regOk); }
function rcRender(){
  if(!rcData) return;
  const sel = $('rcBulan'), lama = sel.value, urgen = rcJenis() === 'URGEN';
  sel.innerHTML = rcData.bulan.map(b => {
    const ket = !b.cukup ? 'penuh' : !(urgen ? b.urgOk : b.regOk) ? 'masih masa tunggu' : 'tersedia';
    return `<option value="${b.ym}" ${rcBolehPilih(b) ? '' : 'disabled'}>${esc(b.label)}${b.alami ? ' (terdekat)' : ''} — ${ket}</option>`;
  }).join('');
  const ok = rcData.bulan.filter(rcBolehPilih);
  if(ok.length){ sel.value = ok.some(b => b.ym === lama) ? lama : ok[0].ym; }
  const b = rcData.bulan.find(x => x.ym === sel.value);
  let info = '';
  if(!ok.length) info = '⚠️ Belum ada bulan yang tersedia dalam 6 bulan ke depan (kuota penuh atau masih masa tunggu). Silakan hubungi pengurus.';
  else if(b) info = urgen ? `Pencairan urgen: paling lambat 2 hari kerja setelah disetujui pimpinan, dan tidak sebelum ${tglf(b.tglUrgen)}.` : `Pencairan reguler: tanggal ${tglf(b.tglReguler)}.`;
  if(rcData.tunggu) info += `<br>⏳ Masa tunggu 3 bulan setelah pelunasan berakhir <b>${tglf(rcData.tunggu)}</b>; pencairan harus pada atau sesudah tanggal itu.`;
  $('rcInfo').innerHTML = info;
}
async function rcPilihFoto(input){
  const f = input.files && input.files[0]; if(!f) return;
  try{ rcFoto = await kompres(f); $('rcPreview').src = rcFoto; $('rcPreviewWrap').style.display = 'block'; }catch(e){ alert(e.message); }
  input.value = '';
}
function rcHapusFoto(){ rcFoto = ''; $('rcPreviewWrap').style.display = 'none'; $('rcPreview').removeAttribute('src'); }
// Dipanggil dari kirimPengajuan: kembalikan {bulanBudget, mintaJenis, urgenAlasan, urgenFoto} atau null bila ada yang kurang
function rcAmbil(){
  const jenis = rcJenis(), ym = $('rcBulan').value;
  if(rcData && !rcData.bulan.some(rcBolehPilih)){ alert('Belum ada bulan pencairan yang tersedia. Silakan hubungi pengurus.'); return null; }
  if(!ym){ alert('Pilih bulan pencairan terlebih dulu.'); return null; }
  const o = {bulanBudget: ym, mintaJenis: jenis, urgenAlasan: '', urgenFoto: ''};
  if(jenis === 'URGEN'){
    o.urgenAlasan = $('rcAlasan').value.trim();
    if(o.urgenAlasan.length < 15){ alert('Pencairan urgen wajib disertai alasan yang jelas (minimal 15 huruf).'); $('rcAlasan').focus(); return null; }
    if(!rcFoto){ alert('Pencairan urgen wajib melampirkan foto bukti pendukung (mis. surat atau tagihan biaya).'); return null; }
    o.urgenFoto = rcFoto;
  }
  return o;
}
