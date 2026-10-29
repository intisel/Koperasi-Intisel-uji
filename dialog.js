/* DIALOG: pengganti alert()/confirm() bawaan browser.
   Dialog bawaan selalu berjudul "intisel.github.io menyatakan" dan judulnya tidak bisa diubah, jadi diganti dialog sendiri berjudul "Koperasi Intisel".
   - alert(pesan)                 : tetap dipakai seperti biasa (tidak menunggu; pesan beruntun diantre satu per satu)
   - await dialogKonfirmasi(pesan): pengganti confirm(); hasilnya true (OK) / false (Batal). Hanya boleh dipakai di fungsi async. */
(function(){
  const antre = []; let tampil = false;
  const gaya = document.createElement('style');
  gaya.textContent = '.dlg-bg{position:fixed;inset:0;background:rgba(10,30,60,.55);z-index:300;display:flex;align-items:center;justify-content:center;padding:18px}' +
    '.dlg{background:#fff;border-radius:16px;max-width:420px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.35);overflow:hidden;font-family:inherit}' +
    '.dlg-h{background:#134e8a;color:#fff;font-weight:800;font-size:18px;padding:14px 18px}' +
    '.dlg-b{padding:20px 18px;font-size:20px;font-weight:600;line-height:1.45;color:#1b2b3f;white-space:pre-wrap;word-break:break-word;max-height:60vh;overflow:auto}' +
    '.dlg-f{display:flex;gap:8px;justify-content:flex-end;padding:0 18px 18px}' +
    '.dlg-f button{border:0;border-radius:10px;padding:13px 28px;font-weight:800;font-size:18px;cursor:pointer;background:#134e8a;color:#fff}' +
    '.dlg-f button.dlg-batal{background:#e6eef8;color:#134e8a}';
  (document.head || document.documentElement).appendChild(gaya);

  function buka(){
    if(tampil || !antre.length) return;
    tampil = true;
    const d = antre.shift(), bg = document.createElement('div'), kotak = document.createElement('div');
    bg.className = 'dlg-bg'; kotak.className = 'dlg'; kotak.setAttribute('role', 'alertdialog'); kotak.setAttribute('aria-modal', 'true');
    const h = document.createElement('div'); h.className = 'dlg-h'; h.textContent = 'Koperasi Intisel';
    const b = document.createElement('div'); b.className = 'dlg-b'; b.textContent = d.pesan; // textContent: aman dari HTML
    const f = document.createElement('div'); f.className = 'dlg-f';
    const tutup = hasil => { document.removeEventListener('keydown', tombolEsc, true); if(bg.parentNode) bg.parentNode.removeChild(bg); tampil = false; if(d.res) d.res(hasil); setTimeout(buka, 0); };
    const tombolEsc = e => { if(e.key === 'Escape'){ e.preventDefault(); tutup(false); } };
    if(d.konfirmasi){ const bt = document.createElement('button'); bt.className = 'dlg-batal'; bt.textContent = 'Batal'; bt.onclick = () => tutup(false); f.appendChild(bt); }
    const ok = document.createElement('button'); ok.textContent = 'OK'; ok.onclick = () => tutup(true); f.appendChild(ok);
    kotak.appendChild(h); kotak.appendChild(b); kotak.appendChild(f); bg.appendChild(kotak); document.body.appendChild(bg);
    document.addEventListener('keydown', tombolEsc, true);
    try{ ok.focus(); }catch(e){}
  }
  window.alert = function(pesan){ antre.push({pesan: String(pesan == null ? '' : pesan), konfirmasi: false}); buka(); };
  window.dialogKonfirmasi = function(pesan){ return new Promise(res => { antre.push({pesan: String(pesan == null ? '' : pesan), konfirmasi: true, res}); buka(); }); };
})();
