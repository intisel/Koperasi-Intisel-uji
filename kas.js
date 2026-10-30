/* ===== KAS KOPERASI (menu Keuangan Koperasi) + LAPORAN KAS ===== */
let kasJenis = 'MASUK', kasData = null;
const kasBlnIni = () => (pkHariIni || isoLokal(new Date())).slice(0, 7);
function kasRentang(ym){ const [y, m] = ym.split('-').map(Number); return {dari: ym + '-01', sampai: ym + '-' + String(new Date(y, m, 0).getDate()).padStart(2, '0')}; }
function kasInit(){ if(!$('kasBulan').value) $('kasBulan').value = kasBlnIni(); kasMuat(); }
function kasTab(j){
  kasJenis = j; $('kasTabBtnM').classList.toggle('on', j === 'MASUK'); $('kasTabBtnK').classList.toggle('on', j === 'KELUAR');
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
  $('kasForm').classList.toggle('hidden', !r.bisaInput);
  const m = kasJenis === 'MASUK', kat = m ? r.katMasuk : r.katKeluar, lama = $('kasKat').value;
  $('kasFormJudul').innerText = m ? '⬇ Catat Kas Masuk' : '⬆ Catat Kas Keluar';
  $('kasKat').innerHTML = kat.map(k => `<option>${esc(k)}</option>`).join(''); if(kat.indexOf(lama) >= 0) $('kasKat').value = lama;
  $('kasKetLbl').innerText = m ? 'Keterangan (wajib bila "Lainnya")' : 'Keterangan (wajib bila "Lainnya", mis. rapat, fotokopi, bensin)';
  if(!$('kasTgl').value) $('kasTgl').value = r.hariIni; $('kasTgl').max = r.hariIni;
}
function kasRender(){
  const r = kasData; if(!r) return;
  $('kasSaldo').innerText = pkRp(r.saldo); $('kasSaldo').style.color = r.saldo < 0 ? '#b91c1c' : '#134e8a';
  $('kasMasukBln').innerText = pkRp(r.masuk); $('kasKeluarBln').innerText = pkRp(r.keluar);
  const m = kasJenis === 'MASUK', daftar = r.baris.filter(x => x.jenis === kasJenis), tot = daftar.reduce((t, x) => t + x.jumlah, 0), ym = $('kasBulan').value;
  $('kasDaftarJudul').innerText = (m ? 'Daftar Kas Masuk' : 'Daftar Kas Keluar') + ' • ' + ym.split('-').reverse().join('/');
  $('kasCatatan').innerHTML = (m ? 'Infaq dari pembayaran angsuran masuk <b>otomatis</b>; asuransi, bunga, denda, dan lainnya dicatat manual oleh Ketua/Bendahara. ' : '') + 'Total bulan ini: <b>' + pkRp(tot) + '</b>';
  const kartu = x => `<div style="border-bottom:1px solid #d6e6f8;padding:9px 0"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(x.kategori)}${x.otomatis ? ' <span class="badge" style="background:#dcfce7;color:#166534">otomatis</span>' : ''}</b><b style="color:${m ? '#166534' : '#b91c1c'}">${m ? '+' : '−'}${pkRp(x.jumlah)}</b></div>
    <div class="small">${pkTgl(x.tgl)}${x.ket ? ' • ' + esc(x.ket) : ''}${x.otomatis ? '' : ' • oleh ' + esc(x.oleh)}</div>
    ${r.bisaInput && !x.otomatis ? `<span class="back-link" style="margin:4px 0 0" onclick="kasBatalBuka('${esc(x.id)}')">✖ Batalkan</span><div id="kb_${esc(x.id)}" class="hidden" style="margin-top:6px"><input id="kba_${esc(x.id)}" maxlength="200" placeholder="Alasan pembatalan (wajib)"><button class="btn" style="margin-top:6px;padding:10px;font-size:14px;background:#b91c1c" onclick="kasBatal('${esc(x.id)}')">Batalkan Catatan</button></div>` : ''}</div>`;
  const bt = r.dibatalkan.filter(x => x.jenis === kasJenis);
  $('kasDaftar').innerHTML = (daftar.length ? daftar.map(kartu).join('') : '<p class="small">Belum ada catatan pada bulan ini.</p>') +
    (bt.length ? `<details style="margin-top:10px"><summary class="small"><b>${bt.length} catatan dibatalkan</b></summary>${bt.map(x => `<div class="small" style="padding:6px 0;border-bottom:1px dashed #d6e6f8;color:#6b7f99"><s>${esc(x.kategori)} ${pkRp(x.jumlah)} • ${pkTgl(x.tgl)}</s><br>Dibatalkan oleh ${esc(x.batalOleh)}: “${esc(x.batalAlasan)}”</div>`).join('')}</details>` : '');
}
async function kasSimpan(){
  const kat = $('kasKat').value, jumlah = moneyVal('kasJml'), ket = $('kasKet').value.trim();
  if(!(jumlah > 0)){ alert('Isi jumlah dengan benar.'); return; }
  if(kat === 'Lainnya' && ket.length < 3){ alert('Kategori "Lainnya": isi keterangan.'); $('kasKet').focus(); return; }
  if(!await dialogKonfirmasi((kasJenis === 'MASUK' ? 'Catat KAS MASUK ' : 'Catat KAS KELUAR ') + pkRp(jumlah) + ' (' + kat + ') tanggal ' + pkTgl($('kasTgl').value) + '?')) return;
  const b = $('kasBtn'); b.disabled = true; b.innerText = 'Menyimpan...';
  try{
    const r = await pkApi({a:'kas_simpan', token:pkToken, jenis:kasJenis, kategori:kat, tgl:$('kasTgl').value, jumlah, ket});
    if(r.expired){ pkExpired(); return; }
    if(!r.ok){ alert(r.msg); }
    else { alert('✅ ' + r.msg); $('kasJml').value = ''; $('kasKet').value = ''; await kasMuat(); }
  }catch(e){ alert('Gagal terhubung ke server. Coba lagi.'); }
  finally{ b.disabled = false; b.innerText = 'Simpan'; }
}
function kasBatalBuka(id){ const e = $('kb_' + id); if(e) e.classList.toggle('hidden'); }
async function kasBatal(id){
  const alasan = ($('kba_' + id).value || '').trim();
  if(alasan.length < 3){ alert('Alasan pembatalan wajib diisi.'); return; }
  if(!await dialogKonfirmasi('Batalkan catatan kas ini? Saldo akan dikoreksi.')) return;
  try{
    const r = await pkApi({a:'kas_batal', token:pkToken, kid:id, alasan});
    if(r.expired){ pkExpired(); return; }
    alert((r.ok ? '✅ ' : '') + r.msg); if(r.ok) await kasMuat();
  }catch(e){ alert('Gagal terhubung ke server. Coba lagi.'); }
}

/* ----- Laporan Kas (tab di Laporan & Ekspor) ----- */
let lkData = null;
function lpTab(t){
  $('lpTabP').classList.toggle('hidden', t !== 'P'); $('lpTabK').classList.toggle('hidden', t !== 'K');
  $('lpTabBtnP').classList.toggle('on', t === 'P'); $('lpTabBtnK').classList.toggle('on', t === 'K');
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
