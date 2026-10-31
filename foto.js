/* FOTO PROFIL: ambil dari kamera / galeri, dipotong persegi & dikecilkan di HP (JPEG 320px), lalu disimpan lewat backend */
const FOTO_UKURAN = 320;
const fotoCache = { anggota:'', pk:'', pkToken:'', kontak:null };

function fotoInisial(nama){ const p = String(nama || '').replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
function fotoTerapkan(el, dataUrl, nama){
  if(!el) return;
  const cam = el.querySelector('.avcam'), crown = el.querySelector('.crown'); el.textContent = '';
  if(dataUrl){ el.style.backgroundImage = 'url("' + dataUrl + '")'; el.dataset.foto = '1'; }
  else { el.style.backgroundImage = ''; el.dataset.foto = ''; el.appendChild(document.createTextNode(fotoInisial(nama))); }
  if(crown) el.appendChild(crown);
  if(cam) el.appendChild(cam);
}
function fotoLihat(dataUrl, nama){ // tampilkan foto besar
  if(!dataUrl) return;
  const m = document.createElement('div'); m.className = 'infomodal'; m.onclick = () => m.remove();
  const b = document.createElement('div'); b.className = 'infobox'; b.style.textAlign = 'center';
  const i = document.createElement('img'); i.src = dataUrl; i.alt = nama || 'Foto'; i.style.cssText = 'width:100%;max-width:320px;border-radius:14px';
  const t = document.createElement('div'); t.style.cssText = 'font-weight:800;margin-top:8px'; t.textContent = nama || '';
  b.append(i, t); m.appendChild(b); document.body.appendChild(m);
}
function fotoProses(file){
  return new Promise((ok, gagal) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const s = Math.min(img.naturalWidth, img.naturalHeight), sx = (img.naturalWidth - s) / 2, sy = (img.naturalHeight - s) / 2;
      const c = document.createElement('canvas'); c.width = c.height = FOTO_UKURAN;
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, FOTO_UKURAN, FOTO_UKURAN);
      x.drawImage(img, sx, sy, s, s, 0, 0, FOTO_UKURAN, FOTO_UKURAN); URL.revokeObjectURL(url);
      ok(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); gagal(new Error('Foto tidak bisa dibaca. Coba foto lain.')); };
    img.src = url;
  });
}
// opsi: {judul, nama, awal (dataUrl), simpan: async dataUrl => ({ok,msg,foto}), selesai: dataUrl => void}
function fotoEditor(opsi){
  const m = document.createElement('div'); m.className = 'infomodal';
  const box = document.createElement('div'); box.className = 'infobox'; box.style.textAlign = 'center';
  box.innerHTML = '<b style="font-size:17px"></b><div style="margin:14px 0"><span class="av xl" id="fotoPrev"></span></div>' +
    '<div style="display:flex;gap:8px;margin-bottom:8px"><label class="btn btn-yellow" style="flex:1;padding:12px;font-size:14px;cursor:pointer;margin:0">📷 Ambil Foto<input type="file" accept="image/*" capture="user" hidden id="fotoKamera"></label>' +
    '<label class="btn btn-yellow" style="flex:1;padding:12px;font-size:14px;cursor:pointer;margin:0">🖼 Galeri<input type="file" accept="image/*" hidden id="fotoGaleri"></label></div>' +
    '<div class="small" id="fotoPesan" style="min-height:18px;margin:6px 0"></div>' +
    '<div style="display:flex;gap:8px"><button class="btn" id="fotoSimpan" disabled>Simpan Foto</button><button class="btn" style="background:#6b7f99" id="fotoBatal">Batal</button></div>';
  box.querySelector('b').textContent = opsi.judul || 'Foto Profil';
  m.appendChild(box); document.body.appendChild(m);
  const prev = box.querySelector('#fotoPrev'), pesan = box.querySelector('#fotoPesan'), btn = box.querySelector('#fotoSimpan');
  let baru = '';
  fotoTerapkan(prev, opsi.awal, opsi.nama);
  const tutup = () => m.remove();
  m.onclick = e => { if(e.target === m) tutup(); };
  box.querySelector('#fotoBatal').onclick = tutup;
  const pilih = async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; if(!f) return;
    pesan.style.color = ''; pesan.textContent = 'Memproses foto...';
    try{ baru = await fotoProses(f); fotoTerapkan(prev, baru, opsi.nama); pesan.textContent = 'Foto dipotong persegi dari bagian tengah. Tekan Simpan Foto.'; btn.disabled = false; }
    catch(err){ pesan.style.color = '#c0392b'; pesan.textContent = err.message; }
  };
  box.querySelector('#fotoKamera').onchange = pilih; box.querySelector('#fotoGaleri').onchange = pilih;
  btn.onclick = async () => {
    btn.disabled = true; btn.textContent = 'Menyimpan...'; pesan.style.color = ''; pesan.textContent = '';
    try{
      const r = await opsi.simpan(baru);
      if(r && r.ok){ opsi.selesai(r.foto || baru); tutup(); }
      else { pesan.style.color = '#c0392b'; pesan.textContent = (r && r.msg) || 'Gagal menyimpan foto.'; btn.disabled = false; btn.textContent = 'Simpan Foto'; }
    }catch(err){ pesan.style.color = '#c0392b'; pesan.textContent = 'Gagal terhubung ke server.'; btn.disabled = false; btn.textContent = 'Simpan Foto'; }
  };
}
const fotoApi = body => fetch(API_URL, {method:'POST', body:JSON.stringify(body)}).then(r => r.json());

