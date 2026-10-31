/* ===== Perubahan data anggota: anggota mengajukan, pengurus menyetujui (foto profil tidak perlu persetujuan) ===== */
const UBAH_FIELD = [ // [kunci, label, tipe, maks, inputmode, kelompok]
  ['jabatan', 'Jabatan', 'text', 60, '', 'Data Anggota'], ['bagian', 'Bagian', 'text', 40, '', 'Data Anggota'], ['base', 'Base / Lokasi', 'text', 40, '', 'Data Anggota'],
  ['hp', 'Nomor HP', 'tel', 16, 'numeric', 'Kontak'], ['email', 'Email', 'email', 80, 'email', 'Kontak'], ['alamat', 'Alamat', 'text', 200, '', 'Kontak'],
  ['rek', 'Nomor rekening BNI', 'tel', 24, 'numeric', 'Rekening'],
  ['namaDarurat', 'Nama', 'text', 60, '', 'Kontak Darurat'], ['hpDarurat', 'Nomor HP', 'tel', 16, 'numeric', 'Kontak Darurat'], ['hubungan', 'Hubungan (mis. istri, orang tua)', 'text', 60, '', 'Kontak Darurat']];
let ubahSayaData = [];
function ubahNilai(k){ const a = anggotaAktif || {}, p = a.profil || {}; return k === 'rek' ? '' : (['hp', 'email', 'alamat', 'namaDarurat', 'hpDarurat', 'hubungan'].indexOf(k) >= 0 ? p[k] : a[k]) || ''; }
function ubahRingkas(it){ return it.ubah.map(u => `<div class="small" style="margin:2px 0"><b>${esc(u.label)}</b>: <s style="color:#9a6a6a">${esc(u.lama || '(kosong)')}</s> → <b style="color:#166534">${esc(u.baru)}</b></div>`).join(''); }
async function profilSegarkan(){ // ambil permintaan saya + data terkini, lalu gambar ulang
  const a = anggotaAktif; if(!a) return;
  try{
    const r = await apiPost({a:'ubah_saya', nik:a.nik, atoken:a.atoken}); if(!r || !r.ok || anggotaAktif !== a) return;
    ubahSayaData = r.list || []; const t = r.terkini || {};
    ['jabatan', 'bagian', 'base', 'tglMasuk', 'rekAkhir'].forEach(k => { if(t[k] !== undefined) a[k] = t[k]; }); a.profil = Object.assign({}, a.profil || {}, t.profil || {});
    if($('sbNama')) $('sbNama').textContent = a.nama; if($('sbJab')) $('sbJab').textContent = a.jabatan || '';
    if(currentRoute === 'anggota-profil') profilRender(true);
  }catch(e){}
}
function ubahKotakStatus(){
  const l = ubahSayaData[0]; if(!l) return '';
  if(l.status === 'MENUNGGU') return `<div class="warn" style="margin:0 0 12px"><b>⏳ Menunggu persetujuan pengurus</b>${ubahRingkas(l)}<button class="btn" style="margin-top:8px;padding:10px;font-size:14px;background:#dc2626" onclick="ubahBatalSaya('${esc(l.id)}')">Batalkan Permintaan</button></div>`;
  if(l.status === 'DITOLAK') return `<div class="err" style="margin:0 0 12px"><b>❌ Perubahan terakhir ditolak</b>${ubahRingkas(l)}<div class="small">Catatan ${esc(l.oleh)}: ${esc(l.catatan)}</div></div>`;
  if(l.status === 'DISETUJUI') return `<div class="ok" style="margin:0 0 12px"><b>✅ Perubahan terakhir disetujui</b> <span class="small">(${esc(l.oleh)}, ${esc(String(l.waktuPutus).slice(0, 10))})</span></div>`;
  return '';
}
async function ubahBatalSaya(id){
  if(!await dialogKonfirmasi('Batalkan permintaan perubahan data ini?')) return;
  try{ const r = await apiPost({a:'ubah_batal', nik:anggotaAktif.nik, atoken:anggotaAktif.atoken, id}); alert((r.ok ? '✅ ' : '') + r.msg); await profilSegarkan(); if(currentRoute === 'anggota-profil-ubah') goReplace('anggota-profil'); }
  catch(e){ alert('Gagal terhubung ke server. Coba lagi.'); }
}
function profilUbahRender(){
  const a = anggotaAktif; if(!a) return;
  const nunggu = ubahSayaData[0] && ubahSayaData[0].status === 'MENUNGGU';
  let h = '', grup = '';
  h += `<div class="pfcard"><div class="pfjudul">Tidak dapat diubah</div>${profilBaris('🪪', 'NIK', a.nik)}${profilBaris('👤', 'Nama', a.nama)}${profilBaris('📅', 'Tanggal masuk kerja', profilTglId(a.tglMasuk))}</div>`;
  UBAH_FIELD.forEach(f => {
    if(f[5] !== grup){ if(grup) h += '</div>'; grup = f[5]; h += `<div class="pfcard"><div class="pfjudul">${esc(grup)}</div>`; }
    const ph = f[0] === 'rek' ? (a.rekAkhir ? 'Tersimpan •••• ' + a.rekAkhir + ' (kosongkan bila tidak diubah)' : 'Isi bila ingin menambah / mengubah') : '';
    h += `<label class="small" style="display:block;margin:8px 0 2px">${esc(f[1])}</label><input id="ub_${f[0]}" type="${f[2]}" maxlength="${f[3]}" ${f[4] ? 'inputmode="' + f[4] + '"' : ''} value="${esc(ubahNilai(f[0]))}" placeholder="${esc(ph)}" autocomplete="off" style="margin-bottom:6px">`;
  });
  h += '</div>';
  $('pfUbahBody').innerHTML = (nunggu ? '<div class="warn" style="margin:0 0 12px">Masih ada permintaan yang menunggu persetujuan. Batalkan dulu dari halaman Profil bila ingin mengubah isinya.</div>' : '') + h;
  $('pfUbahBtn').disabled = !!nunggu;
}
async function ubahKirim(){
  const a = anggotaAktif; if(!a) return; const data = {};
  UBAH_FIELD.forEach(f => { const v = ($('ub_' + f[0]) || {value: ''}).value.trim(); if(v !== '' && v !== String(ubahNilai(f[0]))) data[f[0]] = v; });
  if(!Object.keys(data).length){ alert('Belum ada data yang diubah.'); return; }
  const rinci = Object.keys(data).map(k => '• ' + UBAH_FIELD.find(f => f[0] === k)[1] + (k === 'rek' ? '' : ': ' + data[k])).join('\n');
  if(!await dialogKonfirmasi('Kirim permintaan perubahan data ini ke pengurus?\n\n' + rinci + '\n\nData baru berlaku setelah disetujui.')) return;
  const b = $('pfUbahBtn'); b.disabled = true; const t0 = b.innerText; b.innerText = 'Mengirim...';
  try{ const r = await apiPost({a:'ubah_ajukan', nik:a.nik, atoken:a.atoken, data}); alert((r.ok ? '✅ ' : '') + r.msg); if(r.ok){ await profilSegarkan(); goReplace('anggota-profil'); } }
  catch(e){ alert('Gagal terhubung ke server. Coba lagi.'); }
  b.innerText = t0; b.disabled = false;
}

