/* JABATAN PENGURUS: warna + ikon per jabatan, lencana di header, daftar suara, dan halaman Profil pengurus. */
const JABATAN = {
  pimpinan:  {warna:'#6d28d9', muda:'#ede9fe', ikon:'👑', tugas:['Memutuskan pengajuan pinjaman pada tahap akhir','Satu-satunya yang dapat menyetujui pengampunan keterlambatan']},
  ketua:     {warna:'#0d3b6e', muda:'#dbeafe', ikon:'🛡️', tugas:['Mengelola operasional koperasi dan mencatat pembayaran','Memverifikasi laporan bayar anggota, mengelola data dan lokasi']},
  bendahara: {warna:'#047857', muda:'#d1fae5', ikon:'💰', tugas:['Mencatat kas dan memverifikasi pembayaran','Mengawasi saldo, mutasi, dan budget bulanan']},
  penasehat: {warna:'#c2410c', muda:'#ffedd5', ikon:'🧭', tugas:['Memberi arahan dan meninjau pengajuan','Ikut memutuskan perubahan data dan dispensasi']}
};
function jbInfo(j){ const k = String(j || '').toLowerCase().trim(); return JABATAN[k] || Object.keys(JABATAN).map(x => JABATAN[x]).find((v, i) => k.indexOf(Object.keys(JABATAN)[i]) >= 0) || null; }
function jbBadge(j){ // lencana kecil: ikon + nama jabatan berwarna
  const i = jbInfo(j); if(!i) return esc(j || '');
  return `<span class="jbbadge" style="background:${i.muda};color:${i.warna};border-color:${i.warna}">${i.ikon} ${esc(j)}</span>`;
}
function jbNama(nama, j){ const i = jbInfo(j); return i ? `<b style="color:${i.warna}">${esc(nama)}</b>` : esc(nama); }
(function(){
  const s = document.createElement('style');
  s.textContent = '.jbbadge{display:inline-block;border:1.5px solid;border-radius:99px;padding:1px 9px;font-size:12px;font-weight:800;white-space:nowrap}' +
    '.jbpin{position:absolute;right:-6px;bottom:-4px;width:24px;height:24px;border-radius:50%;background:#fff;border:2px solid;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 1px 4px rgba(0,0,0,.3);pointer-events:none}' +
    '#jbProfil{position:fixed;inset:0;background:rgba(10,25,45,.55);z-index:250;display:flex;align-items:flex-end;justify-content:center}' +
    '#jbProfil .jbkartu{background:#fff;border-radius:20px 20px 0 0;width:100%;max-width:480px;max-height:92vh;overflow:auto;padding:0 0 16px}' +
    '#jbProfil .jbhead{text-align:center;color:#fff;padding:22px 14px 16px;border-radius:20px 20px 0 0}' +
    '#jbProfil .jbhead .av{width:96px;height:96px;font-size:34px;margin:6px auto 8px;display:flex;border:4px solid #fff}' +
    '#jbProfil .jbhead b{font-size:20px;display:block}#jbProfil .jbhead .jbbadge{margin-top:8px;font-size:13px;background:#fff}' +
    '#jbProfil .pfcard{margin:12px 14px 0}';
  document.head.appendChild(s);
})();
// Pasang warna jabatan di header pengurus (dipanggil setelah dasbor dimuat)
let jbData = null;
function jbHeader(r){
  jbData = r; const i = jbInfo(r.jabatan), av = $('avPk'); if(!av) return;
  $('pkPeran').innerHTML = jbBadge(r.jabatan || r.peran);
  av.style.borderColor = i ? i.warna : ''; av.style.borderWidth = i ? '3px' : '';
  let pin = av.querySelector('.jbpin');
  if(i){ if(!pin){ pin = document.createElement('i'); pin.className = 'jbpin'; av.appendChild(pin); } pin.style.borderColor = i.warna; pin.textContent = i.ikon; }
  else if(pin) pin.remove();
  av.setAttribute('aria-label', 'Profil ' + (r.jabatan || 'pengurus') + ', ketuk untuk membuka');
}
function jbProfilBuka(){
  const r = jbData; if(!r) return;
  const i = jbInfo(r.jabatan) || {warna:'#134e8a', muda:'#dbeafe', ikon:'👤', tugas:[]}, mk = masaKerjaDetail(r.tglMasuk);
  const baris = (ic, lb, v) => `<div class="pfrow"><span class="pfic">${ic}</span><div class="pfbd"><div class="pflb">${lb}</div><div class="pfvl${v ? '' : ' pfkosong'}">${v ? esc(v) : 'Belum diisi'}</div></div></div>`;
  const tgl = r.tglMasuk ? new Date(r.tglMasuk + 'T00:00:00').toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) : '';
  const o = document.createElement('div'); o.id = 'jbProfil'; o.onclick = e => { if(e.target === o) jbTutup(); };
  o.innerHTML = `<div class="jbkartu"><div class="jbhead" style="background:linear-gradient(160deg,${i.warna},${i.warna}cc)"><span class="av" id="avJb"><i class="avcam" style="display:none">📷</i></span><b>${esc(r.nama)}</b>${jbBadge(r.jabatan || r.peran)}</div>
    <div class="pfcard"><div class="pfjudul">Data pengurus</div>
      ${baris('📅', 'Tanggal masuk', tgl)}${baris('⏳', 'Masa kerja', mk ? mk.y + ' tahun ' + mk.b + ' bulan' : '')}${baris('📱', 'Nomor HP', r.hp)}${baris('✉️', 'Email', r.email)}</div>
    ${i.tugas.length ? `<div class="pfcard"><div class="pfjudul">Tugas jabatan</div>${i.tugas.map(t => `<div class="pfrow"><span class="pfic" style="color:${i.warna}">●</span><div class="pfbd pfvl" style="font-size:14px;font-weight:600">${esc(t)}</div></div>`).join('')}</div>` : ''}
    ${pkAsliToken ? '' : `<div class="pfcard" id="bioPkKartu" style="display:none"><div class="pfjudul">Login sidik jari</div><p class="small" id="bioPkStatus" style="margin:2px 0 10px"></p><button class="btn" id="bioPkBtnOn" onclick="bioPkAktifkan()">👆 Aktifkan sidik jari di HP ini</button><button class="btn" id="bioPkBtnOff" style="background:#b42318;display:none" onclick="bioPkMatikan()">Matikan sidik jari</button></div>`}
    ${(typeof pkKetua !== 'undefined' && pkKetua && !pkAsliToken) ? `<div style="padding:12px 14px 0"><button class="btn" style="background:#0f766e" onclick="jbTutup(pkLihatPilih)">👁️ Lihat sebagai pengurus lain (baca saja)</button></div>` : ''}
    <div style="padding:14px 14px 0;display:flex;gap:8px"><button class="btn" onclick="jbTutup(fotoUbahPk)">📷 Ganti Foto</button><button class="btn" style="background:#6b7f99" onclick="jbTutup()">Tutup</button></div></div>`;
  document.body.appendChild(o);
  fotoTerapkan($('avJb'), fotoCache.pk, r.nama);
  if(typeof bioPkSegarkan === 'function') bioPkSegarkan();
  if(typeof modalPush === 'function'){ modalPush(jbTutupUI); jbPushed = true; } // popup ikut riwayat: tombol back HP = tutup popup profil
}
/* Tutup popup profil pengurus. Bila popup ikut riwayat, penutupan lewat history.back() agar entri riwayatnya ikut hilang; 'lalu' dijalankan sesudah tertutup. */
let jbPushed = false;
function jbTutupUI(){ const e = document.getElementById('jbProfil'); if(e) e.remove(); jbPushed = false; }
function jbTutup(lalu){
  if(jbPushed && window.modalRiwayat){ window.modalRiwayat = () => { jbTutupUI(); if(lalu) lalu(); }; history.back(); }
  else { jbTutupUI(); if(lalu) lalu(); }
}