/* ---------- Anggota ---------- */
async function fotoMuatAnggota(){
  const a = anggotaAktif; if(!a) return;
  fotoCache.anggota = ''; try{ fotoCache.anggota = localStorage.getItem('fa_' + a.nik) || ''; }catch(e){}
  fotoTerapkan($('avMember'), fotoCache.anggota, a.nama);
  try{
    const r = await fotoApi({a:'foto_a_ambil', nik:a.nik, atoken:a.atoken});
    if(r.ok && anggotaAktif === a){ fotoCache.anggota = r.foto || ''; fotoTerapkan($('avMember'), fotoCache.anggota, a.nama); try{ localStorage.setItem('fa_' + a.nik, fotoCache.anggota); }catch(e){} }
  }catch(e){}
}
function fotoUbahAnggota(){
  const a = anggotaAktif; if(!a) return;
  fotoEditor({judul:'Foto Profil Anda', nama:a.nama, awal:fotoCache.anggota,
    simpan: f => fotoApi({a:'foto_a_simpan', nik:a.nik, atoken:a.atoken, foto:f}),
    selesai: f => { fotoCache.anggota = f; fotoTerapkan($('avMember'), f, a.nama); fotoTerapkan($('avProfil'), f, a.nama); try{ localStorage.setItem('fa_' + a.nik, f); }catch(e){} }});
}

/* ---------- Pengurus / pimpinan ---------- */
async function fotoMuatPk(){
  if(!pkToken || fotoCache.pkToken === pkToken) return;
  fotoCache.pkToken = pkToken;
  try{
    const r = await fotoApi({a:'foto_pk_ambil', token:pkToken});
    if(r.ok){ fotoCache.pk = r.foto || ''; fotoTerapkan($('avPk'), fotoCache.pk, $('pkNama').innerText); }
  }catch(e){ fotoCache.pkToken = ''; }
}
function fotoUbahPk(){
  const nama = $('pkNama').innerText;
  fotoEditor({judul:'Foto Profil ' + nama, nama, awal:fotoCache.pk,
    simpan: f => fotoApi({a:'foto_pk_simpan', token:pkToken, foto:f}),
    selesai: f => { fotoCache.pk = f; fotoTerapkan($('avPk'), f, nama); }});
}
async function fotoMuatPelamar(list){ // foto pemohon di kartu validasi pinjaman
  const niks = Array.from(new Set((list || []).map(p => String(p.nik)))).slice(0, 10); if(!niks.length) return;
  try{
    const r = await fotoApi({a:'foto_a_pk', token:pkToken, niks});
    if(!r.ok) return;
    document.querySelectorAll('.av[data-nik]').forEach(el => {
      const f = r.foto[el.dataset.nik]; if(f){ fotoTerapkan(el, f, el.dataset.nama); el.onclick = () => fotoLihat(f, el.dataset.nama); }
    });
  }catch(e){}
}

/* ---------- Kontak (foto pengurus untuk anggota) ---------- */
const KONTAK_KUNCI = {Pimpinan:'PIM', Penasehat:'P1', Ketua:'P2', Bendahara:'P3'};
async function fotoMuatKontak(){
  const a = anggotaAktif; if(!a) return;
  const pasang = () => document.querySelectorAll('.av[data-kontak]').forEach(el => {
    const f = (fotoCache.kontak || {})[KONTAK_KUNCI[el.dataset.kontak]];
    if(f){ fotoTerapkan(el, f, el.dataset.nama); el.onclick = () => fotoLihat(f, el.dataset.nama); }
  });
  if(fotoCache.kontak){ pasang(); return; }
  try{ const r = await fotoApi({a:'foto_kontak', nik:a.nik, atoken:a.atoken}); if(r.ok){ fotoCache.kontak = r.foto; pasang(); } }catch(e){}
}
