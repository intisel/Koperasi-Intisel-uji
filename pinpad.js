/* ===== Keypad PIN login anggota (titik 6 digit + tombol angka bulat) ===== */
function pinPadRender(){
  const v = ($('pinInput').value || '');
  document.querySelectorAll('#pinDots i').forEach((d, i) => d.classList.toggle('on', i < v.length));
}
function pinPadKosong(){ $('pinInput').value = ''; pinPadRender(); }
function pinPadTekan(n){
  if(typeof cekBusy !== 'undefined' && cekBusy) return;
  const el = $('pinInput'); if(el.value.length >= 6) return;
  el.value += String(n).replace(/\D/g, ''); pinPadRender();
  if(el.value.length === 6) setTimeout(() => { if($('pinInput').value.length === 6) loginPin(); }, 160); // otomatis masuk setelah 6 angka
}
function pinPadHapus(){ const el = $('pinInput'); el.value = el.value.slice(0, -1); pinPadRender(); }
document.addEventListener('keydown', e => { // papan ketik fisik (komputer) ikut bekerja
  const lg = $('lgPin'); if(!lg || lg.style.display === 'none' || lg.offsetParent === null) return;
  const a = document.activeElement; if(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
  if(/^\d$/.test(e.key)) pinPadTekan(e.key); else if(e.key === 'Backspace') pinPadHapus();
});