/* ---------- Pengurus: daftar & keputusan ---------- */
async function ubMuat(){
  const box = $('ubList'); box.innerHTML = '<p class="small">Memuat...</p>';
  try{
    const r = await pkApi({a:'ubah_daftar', token:pkToken}); if(r.expired){ pkExpired(); return; }
    if(!r.ok){ box.innerHTML = '<div class="err">' + esc(r.msg) + '</div>'; return; }
    if(!r.list.length){ box.innerHTML = '<p class="small">Belum ada permintaan perubahan data.</p>'; return; }
    box.innerHTML = r.list.map(p => {
      const st = p.status === 'MENUNGGU' ? '<span class="badge" style="background:#dbeafe;color:#134e8a">MENUNGGU</span>' : p.status === 'DISETUJUI' ? '<span class="badge" style="background:#d4f5dd;color:#1b7a3a">DISETUJUI</span>' : '<span class="badge" style="background:#fde0e0;color:#c0392b">DITOLAK</span>';
      const ket = p.status === 'MENUNGGU' && p.sendiri ? '<div class="warn" style="margin-top:6px">Ini perubahan data Anda sendiri. Harus diputuskan oleh pengurus lain.</div>' : p.status === 'MENUNGGU' ? `<textarea id="ubC_${esc(p.id)}" rows="2" maxlength="200" placeholder="Catatan (wajib bila ditolak)" style="margin-top:6px"></textarea>
        <div style="display:flex;gap:8px;margin-top:6px"><button class="btn" style="background:#16a34a;padding:11px;font-size:14px" onclick="ubPutus('${esc(p.id)}','SETUJU')">✔ Setujui</button><button class="btn" style="background:#dc2626;padding:11px;font-size:14px" onclick="ubPutus('${esc(p.id)}','TOLAK')">✖ Tolak</button></div>`
        : `<div class="small" style="margin-top:4px">Oleh ${esc(p.oleh)} • ${esc(String(p.waktuPutus).slice(0, 16))}${p.catatan ? '<br>Catatan: ' + esc(p.catatan) : ''}</div>`;
      return `<div class="ok" style="background:#fff;margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(p.nama)} <span class="small">(NIK ${esc(p.nik)})</span></b>${st}</div><div class="small">${esc(String(p.waktu).slice(0, 16))} • ${esc(p.id)}</div>${ubahRingkas(p)}${ket}</div>`;
    }).join('');
  }catch(e){ box.innerHTML = '<div class="err">Gagal terhubung ke server.</div>'; }
}
async function ubPutus(id, kep){
  const cat = ($('ubC_' + id) || {value: ''}).value.trim();
  if(kep === 'TOLAK' && cat.length < 3){ alert('Isi alasan penolakan terlebih dahulu.'); return; }
  if(!await dialogKonfirmasi((kep === 'SETUJU' ? 'SETUJUI' : 'TOLAK') + ' perubahan data ini?' + (kep === 'SETUJU' ? ' Data anggota di sheet akan langsung diperbarui.' : ''))) return;
  try{ const r = await pkApi({a:'ubah_putus', token:pkToken, id, keputusan:kep, catatan:cat}); if(r.expired){ pkExpired(); return; } alert((r.ok ? '✅ ' : '') + r.msg); if(r.ok) await ubMuat(); }
  catch(e){ alert('Gagal terhubung ke server. Coba lagi.'); }
}
