/* Login sidik jari PENGURUS. Terpisah dari sidik jari anggota (kunci WebAuthn, token, penyimpanan berbeda): tidak bentrok walau jari/HP sama.
   Sidik jari dicek lokal oleh HP (WebAuthn); yang dilepas setelah lolos adalah TOKEN PERANGKAT dari server (1 perangkat per pengurus, berputar tiap dipakai,
   14 hari sejak terakhir dipakai, dicabut saat password diganti/direset). Login password / kode email tetap bisa dari perangkat mana pun. */
const BIOPK_KEY = 'bio_pk_v1', BIOPK_GAGAL_MAKS = 3;
const bioPkBaca = () => { try{ return JSON.parse(localStorage.getItem(BIOPK_KEY) || 'null'); }catch(e){ return null; } };
const bioPkSimpan = o => { try{ localStorage.setItem(BIOPK_KEY, JSON.stringify(o)); }catch(e){} };
const bioPkHapusLokal = () => { try{ localStorage.removeItem(BIOPK_KEY); localStorage.removeItem('bio_pk_gagal'); }catch(e){} };
const bioPkLupaTawaran = who => { try{ localStorage.removeItem('bio_pk_tanya_' + who); }catch(e){} };
const bioPkGagalTambah = () => { try{ const n = (parseInt(localStorage.getItem('bio_pk_gagal') || '0', 10) || 0) + 1; localStorage.setItem('bio_pk_gagal', String(n)); return n; }catch(e){ return 0; } };
const bioPkGagalReset = () => { try{ localStorage.removeItem('bio_pk_gagal'); }catch(e){} };
const bioPkLihatSaja = () => typeof pkAsliToken !== 'undefined' && !!pkAsliToken; // mode "lihat sebagai pengurus lain": tidak boleh mendaftar/mematikan
let bioPkBusy = false;

