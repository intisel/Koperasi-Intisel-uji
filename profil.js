/* ===== Halaman Profil anggota (dibuka dengan mengetuk foto di bilah atas) ===== */
function profilBuka(){ if(anggotaAktif) go('anggota-profil'); }
function profilBaris(ikon, label, nilai, kosong){
  const ada = nilai != null && String(nilai).trim() !== '';
  return `<div class="pfrow"><span class="pfic">${ikon}</span><div class="pfbd"><div class="pflb">${esc(label)}</div><div class="pfvl${ada ? '' : ' pfkosong'}">${ada ? esc(nilai) : esc(kosong || 'Belum diisi')}</div></div></div>`;
}
function profilTglId(s){
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); if(!m) return '';
  const B = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return +m[3] + ' ' + B[+m[2] - 1] + ' ' + m[1];
}
function profilRender(){
  const a = anggotaAktif; if(!a) return;
  const p = a.profil || {}, mk = masaKerjaDetail(a.tglMasuk), t = tingkatDari(mk ? mk.tahun : (+a.masaKerja || 0));
  $('pfNama').textContent = a.nama; $('pfJab').textContent = a.jabatan || '';
  $('pfTingkat').textContent = 'Tingkat ' + t + (mk ? ' • ' + mk.y + ' Th ' + mk.b + ' Bln' : '');
  const c = $('pfCrown'); c.innerHTML = mahkotaSvg(t);
  fotoTerapkan($('avProfil'), (typeof fotoCache !== 'undefined' && fotoCache.anggota) || '', a.nama);
  $('pfBody').innerHTML =
    `<div class="pfcard"><div class="pfjudul">Data Anggota</div>` +
      profilBaris('🪪', 'NIK', a.nik) + profilBaris('👤', 'Nama', a.nama) + profilBaris('💼', 'Jabatan', a.jabatan) +
      profilBaris('🏢', 'Bagian', a.bagian) + profilBaris('📍', 'Base / Lokasi', a.base) +
      profilBaris('📅', 'Tanggal masuk kerja', profilTglId(a.tglMasuk)) +
      profilBaris('⏳', 'Masa kerja', mk ? mk.y + ' tahun ' + mk.b + ' bulan ' + mk.d + ' hari' : '') + `</div>` +
    `<div class="pfcard"><div class="pfjudul">Kontak</div>` +
      profilBaris('📱', 'Nomor HP', p.hp) + profilBaris('✉️', 'Email', p.email) + profilBaris('🏠', 'Alamat', p.alamat) + `</div>` +
    `<div class="pfcard"><div class="pfjudul">Rekening</div>` +
      profilBaris('🏦', 'Rekening BNI', a.rekAkhir ? '•••• •••• ' + a.rekAkhir : '', 'Belum terdata') + `</div>` +
    `<div class="pfcard"><div class="pfjudul">Kontak Darurat</div>` +
      profilBaris('🧑‍🤝‍🧑', 'Nama', p.namaDarurat) + profilBaris('📞', 'Nomor HP', p.hpDarurat) + profilBaris('🔗', 'Hubungan', p.hubungan) + `</div>` +
    `<p class="small" style="text-align:center;margin:10px 4px">Nomor HP, email, alamat, dan kontak darurat terisi dari formulir pengajuan terakhir Anda. Data lain bersumber dari data anggota koperasi; bila ada yang keliru, hubungi pengurus lewat menu <b>Kontak &amp; Bantuan</b>.</p>`;
}
