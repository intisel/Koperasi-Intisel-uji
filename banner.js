/* BANNER: 3 gambar slideshow. Publik: pakai gambar kustom (cache lokal) bila ada. Pengurus: ganti dari menu Pengumuman > Banner. */
const BN_KEY = 'banner_cache_v1', BN_W = 1200, BN_H = 900, BN_BAWAAN = ['hero-tower.png', 'slide-pantai.jpg', 'slide-kantor.jpg'];
let bnCache = {}, bnBaru = {}; // bnBaru: hasil crop yang belum disimpan, per slot

function bnBaca(){ try{ bnCache = JSON.parse(localStorage.getItem(BN_KEY) || '{}') || {}; }catch(e){ bnCache = {}; } }
function bnTulis(){ try{ localStorage.setItem(BN_KEY, JSON.stringify(bnCache)); }catch(e){ /* penyimpanan penuh: tetap jalan tanpa cache */ } }
function bnTerapkan(){ // pasang ke semua slideshow (3 halaman)
  document.querySelectorAll('.slideshow').forEach(box => {
    box.querySelectorAll('img.slide').forEach((el, i) => {
      const c = bnCache[i + 1];
      if(c && c.img){ el.src = c.img; el.style.objectPosition = '50% 50%'; }
      else { el.src = BN_BAWAAN[i]; el.style.objectPosition = ['50% 12%', '50% 60%', '50% 40%'][i]; }
    });
  });
}
async function bnSinkron(){ // hanya unduh slot yang versinya berubah
  try{
    const r = await (await fetch(API_URL, {method:'POST', body:JSON.stringify({a:'banner_info'})})).json();
    if(!r || !r.ok) return;
    let ubah = false;
    for(let n = 1; n <= 3; n++){
      const v = r.v[n - 1] || '', c = bnCache[n];
      if(!v){ if(c){ delete bnCache[n]; ubah = true; } continue; }
      if(c && c.v === v) continue;
      const g = await (await fetch(API_URL, {method:'POST', body:JSON.stringify({a:'banner_ambil', slot:n})})).json();
      if(g && g.ok && g.img){ bnCache[n] = {v:g.v, img:g.img}; ubah = true; }
    }
    if(ubah){ bnTulis(); bnTerapkan(); }
  }catch(e){ /* offline: pakai cache/bawaan */ }
}

/* ---------- Pengurus: tab Banner ---------- */
function bnPesan(t, ok){ const e = $('bnPesan'); e.className = ok ? 'ok' : 'err'; e.textContent = t || ''; e.style.display = t ? '' : 'none'; }
function bnRender(){
  const box = $('bnDaftar'); box.textContent = '';
  for(let n = 1; n <= 3; n++){
    const k = document.createElement('div'); k.className = 'card';
    const j = document.createElement('b'); j.textContent = 'Banner ' + n;
    const im = document.createElement('img'); im.alt = 'Banner ' + n;
    im.style.cssText = 'display:block;width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:12px;margin:8px 0;background:#0d3b6e';
    const baru = bnBaru[n], c = bnCache[n];
    im.src = baru || (c && c.img) || BN_BAWAAN[n - 1];
    const st = document.createElement('div'); st.className = 'small';
    st.textContent = baru ? 'Pratinjau gambar baru — belum disimpan.' : (c ? 'Gambar kustom' : 'Gambar bawaan');
    const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.className = 'hidden'; f.id = 'bnFile' + n;
    f.onchange = () => bnPilih(n, f.files && f.files[0]);
    const baris = document.createElement('div'); baris.style.cssText = 'display:flex;gap:8px;margin-top:8px;flex-wrap:wrap';
    const mk = (t, fn, gaya) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.style.cssText = 'flex:1;min-width:110px;margin:0;' + (gaya || ''); b.textContent = t; b.onclick = fn; return b; };
    if(baru){
      baris.append(mk('💾 Simpan', e => bnSimpan(n, e.currentTarget)), mk('Batal', () => { delete bnBaru[n]; bnRender(); }, 'background:#6b7f99'));
    } else {
      baris.append(mk('🖼 Ganti gambar', () => f.click()));
      if(c) baris.append(mk('Kembalikan bawaan', e => bnReset(n, e.currentTarget), 'background:#6b7f99'));
    }
    k.append(j, im, st, baris, f); box.appendChild(k);
  }
}
function bnMuat(){ bnRender(); bnSinkron().then(bnRender); }
function bnPilih(n, file){
  if(!file) return;
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => {
    const cv = document.createElement('canvas'); cv.width = BN_W; cv.height = BN_H;
    const x = cv.getContext('2d'), rasio = BN_W / BN_H;
    let sw = img.width, sh = img.height;
    if(sw / sh > rasio) sw = sh * rasio; else sh = sw / rasio; // potong tengah 4:3
    x.fillStyle = '#0d3b6e'; x.fillRect(0, 0, BN_W, BN_H);
    x.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, BN_W, BN_H);
    URL.revokeObjectURL(url);
    let q = 0.82, d = cv.toDataURL('image/jpeg', q);
    while(d.length * 0.75 > 520000 && q > 0.4){ q -= 0.1; d = cv.toDataURL('image/jpeg', q); }
    bnBaru[n] = d; bnPesan('', true); bnRender();
  };
  img.onerror = () => { URL.revokeObjectURL(url); bnPesan('File bukan gambar yang bisa dibaca.', false); };
  img.src = url;
}
async function bnSimpan(n, btn){
  btn.disabled = true; const t0 = btn.textContent; btn.textContent = 'Menyimpan...';
  try{
    const r = await infoApi({a:'banner_simpan', slot:n, img:bnBaru[n]});
    if(r.ok){ bnCache[n] = {v:r.v, img:bnBaru[n]}; delete bnBaru[n]; bnTulis(); bnTerapkan(); bnRender(); }
    bnPesan(r.msg, !!r.ok);
  }catch(e){ bnPesan('Gagal terhubung ke server.', false); }
  if(btn.isConnected){ btn.disabled = false; btn.textContent = t0; }
}
async function bnReset(n, btn){
  if(!confirm('Kembalikan Banner ' + n + ' ke gambar bawaan?')) return;
  btn.disabled = true;
  try{
    const r = await infoApi({a:'banner_reset', slot:n});
    if(r.ok){ delete bnCache[n]; bnTulis(); bnTerapkan(); bnRender(); }
    bnPesan(r.msg, !!r.ok);
  }catch(e){ bnPesan('Gagal terhubung ke server.', false); btn.disabled = false; }
}

bnBaca(); bnTerapkan(); bnSinkron();
