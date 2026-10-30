/* ===== KAS KOPERASI (menu Keuangan Koperasi) + LAPORAN KAS ===== */
let kasJenis = 'MASUK', kasData = null, kasFotoData = '';
const kasBlnIni = () => (pkHariIni || isoLokal(new Date())).slice(0, 7);
function kasRentang(ym){ const [y, m] = ym.split('-').map(Number); return {dari: ym + '-01', sampai: ym + '-' + String(new Date(y, m, 0).getDate()).padStart(2, '0')}; }
function kasInit(){ if(!$('kasBulan').value) $('kasBulan').value = kasBlnIni(); kasMuat(); }
function kasTab(j){
  kasJenis = j; $('kasTabBtnM').classList.toggle('on', j === 'MASUK'); $('kasTabBtnK').classList.toggle('on', j === 'KELUAR');
  ['kasForm', 'kasDaftarCard'].forEach(i => { $(i).classList.toggle('kas-m', j === 'MASUK'); $(i).classList.toggle('kas-k', j === 'KELUAR'); });
  $('kasBtn').style.background = j === 'MASUK' ? '#16a34a' : '#dc2626';
  kasPengisian(); kasRender();
}
async function kasMuat(){
  const ym = $('kasBulan').value || kasBlnIni(), rg = kasRentang(ym);
  try{
    const r = await pkApi({a:'kas_daftar', token:pkToken, dari:rg.dari, sampai:rg.sampai});
    if(r.expired){ pkExpired(); return; }
    if(!r.ok){ $('kasDaftar').innerHTML = `<div class="err">${esc(r.msg)}</div>`; return; }
    kasData = r; kasPengisian(); kasRender();
  }catch(e){ $('kasDaftar').innerHTML = '<div class="err">Gagal terhubung ke server. Coba muat ulang.</div>'; }
}
function kasPengisian(){ // form input (hanya Ketua & Bendahara)
  const r = kasData; if(!r) return;
  $('kasBanner').innerHTML = r.saldoAwalAda ? '' : `<div class="err" style="margin-top:8px">⚠️ <b>Saldo awal belum dicatat.</b> Sebelum itu saldo kas belum akurat dan transaksi otomatis (infaq, angsuran, pencairan) belum dihitung.${r.bisaInput ? ' Catat lewat <b>Kas Masuk → kategori Saldo awal</b> sesuai saldo rekening koperasi.' : ' Mohon Ketua/Bendahara mencatatnya.'}</div>`;
  $('kasForm').classList.toggle('hidden', !r.bisaInput);
  const m = kasJenis === 'MASUK', kat = m ? r.katMasuk : r.katKeluar, lama = $('kasKat').value;
  $('kasFormJudul').innerText = m ? '⬇ Catat Kas Masuk' : '⬆ Catat Kas Keluar';
  $('kasKat').innerHTML = kat.filter(x => !(m && x === 'Saldo awal' && r.saldoAwalAda)).map(k => `<option>${esc(k)}</option>`).join(''); if(kat.indexOf(lama) >= 0) $('kasKat').value = lama;
  $('kasKetLbl').innerText = m ? 'Keterangan (wajib bila "Lainnya")' : 'Keterangan (wajib bila "Lainnya")';
  if(!$('kasTgl').value) $('kasTgl').value = r.hariIni; $('kasTgl').max = r.hariIni;
  $('kasBtn').style.background = kasJenis === 'MASUK' ? '#16a34a' : '#dc2626';
  kasKorSiap();
  kasKatUbah();
}
let korFotoData = '';
function kasKorSiap(){
  const r = kasData, box = $('kasKorBox'), bb = r.bankBulan || [];
  box.classList.toggle('hidden', !r.bisaInput || !bb.length);
  const lama = $('korBulan').value;
  $('korBulan').innerHTML = bb.map(b => `<option value="${esc(b.ym)}">${esc(b.label)}</option>`).join(''); if(bb.some(b => b.ym === lama)) $('korBulan').value = lama;
  korUbah();
}
function korUbah(){
  const r = kasData; if(!r) return; const b = (r.bankBulan || []).find(x => x.ym === $('korBulan').value), k = $('korKomp').value;
  $('korInfo').innerHTML = b ? 'Perkiraan otomatis ' + esc(b.label) + ': <b>' + pkRp(b[k]) + '</b>' : '';
}
function korIsi(ym, komp){ $('kasKorBox').querySelector('details').open = true; if(Array.from($('korBulan').options).some(o => o.value === ym)) $('korBulan').value = ym; $('korKomp').value = komp; korUbah(); $('kasKorBox').scrollIntoView({behavior:'smooth', block:'center'}); $('korJml').focus(); }
function korFotoPilih(inp){ const f = inp.files && inp.files[0]; if(!f) return; pkKompres(f).then(d => { korFotoData = d; $('korFotoImg').src = d; $('korFotoPrev').style.display = 'block'; }).catch(e => alert(e.message)); inp.value = ''; }
function korFotoHapus(){ korFotoData = ''; $('korFotoPrev').style.display = 'none'; $('korFotoImg').removeAttribute('src'); }
async function korSimpan(){
  const bulan = $('korBulan').value, komp = $('korKomp').value, jml = $('korJml').value.trim() === '' ? -1 : moneyVal('korJml'), alasan = $('korAlasan').value.trim();
  if(!bulan){ alert('Pilih bulan yang dikoreksi.'); return; }
  if(!(jml >= 0)){ alert('Isi jumlah sesuai mutasi bank (boleh 0).'); $('korJml').focus(); return; }
  if(alasan.length < 3){ alert('Alasan koreksi wajib diisi.'); $('korAlasan').focus(); return; }
  if(!korFotoData){ alert('Foto bukti mutasi bank wajib dilampirkan.'); return; }
  const b = (kasData.bankBulan || []).find(x => x.ym === bulan), nm = {ADMIN:'Biaya admin bank', BUNGA:'Bunga bank', PAJAK:'Pajak bunga'}[komp];
  if(!await dialogKonfirmasi('Koreksi ' + nm + ' ' + (b ? b.label : bulan) + ' menjadi ' + pkRp(jml) + '?\n(Perkiraan otomatis: ' + pkRp(b ? b[komp] : 0) + ')\n\nSaldo kas akan disesuaikan.')) return;
  const bt = $('korBtn'); bt.disabled = true; bt.innerText = 'Menyimpan...';
  try{
    const r = await pkApi({a:'kas_koreksi', token:pkToken, bulan, komp, jumlah:jml, alasan, foto:korFotoData});
    if(r.expired){ pkExpired(); return; }
    if(!r.ok){ alert(r.msg); }
    else { alert('✅ ' + r.msg); $('korJml').value = ''; $('korAlasan').value = ''; korFotoHapus(); $('kasKorBox').querySelector('details').open = false; $('kasBulan').value = bulan; await kasMuat(); }
  }catch(e){ alert('Gagal terhubung ke server. Coba lagi.'); }
  finally{ bt.disabled = false; bt.innerText = 'Simpan Koreksi'; }
}
function kasFotoPilih(inp){ const f = inp.files && inp.files[0]; if(!f) return; pkKompres(f).then(d => { kasFotoData = d; $('kasFotoImg').src = d; $('kasFotoInfo').innerText = 'Ukuran terkirim ±' + Math.round(d.length * 0.75 / 1024) + ' KB'; $('kasFotoPrev').style.display = 'block'; }).catch(e => alert(e.message)); inp.value = ''; }
function kasFotoHapus(){ kasFotoData = ''; $('kasFotoPrev').style.display = 'none'; $('kasFotoImg').removeAttribute('src'); }
async function kasLihatFoto(id){ const b = $('kf_' + id); if(!b) return; b.innerHTML = '<span class="small">Memuat foto...</span>'; try{ const r = await pkApi({a:'kas_foto', token:pkToken, kid:id}); if(r.expired){ pkExpired(); return; } if(!r.ok){ b.innerHTML = `<div class="err">${esc(r.msg)}</div>`; return; } b.innerHTML = `<img src="${r.data}" alt="Bukti" style="max-width:100%;border-radius:10px;margin-top:6px;border:1px solid #b9d2f0">`; }catch(e){ b.innerHTML = '<div class="err">Gagal memuat foto.</div>'; } }
function kasKatUbah(){ $('kasFotoWrap').classList.toggle('hidden', $('kasKat').value === 'Saldo awal'); const r = kasData; $('kasNamaWrap').classList.toggle('hidden', !(r && r.katNama.indexOf($('kasKat').value) >= 0)); }
function kasRender(){
  const r = kasData; if(!r) return;
  const kb = r.kasbonPengelola || [], tk = kb.reduce((t, x) => t + x.sisa, 0);
  $('kasKbBox').classList.toggle('hidden', !kb.length);
  $('kasKbIsi').innerHTML = kb.map(x => `<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid #d6e6f8"><span>${esc(x.nama)}<br><span class="small">keluar ${pkRp(x.keluar)} • kembali ${pkRp(x.kembali)}</span></span><b style="color:#b45309">${pkRp(x.sisa)}</b></div>`).join('') + `<div style="display:flex;justify-content:space-between;padding-top:6px"><b>Total belum kembali</b><b>${pkRp(tk)}</b></div>`;
  $('kasSaldo').innerText = pkRp(r.saldo); $('kasSaldo').style.color = r.saldo < 0 ? '#b91c1c' : '#134e8a';
  $('kasMasukBln').innerText = pkRp(r.masuk); $('kasKeluarBln').innerText = pkRp(r.keluar);
  const m = kasJenis === 'MASUK', daftar = r.baris.filter(x => x.jenis === kasJenis), tot = daftar.reduce((t, x) => t + x.jumlah, 0), ym = $('kasBulan').value;
  $('kasDaftarJudul').innerText = (m ? 'Daftar Kas Masuk' : 'Daftar Kas Keluar') + ' • ' + ym.split('-').reverse().join('/');
  $('kasCatatan').innerHTML = (m ? '<b>Otomatis:</b> infaq dan angsuran yang diterima, serta bunga bank (bila saldo di atas Rp 50 juta; dapat dikoreksi). <b>Manual</b> (Ketua/Bendahara): tambahan dana, asuransi mobil, pengembalian kasbon pengelola, titipan, dan lainnya. ' : '<b>Otomatis:</b> pencairan pinjaman dan kasbon anggota yang ditandai sudah dicairkan, serta biaya admin &amp; pajak bank tiap akhir bulan (dapat dikoreksi). <b>Manual</b> (Ketua/Bendahara): sumbangan, biaya bank lainnya, kasbon pengelola (talangan), operasional, dan lainnya. ') + 'Total bulan ini: <b>' + pkRp(tot) + '</b>';
  const kartu = x => `<div style="border-bottom:1px solid #d6e6f8;padding:9px 0"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(x.kategori)}${x.nama ? ' • ' + esc(x.nama) : ''}${x.koreksi ? ' <span class="badge" style="background:#fef3c7;color:#92400e">dikoreksi</span>' : x.otomatis ? ' <span class="badge" style="background:#dcfce7;color:#166534">otomatis</span>' : ''}</b><b style="color:${m ? '#166534' : '#b91c1c'}">${m ? '+' : '−'}${pkRp(x.jumlah)}</b></div>
    <div class="small">${pkTgl(x.tgl)}${x.ket ? ' • ' + esc(x.ket) : ''}${x.otomatis ? '' : ' • oleh ' + esc(x.oleh)}</div>
    ${r.bisaInput && x.otomatis && x.komp && !x.koreksi ? `<span class="back-link" style="margin:4px 8px 0 0;display:inline-block" onclick="korIsi('${esc(x.bulan)}','${esc(x.komp)}')">✏️ Koreksi sesuai mutasi bank</span>` : ''}
    ${x.foto ? `<span class="back-link" style="margin:4px 8px 0 0;display:inline-block" onclick="kasLihatFoto('${esc(x.id)}')">📷 Lihat foto bukti</span><div id="kf_${esc(x.id)}"></div>` : ''}
    ${r.bisaInput && !x.otomatis && !x.bisaBatal ? '<div class="small" style="margin-top:4px;color:#6b7f99">🔒 Sudah lebih dari 3 hari — pembatalan hanya oleh Ketua.</div>' : ''}
    ${x.bisaBatal ? `<span class="back-link" style="margin:4px 0 0" onclick="kasBatalBuka('${esc(x.id)}')">${x.koreksi ? '↩ Batalkan koreksi' : '✖ Batalkan'}</span><div id="kb_${esc(x.id)}" class="hidden" style="margin-top:6px"><input id="kba_${esc(x.id)}" maxlength="200" placeholder="Alasan pembatalan (wajib)"><button class="btn" style="margin-top:6px;padding:10px;font-size:14px;background:#b91c1c" onclick="kasBatal('${esc(x.id)}')">${x.koreksi ? 'Batalkan Koreksi' : 'Batalkan Catatan'}</button></div>` : ''}</div>`;
  const bt = r.dibatalkan.filter(x => x.jenis === kasJenis);
  $('kasDaftar').innerHTML = (daftar.length ? daftar.map(kartu).join('') : '<p class="small">Belum ada catatan pada bulan ini.</p>') +
    (bt.length ? `<details style="margin-top:10px"><summary class="small"><b>${bt.length} catatan dibatalkan</b></summary>${bt.map(x => `<div class="small" style="padding:6px 0;border-bottom:1px dashed #d6e6f8;color:#6b7f99"><s>${esc(x.kategori)} ${pkRp(x.jumlah)} • ${pkTgl(x.tgl)}</s><br>Dibatalkan oleh ${esc(x.batalOleh)}: “${esc(x.batalAlasan)}”</div>`).join('')}</details>` : '');
}
async function kasSimpan(){
  const kat = $('kasKat').value, jumlah = moneyVal('kasJml'), ket = $('kasKet').value.trim(), nama = $('kasNama').value.trim();
  if(kasData.katNama.indexOf(kat) >= 0 && nama.length < 2){ alert('Isi nama pengelola/peminjam untuk kategori "' + kat + '".'); $('kasNama').focus(); return; }
  if(!(jumlah > 0)){ alert('Isi jumlah dengan benar.'); return; }
  if(kat === 'Lainnya' && ket.length < 3){ alert('Kategori "Lainnya": isi keterangan.'); $('kasKet').focus(); return; }
  if(kat !== 'Saldo awal' && !kasFotoData){ alert('Foto bukti wajib dilampirkan.'); $('kasFoto').focus(); return; }
  if(!await dialogKonfirmasi((kasJenis === 'MASUK' ? 'Catat KAS MASUK ' : 'Catat KAS KELUAR ') + pkRp(jumlah) + ' (' + kat + ') tanggal ' + pkTgl($('kasTgl').value) + '?')) return;
  const b = $('kasBtn'); b.disabled = true; b.innerText = 'Menyimpan...';
  try{
    const r = await pkApi({a:'kas_simpan', token:pkToken, jenis:kasJenis, kategori:kat, tgl:$('kasTgl').value, jumlah, ket, nama, foto: kat === 'Saldo awal' ? '' : kasFotoData});
    if(r.expired){ pkExpired(); return; }
    if(!r.ok){ alert(r.msg); }
    else { alert('✅ ' + r.msg); $('kasJml').value = ''; $('kasKet').value = ''; $('kasNama').value = ''; kasFotoHapus(); await kasMuat(); }
  }catch(e){ alert('Gagal terhubung ke server. Coba lagi.'); }
  finally{ b.disabled = false; b.innerText = 'Simpan'; }
}
function kasBatalBuka(id){ const e = $('kb_' + id); if(e) e.classList.toggle('hidden'); }
async function kasBatal(id){
  const alasan = ($('kba_' + id).value || '').trim();
  if(alasan.length < 3){ alert('Alasan pembatalan wajib diisi.'); return; }
  const kor = id.indexOf('KB-') === 0;
  if(!await dialogKonfirmasi(kor ? 'Batalkan koreksi ini? Angka bulan itu kembali ke perkiraan otomatis.' : 'Batalkan catatan kas ini? Saldo akan dikoreksi.')) return;
  try{
    const r = await pkApi({a:kor ? 'kas_koreksi_batal' : 'kas_batal', token:pkToken, kid:id, alasan});
    if(r.expired){ pkExpired(); return; }
    alert((r.ok ? '✅ ' : '') + r.msg); if(r.ok) await kasMuat();
  }catch(e){ alert('Gagal terhubung ke server. Coba lagi.'); }
}

