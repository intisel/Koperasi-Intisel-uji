/* ===== Kasbon Pengelola (talangan) — dicatat manual Ketua/Bendahara, peminjam harus anggota di database ===== */
let kbpData = null, kbpJenis = 'KELUAR', kbpFoto = '', kbpLunas = false;
const KBP_ST = {BELUM:['Belum dibayar', '#fee2e2', '#991b1b'], SEBAGIAN:['Dibayar sebagian', '#fef3c7', '#92400e'], LUNAS:['Lunas', '#dcfce7', '#166534'], LEBIH:['Lebih bayar', '#e0e7ff', '#3730a3']};
function kbpLama(h){ if(h <= 0) return 'hari ini'; if(h < 31) return h + ' hari'; const b = Math.floor(h / 30), s = h % 30; return b + ' bulan' + (s ? ' ' + s + ' hari' : ''); }
function kbpWa(o){
  const no = waNo(o.hp); if(!no) return '';
  const t = `Assalamualaikum ${o.nama}, pengingat dari Koperasi Intisel: kasbon/dana talangan pengelola sebesar ${pkRp(o.sisa)} belum dikembalikan` + (o.sejak ? ` (sejak ${pkTgl(o.sejak)}, sudah ${kbpLama(o.lamaHari)})` : '') + '. Mohon segera dikembalikan dan bukti pengembalian dilaporkan kepada Bendahara. Terima kasih.';
  return 'https://wa.me/' + no + '?text=' + encodeURIComponent(t);
}
async function kbpMuat(){
  $('kbpIsi').innerHTML = '<p class="small">Memuat...</p>';
  try{
    const r = await pkApi({a:'kbp_daftar', token:pkToken});
    if(r.expired){ pkExpired(); return; }
    if(!r.ok){ $('kbpIsi').innerHTML = `<div class="err">${esc(r.msg)}</div>`; return; }
    kbpData = r; if(!$('kbpTgl').value) $('kbpTgl').value = r.hariIni; $('kbpTgl').max = r.hariIni;
    kbpRender();
  }catch(e){ $('kbpIsi').innerHTML = '<div class="err">Gagal terhubung ke server.</div>'; }
}
function kbpTab(j){
  kbpJenis = j; $('kbpTabK').classList.toggle('on', j === 'KELUAR'); $('kbpTabM').classList.toggle('on', j === 'MASUK');
  $('kbpBtn').style.background = j === 'KELUAR' ? '#dc2626' : '#16a34a'; $('kbpBtn').innerText = j === 'KELUAR' ? 'Simpan Kasbon' : 'Simpan Pengembalian';
  kbpPengisian();
}
function kbpPengisian(){
  const r = kbpData; if(!r) return;
  $('kbpForm').classList.toggle('hidden', !r.bisaInput);
  const daftar = kbpJenis === 'KELUAR' ? r.anggota : r.orang.filter(o => o.sisa > 0).map(o => ({nik:o.nik, nama:o.nama, base:o.base, sisa:o.sisa}));
  const cur = $('kbpOrang').value;
  $('kbpOrang').innerHTML = '<option value="">— pilih —</option>' + daftar.map(a => `<option value="${esc(a.nik)}">${esc(a.nama)}${a.base ? ' • ' + esc(a.base) : ''}${kbpJenis === 'MASUK' ? ' • sisa ' + pkRp(a.sisa) : ''}</option>`).join('');
  if(cur && daftar.some(a => a.nik === cur)) $('kbpOrang').value = cur;
  $('kbpOrangLbl').innerText = kbpJenis === 'KELUAR' ? 'Peminjam (harus terdaftar di data Anggota)' : 'Yang mengembalikan';
  $('kbpKosong').innerText = (kbpJenis === 'MASUK' && !daftar.length) ? 'Tidak ada kasbon yang belum kembali.' : '';
}
function kbpRender(){
  const r = kbpData; if(!r) return;
  const ada = r.orang.filter(o => o.sisa > 0), list = r.orang.filter(o => kbpLunas || o.sisa > 0);
  $('kbpTotal').innerText = pkRp(r.totalSisa); $('kbpJml').innerText = ada.length + ' orang belum lunas';
  const kartu = o => {
    const st = KBP_ST[o.status] || KBP_ST.BELUM, wa = o.sisa > 0 ? kbpWa(o) : '';
    return `<div style="border-bottom:1px solid #d6e6f8;padding:10px 0"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><b>${esc(o.nama)}</b>${o.jabatan ? ` <span class="small">• ${esc(o.jabatan)}</span>` : ''}<br><span class="small">${esc(o.base || '')}</span></div><span class="badge" style="background:${st[1]};color:${st[2]}">${st[0]}</span></div>
      <div class="stt" style="margin:8px 0 0;grid-template-columns:repeat(3,1fr);gap:6px;font-size:12px"><div><b style="color:#b91c1c">${pkRp(o.sisa)}</b><span class="small">Belum kembali</span></div><div><b>${pkRp(o.keluar)}</b><span class="small">Total kasbon</span></div><div><b style="color:#166534">${pkRp(o.kembali)}</b><span class="small">Sudah kembali</span></div></div>
      ${o.sisa > 0 && o.sejak ? `<div class="small" style="margin-top:6px">⏳ Belum lunas sejak <b>${pkTgl(o.sejak)}</b> — sudah <b>${kbpLama(o.lamaHari)}</b>${o.terakhir ? ' • pembayaran terakhir ' + pkTgl(o.terakhir) : ' • belum pernah membayar'}</div>` : ''}
      ${o.sisa > 0 ? `<div style="margin-top:8px">${wa ? waBtn(wa, 'Ingatkan via WA') : '<span class="small" style="color:#92400e">Nomor HP belum ada di data Anggota — tidak bisa diingatkan via WA.</span>'}</div>` : ''}
      <details style="margin-top:6px"><summary class="small"><b>Riwayat (${o.riwayat.length})</b></summary>${o.riwayat.map(x => {
        const k = x.jenis === 'KELUAR';
        return `<div style="padding:6px 0;border-top:1px dashed #d6e6f8"><div style="display:flex;justify-content:space-between;gap:8px"><span class="small">${pkTgl(x.tgl)} • ${k ? 'Kasbon' : 'Pengembalian'}${x.ket ? ' • ' + esc(x.ket) : ''}<br>oleh ${esc(x.oleh)}</span><b style="color:${k ? '#b91c1c' : '#166534'}">${k ? '−' : '+'}${pkRp(x.jumlah)}</b></div>
        ${x.foto ? `<span class="back-link" style="display:inline-block;margin:2px 8px 0 0" onclick="kbpFotoLihat('${esc(x.id)}')">📷 Foto bukti</span><div id="kbf_${esc(x.id)}"></div>` : ''}
        ${x.bisaBatal ? `<span class="back-link" style="margin:2px 0 0" onclick="$('kbb_${esc(x.id)}').classList.toggle('hidden')">✖ Batalkan</span><div id="kbb_${esc(x.id)}" class="hidden" style="margin-top:6px"><input id="kbba_${esc(x.id)}" maxlength="200" placeholder="Alasan pembatalan (wajib)"><button class="btn" style="margin-top:6px;padding:10px;font-size:14px;background:#b91c1c" onclick="kbpBatal('${esc(x.id)}')">Batalkan Catatan</button></div>` : (r.bisaInput ? '<div class="small" style="color:#6b7f99">🔒 Lebih dari 3 hari — pembatalan hanya oleh Ketua.</div>' : '')}</div>`;
      }).join('')}</details></div>`;
  };
  $('kbpIsi').innerHTML = list.length ? list.map(kartu).join('') : '<p class="small">Belum ada kasbon pengelola yang tercatat.</p>';
  kbpPengisian();
}
async function kbpFotoLihat(id){ const b = $('kbf_' + id); if(!b) return; b.innerHTML = '<span class="small">Memuat foto...</span>'; try{ const r = await pkApi({a:'kas_foto', token:pkToken, kid:id}); if(r.expired){ pkExpired(); return; } b.innerHTML = r.ok ? `<img src="${r.data}" alt="Bukti" style="max-width:100%;border-radius:10px;margin-top:6px;border:1px solid #b9d2f0">` : `<div class="err">${esc(r.msg)}</div>`; }catch(e){ b.innerHTML = '<div class="err">Gagal memuat foto.</div>'; } }
async function kbpBatal(id){
  const alasan = ($('kbba_' + id).value || '').trim();
  if(alasan.length < 3){ alert('Alasan pembatalan wajib diisi.'); return; }
  if(!await dialogKonfirmasi('Batalkan catatan kasbon ini? Saldo kas akan dikoreksi.')) return;
  try{ const r = await pkApi({a:'kas_batal', token:pkToken, kid:id, alasan}); if(r.expired){ pkExpired(); return; } alert((r.ok ? '✅ ' : '') + r.msg); if(r.ok) await kbpMuat(); }
  catch(e){ alert('Gagal terhubung ke server. Coba lagi.'); }
}
function kbpFotoPilih(inp){ const f = inp.files && inp.files[0]; if(!f) return; pkKompres(f).then(d => { kbpFoto = d; $('kbpFotoImg').src = d; $('kbpFotoPrev').style.display = 'block'; }).catch(e => alert(e.message)); inp.value = ''; }
function kbpFotoHapus(){ kbpFoto = ''; $('kbpFotoPrev').style.display = 'none'; $('kbpFotoImg').removeAttribute('src'); }
async function kbpSimpan(){
  const nik = $('kbpOrang').value, jumlah = moneyVal('kbpJml2'), tgl = $('kbpTgl').value, ket = $('kbpKet').value.trim();
  if(!nik){ alert('Pilih nama anggota terlebih dahulu.'); return; }
  if(!(jumlah > 0)){ alert('Isi jumlah.'); return; }
  if(!tgl){ alert('Isi tanggal.'); return; }
  if(!kbpFoto){ alert('Foto bukti wajib dilampirkan.'); return; }
  const nama = $('kbpOrang').selectedOptions[0].text.split(' • ')[0];
  if(!await dialogKonfirmasi((kbpJenis === 'KELUAR' ? 'Catat KASBON ' : 'Catat PENGEMBALIAN ') + pkRp(jumlah) + ' — ' + nama + ' tanggal ' + pkTgl(tgl) + '?')) return;
  const bt = $('kbpBtn'), t0 = bt.innerText; bt.disabled = true; bt.innerText = 'Menyimpan...';
  try{
    const r = await pkApi({a:'kbp_catat', token:pkToken, jenis:kbpJenis, nik, tgl, jumlah, ket, foto:kbpFoto});
    if(r.expired){ pkExpired(); return; }
    if(!r.ok) alert(r.msg);
    else { alert('✅ ' + r.msg); $('kbpJml2').value = ''; $('kbpKet').value = ''; kbpFotoHapus(); await kbpMuat(); }
  }catch(e){ alert('Gagal terhubung ke server. Coba lagi.'); }
  finally{ bt.disabled = false; bt.innerText = t0; }
}