async function bioPkAktifkan(){ // pengurus yang sudah masuk (di profil)
  if(!pkToken || bioPkLihatSaja()) return;
  if(!await bioTersedia()){ alert('Perangkat ini belum memiliki sidik jari / kunci layar, atau browser tidak mendukung. Atur dulu di pengaturan HP.'); return; }
  if(bioPkBaca() && !await dialogKonfirmasi('Sidik jari pengurus sudah aktif di HP ini. Aktifkan ulang?')) return;
  const btn = $('bioPkBtnOn'); if(btn) btn.disabled = true;
  try{
    const nama = (typeof jbData !== 'undefined' && jbData && jbData.nama) || 'Pengurus';
    const uid = crypto.getRandomValues(new Uint8Array(16));
    const cred = await navigator.credentials.create({publicKey:{
      challenge: crypto.getRandomValues(new Uint8Array(32)), rp:{name:'Koperasi Intisel'},
      user:{id: uid, name: 'pengurus-' + bioB64(uid).slice(0, 8), displayName: nama},
      pubKeyCredParams:[{type:'public-key', alg:-7}, {type:'public-key', alg:-257}],
      authenticatorSelection:{authenticatorAttachment:'platform', userVerification:'required', residentKey:'discouraged'}, timeout:60000, attestation:'none'}});
    const r = await pkApi({a:'pk_bio_daftar', token:pkToken, perangkat:bioPerangkat()});
    if(r.expired){ pkExpired(); return; }
    if(!r.ok) alert('❌ ' + (r.msg || 'Gagal mengaktifkan.'));
    else{ bioPkSimpan({who:r.who, nama:r.nama || nama, cid:bioB64(cred.rawId), btoken:r.btoken}); alert('✅ Login sidik jari pengurus aktif di HP ini. Berlaku ' + r.hari + ' hari sejak terakhir dipakai. Perangkat lain (jika ada) dinonaktifkan.'); }
  }catch(e){ alert(bioPesanGalat(e)); }
  if(btn) btn.disabled = false; bioPkSegarkan();
}
async function bioPkMatikan(){
  if(!pkToken || bioPkLihatSaja()) return;
  if(!await dialogKonfirmasi('Matikan login sidik jari pengurus?')) return;
  try{ const r = await pkApi({a:'pk_bio_cabut', token:pkToken}); if(r.expired){ pkExpired(); return; } if(!r.ok){ alert('❌ ' + (r.msg || 'Gagal.')); return; } }
  catch(e){ alert('Gagal terhubung ke server.'); return; }
  bioPkHapusLokal(); bioPkSegarkan();
}
async function bioPkMasuk(){ // dari layar login pengurus
  if(bioPkBusy || pkToken) return; const b = bioPkBaca(); if(!b || !bioDidukung()){ bioPkSegarkan(); return; }
  bioPkBusy = true; const btn = $('bioPkLoginBtn'); if(btn) btn.disabled = true;
  let fase = 'hp', tanyaMati = false, berhasil = false;
  try{
    await navigator.credentials.get({publicKey:{challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials:[{type:'public-key', id:bioDariB64(b.cid), transports:['internal']}], userVerification:'required', timeout:60000}});
    bioPkGagalReset(); fase = 'server';
    if(typeof muatLayar === 'function') muatLayar(true, 'Memuat data pengurus...');
    const r = await pkApi({a:'pk_bio_login', who:b.who, btoken:b.btoken});
    if(!r.ok){
      if(r.bioHabis){ bioPkHapusLokal(); bioPkLupaTawaran(b.who); } // token di server sudah mati: bersihkan & tawarkan aktifkan ulang setelah masuk password
      pkPesan(r.msg || (r.bioHabis ? 'Login sidik jari sudah kedaluwarsa. Masuk dengan password, lalu aktifkan lagi.' : 'Masuk dengan password.'), true);
    } else { bioPkSimpan(Object.assign({}, b, {btoken:r.btoken})); berhasil = true; pkMasuk(r); } // pkMasuk -> dasbor; animasi diteruskan oleh pkMuat
  }catch(e){
    if(fase === 'hp'){ tanyaMati = bioPkGagalTambah() >= BIOPK_GAGAL_MAKS; if(!tanyaMati) pkPesan(e && e.name ? bioPesanGalat(e) : 'Sidik jari tidak dapat dipakai. Masuk dengan password.', true); }
    else pkPesan('Gagal terhubung ke server. Periksa internet lalu coba lagi.', true);
  }
  finally{ bioPkBusy = false; if(btn) btn.disabled = false; }
  if(!berhasil && typeof muatLayar === 'function') muatLayar(false);
  bioPkSegarkan();
  if(tanyaMati){
    if(await dialogKonfirmasi('Sidik jari gagal dipakai ' + BIOPK_GAGAL_MAKS + ' kali berturut-turut.\n\nMatikan login sidik jari pengurus di HP ini dan masuk dengan password? Setelah masuk, Anda bisa mengaktifkannya lagi.')){ bioPkHapusLokal(); bioPkLupaTawaran(b.who); bioPkSegarkan(); pkPesan('Login sidik jari dimatikan di HP ini. Masuk dengan password.', true); }
    else bioPkGagalReset();
  }
}
async function bioPkSegarkan(){ // tombol di layar login + kartu di profil
  const b = bioPkBaca(), ok = bioDidukung(), btn = $('bioPkLoginBtn');
  if(btn){ btn.style.display = (b && ok) ? 'block' : 'none'; const n = $('bioPkLoginNama'); if(n && b) n.innerText = b.nama ? ' (' + b.nama.split(' ').slice(0, 2).join(' ') + ')' : ''; }
  const kartu = $('bioPkKartu'); if(!kartu) return;
  const tersedia = ok && await bioTersedia(); kartu.style.display = (tersedia || b) ? '' : 'none';
  const nama = (typeof jbData !== 'undefined' && jbData && jbData.nama) || '', aktif = !!(b && (!nama || b.nama === nama));
  if($('bioPkStatus')) $('bioPkStatus').innerHTML = aktif ? '✅ <b>Aktif di HP ini.</b> Anda bisa masuk dengan sidik jari. Hanya 1 perangkat per pengurus.' : (b ? 'Sidik jari pengurus di HP ini terdaftar untuk akun lain (' + esc(b.nama) + '). Mengaktifkan di sini akan menggantinya.' : 'Belum aktif di HP ini. Masuk cukup dengan sidik jari, tanpa mengetik password. Hanya 1 perangkat per pengurus.');
  if($('bioPkBtnOn')) $('bioPkBtnOn').style.display = aktif ? 'none' : 'block';
  if($('bioPkBtnOff')) $('bioPkBtnOff').style.display = aktif ? 'block' : 'none';
}
async function bioPkTawarkan(){ // sekali per akun per HP, setelah masuk dengan password / kode email
  if(!pkToken || bioPkLihatSaja() || !(typeof jbData !== 'undefined' && jbData && jbData.nama) || !await bioTersedia()) return;
  const b = bioPkBaca(), kunci = 'bio_pk_tanya_' + jbData.nama;
  if(b && b.nama === jbData.nama) return; try{ if(localStorage.getItem(kunci)) return; localStorage.setItem(kunci, '1'); }catch(e){ return; }
  if(await dialogKonfirmasi('Aktifkan login dengan sidik jari di HP ini?\n\nLain kali masuk pengurus cukup dengan sidik jari. HP ini menjadi satu-satunya perangkat sidik jari Anda (perangkat lain dinonaktifkan). Bisa dimatikan kapan saja di Profil.')) bioPkAktifkan();
}
bioPkSegarkan();
