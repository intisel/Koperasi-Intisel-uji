// Konfirmasi pengajuan: pernyataan + "Saya setuju" + tanda tangan coret di layar
let ttdResolve = null, ttdInk = 0, ttdMinX = 1e9, ttdMaxX = -1, ttdLast = null, ttdDrawing = false, ttdBusy = false;

function janjiTeks(nama, jenis, nominal, tenor, infaq){ // sama persis dengan teks di server
  if(jenis === 'KASBON')
    return `Saya, ${nama}, meminjam uang (kasbon) sebesar ${rpf(nominal)} untuk jangka waktu 30 hari, tanpa bunga, kepada Koperasi Intisel. Saya berjanji akan melunasinya tepat waktu sesuai tanggal jatuh tempo.`;
  return `Saya, ${nama}, meminjam uang sebesar ${rpf(nominal)} dengan tenor ${tenor} bulan${infaq > 0 ? ', dengan infaq sukarela ' + rpf(infaq) : ''}, tanpa bunga, kepada Koperasi Intisel. Saya berjanji akan selalu disiplin membayar angsuran tepat waktu, paling lambat tanggal 5 setiap bulannya.`;
}
function ttdKanvas(){ return $('ttdCanvas'); }
function ttdReset(){
  const c = ttdKanvas(), dpr = window.devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight;
  c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
  const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
  x.lineWidth = 2.6; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#0b1f3a';
  ttdInk = 0; ttdMinX = 1e9; ttdMaxX = -1; ttdLast = null;
}
function ttdHapus(){ ttdReset(); }
function ttdTitik(e){ const r = ttdKanvas().getBoundingClientRect(); return {x: e.clientX - r.left, y: e.clientY - r.top}; }
function ttdPasang(){
  const c = ttdKanvas(); if(c.dataset.siap) return; c.dataset.siap = '1';
  c.addEventListener('pointerdown', e => { e.preventDefault(); c.setPointerCapture(e.pointerId); ttdDrawing = true; ttdLast = ttdTitik(e);
    const x = c.getContext('2d'); x.beginPath(); x.arc(ttdLast.x, ttdLast.y, 1.2, 0, 6.283); x.fill(); });
  c.addEventListener('pointermove', e => {
    if(!ttdDrawing) return; e.preventDefault(); const p = ttdTitik(e), x = c.getContext('2d');
    x.beginPath(); x.moveTo(ttdLast.x, ttdLast.y); x.lineTo(p.x, p.y); x.stroke();
    ttdInk += Math.hypot(p.x - ttdLast.x, p.y - ttdLast.y); ttdMinX = Math.min(ttdMinX, p.x); ttdMaxX = Math.max(ttdMaxX, p.x); ttdLast = p;
  });
  const stop = e => { ttdDrawing = false; };
  c.addEventListener('pointerup', stop); c.addEventListener('pointercancel', stop); c.addEventListener('pointerleave', stop);
}
function ttdPng(){ // ekspor 600x200, latar putih
  const src = ttdKanvas(), o = document.createElement('canvas'); o.width = 600; o.height = 200;
  const x = o.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 600, 200); x.drawImage(src, 0, 0, 600, 200);
  return o.toDataURL('image/png');
}
// info: {nama, jenis, nominal, tenor, infaq}. Resolve: data URL PNG, atau null bila dibatalkan.
function ttdMinta(info){
  return new Promise(res => {
    ttdResolve = res; ttdBusy = false;
    $('ttdJanji').innerText = janjiTeks(info.nama, info.jenis, info.nominal, info.tenor, info.infaq || 0);
    $('ttdNama').innerText = '( ' + info.nama + ' )';
    $('ttdSetuju').checked = false; $('ttdKirim').disabled = false; $('ttdKirim').innerText = 'Kirim Pengajuan'; $('ttdBatal').disabled = false;
    $('ttdModal').style.display = 'block'; document.body.style.overflow = 'hidden';
    history.pushState({r: currentRoute, ttd: 1}, '', '#' + currentRoute); ttdOpen = true;
    ttdPasang(); ttdReset();
  });
}
function ttdTutupUI(){ // menutup tampilan saja (dipanggil router saat popstate)
  $('ttdModal').style.display = 'none'; document.body.style.overflow = '';
  if(ttdResolve){ const r = ttdResolve; ttdResolve = null; r(null); }
}
function ttdBatal(){ if(ttdOpen) history.back(); }
function ttdKirim(){
  if(ttdBusy) return;
  if(!$('ttdSetuju').checked){ alert('Centang "Saya setuju dengan pernyataan di atas" dulu.'); return; }
  if(ttdInk < 120 || (ttdMaxX - ttdMinX) < 40){ alert('Tanda tangan belum ada. Coret tanda tangan Anda di kotak yang tersedia.'); return; }
  ttdBusy = true; $('ttdKirim').disabled = true; $('ttdKirim').innerText = 'Mengirim...'; $('ttdBatal').disabled = true;
  const r = ttdResolve; ttdResolve = null; r(ttdPng());
}
// ditutup oleh pemanggil setelah server menjawab. next = layar tujuan bila berhasil, null bila gagal (kembali ke formulir)
function ttdTutup(next){
  if(!ttdOpen){ if(next) goReplace(next); return; } // modal sudah ditutup lebih dulu (mis. tombol back)
  ttdNext = next || null; history.back();
}