/* ----- Laporan Kas (tab di Laporan & Ekspor) ----- */
let lkData = null;
function lpTab(t){
  ['D','P','K'].forEach(x => { $('lpTab' + x).classList.toggle('hidden', t !== x); $('lpTabBtn' + x).classList.toggle('on', t === x); });
  if(t === 'D') pkStatMuat();
  if(t === 'P') lpInit();
  if(t === 'K' && !$('lkSampai').value) lkPreset('bulan');
}
function lkPreset(k){
  const t = new Date(pkHariIni || isoLokal(new Date()) + 'T00:00:00'), y = t.getFullYear(), m = t.getMonth();
  const dari = k === 'bulan' ? new Date(y, m, 1) : k === '3bulan' ? new Date(y, m - 2, 1) : new Date(y, 0, 1);
  $('lkDari').value = isoLokal(dari); $('lkSampai').value = isoLokal(t); lkStale();
}
function lkStale(){ lkData = null; $('lkHasil').classList.add('hidden'); pkPesan('', false, 'lkPesan'); }
async function lkMuat(){
  const dari = $('lkDari').value, sampai = $('lkSampai').value;
  if(!dari || !sampai){ pkPesan('Isi tanggal dari dan sampai.', true, 'lkPesan'); return false; }
  const b = $('lkBtn'); b.disabled = true; b.innerText = 'Memuat...';
  try{
    const r = await pkApi({a:'kas_daftar', token:pkToken, dari, sampai});
    if(r.expired){ pkExpired(); return false; }
    if(!r.ok){ pkPesan(r.msg, true, 'lkPesan'); return false; }
    lkData = r; lkTampil(); return true;
  }catch(e){ pkPesan('Gagal terhubung ke server.', true, 'lkPesan'); return false; }
  finally{ b.disabled = false; b.innerText = 'Tampilkan Laporan Kas'; }
}
const lkKat = o => Object.keys(o).sort().map(k => [k, o[k]]);
function lkTampil(){
  const r = lkData; $('lkHasil').classList.remove('hidden');
  const rinci = (judul, o, warna) => `<div style="margin-top:8px"><b style="color:${warna}">${judul}</b>${lkKat(o).map(([k, v]) => `<div style="display:flex;justify-content:space-between" class="small"><span>${esc(k)}</span><span>${pkRp(v)}</span></div>`).join('') || '<div class="small">—</div>'}</div>`;
  $('lkRingkas').innerHTML = `<b>Periode ${pkTgl(r.dari)} s.d. ${pkTgl(r.sampai)}</b><div class="stt" style="margin-top:8px">
    <div><b>${pkRp(r.saldoAwal)}</b><span class="small">Saldo awal</span></div><div><b style="color:${r.saldoAkhir < 0 ? '#b91c1c' : '#134e8a'}">${pkRp(r.saldoAkhir)}</b><span class="small">Saldo akhir</span></div>
    <div><b style="color:#166534">${pkRp(r.masuk)}</b><span class="small">Kas masuk</span></div><div><b style="color:#b91c1c">${pkRp(r.keluar)}</b><span class="small">Kas keluar</span></div></div>
    ${rinci('Kas masuk per kategori', r.perKat.MASUK, '#166534')}${rinci('Kas keluar per kategori', r.perKat.KELUAR, '#b91c1c')}
    <p class="small" style="margin-top:8px">Berkas ekspor memuat <b>${r.baris.length}</b> transaksi${r.dibatalkan.length ? ' dan ' + r.dibatalkan.length + ' catatan dibatalkan' : ''}.</p>`;
}
function lkTabel(){
  const r = lkData, mk = x => [pkTgl(x.tgl), x.kategori, x.ket || '', x.otomatis ? 'Otomatis (angsuran)' : x.oleh, x.jumlah];
  const asc = a => a.slice().sort((x, y) => x.tgl < y.tgl ? -1 : x.tgl > y.tgl ? 1 : 0);
  const masuk = asc(r.baris.filter(x => x.jenis === 'MASUK')), keluar = asc(r.baris.filter(x => x.jenis === 'KELUAR')), H = ['Tanggal', 'Kategori', 'Keterangan', 'Dicatat oleh', 'Jumlah (Rp)'];
  return {
    ringkas: [['Laporan Kas Koperasi Intisel Lampung Syariah', ''], ['Periode', pkTgl(r.dari) + ' s.d. ' + pkTgl(r.sampai)], ['Dibuat', r.dibuat + ' oleh ' + r.oleh], ['', ''],
      ['Saldo awal (Rp)', r.saldoAwal], ['Total kas masuk (Rp)', r.masuk]].concat(lkKat(r.perKat.MASUK).map(([k, v]) => ['   • ' + k, v])).concat([['Total kas keluar (Rp)', r.keluar]]).concat(lkKat(r.perKat.KELUAR).map(([k, v]) => ['   • ' + k, v])).concat([['Saldo akhir (Rp)', r.saldoAkhir]]),
    masuk: [H].concat(masuk.map(mk)), keluar: [H].concat(keluar.map(mk)),
    batal: [['Tanggal', 'Jenis', 'Kategori', 'Jumlah (Rp)', 'Keterangan', 'Dibatalkan oleh', 'Alasan']].concat(r.dibatalkan.map(x => [pkTgl(x.tgl), x.jenis === 'MASUK' ? 'Masuk' : 'Keluar', x.kategori, x.jumlah, x.ket || '', x.batalOleh, x.batalAlasan]))
  };
}
async function lkExcel(){
  if(!lkData && !(await lkMuat())) return;
  const t = lkTabel(), sh = [{nama:'Ringkasan', rows:t.ringkas, lebar:[44, 24], tanpaHeader:true}, {nama:'Kas Masuk', rows:t.masuk, lebar:[12, 16, 40, 22, 16]}, {nama:'Kas Keluar', rows:t.keluar, lebar:[12, 16, 40, 22, 16]}];
  if(lkData.dibatalkan.length) sh.push({nama:'Dibatalkan', rows:t.batal, lebar:[12, 10, 16, 14, 30, 20, 30]});
  unduh(new Blob([xlsxBuat(sh)], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), `Laporan-Kas-Intisel_${lkData.dari}_${lkData.sampai}.xlsx`);
}
async function lkCetak(){
  if(!lkData && !(await lkMuat())) return;
  const t = lkTabel(), tbl = (rows, head) => '<table>' + (head ? '<tr>' + rows[0].map(c => `<th>${esc(c)}</th>`).join('') + '</tr>' : '') + rows.slice(head ? 1 : 0).map(r => '<tr>' + r.map(c => `<td${typeof c === 'number' ? ' class="n"' : ''}>${typeof c === 'number' ? c.toLocaleString('id-ID') : esc(c)}</td>`).join('') + '</tr>').join('') + '</table>';
  $('cetakArea').innerHTML = `<h2>${esc(t.ringkas[0][0])}</h2><div>${esc(t.ringkas[1][0])}: ${esc(t.ringkas[1][1])} &nbsp;•&nbsp; ${esc(t.ringkas[2][1])}</div><h3>Ringkasan</h3>${tbl(t.ringkas.slice(4), false)}
    <h3>Kas Masuk (${t.masuk.length - 1})</h3>${tbl(t.masuk, true)}<h3>Kas Keluar (${t.keluar.length - 1})</h3>${tbl(t.keluar, true)}${lkData.dibatalkan.length ? `<h3>Catatan Dibatalkan (${lkData.dibatalkan.length})</h3>${tbl(t.batal, true)}` : ''}`;
  document.body.classList.add('cetak');
  const bersih = () => { document.body.classList.remove('cetak'); $('cetakArea').innerHTML = ''; window.removeEventListener('afterprint', bersih); };
  window.addEventListener('afterprint', bersih); setTimeout(() => window.print(), 50);
}
