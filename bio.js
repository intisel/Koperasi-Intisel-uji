/* Login sidik jari (anggota). Sidik jari / kunci layar HP dicek lokal lewat WebAuthn; yang dilepas setelah lolos adalah TOKEN PERANGKAT dari server
   (per HP, berputar tiap dipakai, 30 hari, dicabut saat PIN diganti/direset). Sidik jari tidak pernah dikirim ke server. */
const BIO_KEY = 'bio_v1';
const bioDidukung = () => !!(window.isSecureContext && window.PublicKeyCredential && navigator.credentials && navigator.credentials.create);
const bioBaca = () => { try{ return JSON.parse(localStorage.getItem(BIO_KEY) || 'null'); }catch(e){ return null; } };
const bioSimpan = o => { try{ localStorage.setItem(BIO_KEY, JSON.stringify(o)); }catch(e){} };
const bioHapusLokal = () => { try{ localStorage.removeItem(BIO_KEY); }catch(e){} };
const bioB64 = buf => btoa(String.fromCharCode.apply(null, new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const bioDariB64 = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while(s.length % 4) s += '='; const b = atob(s), u = new Uint8Array(b.length); for(let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
async function bioTersedia(){ try{ return bioDidukung() && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); }catch(e){ return false; } }
const bioPreview = () => typeof adaPreview === 'function' && adaPreview();
function bioPerangkat(){ const u = navigator.userAgent || ''; const m = u.match(/\(([^)]*)\)/); return (m ? m[1] : u).replace(/Linux; |U; /g, '').slice(0, 50); }
function bioPesanGalat(e){
  if(e && (e.name === 'NotAllowedError' || e.name === 'AbortError')) return 'Dibatalkan atau sidik jari tidak dikenali.';
  if(e && e.name === 'InvalidStateError') return 'Perangkat ini sudah terdaftar.';
  return 'Sidik jari tidak dapat dipakai di perangkat/browser ini. Gunakan PIN.';
}
async function bioAktifkan(){ // anggota yang sudah masuk
  if(!anggotaAktif || bioPreview()) return;
  if(!await bioTersedia()){ alert('Perangkat ini belum memiliki sidik jari / kunci layar, atau browser tidak mendukung. Atur dulu di pengaturan HP.'); return; }
  const btn = $('bioBtnOn'); if(btn) btn.disabled = true;
  try{
    const cred = await navigator.credentials.create({publicKey:{
      challenge: crypto.getRandomValues(new Uint8Array(32)), rp:{name:'Koperasi Intisel'},
      user:{id: new TextEncoder().encode('nik-' + anggotaAktif.nik), name: anggotaAktif.nik, displayName: anggotaAktif.nama || anggotaAktif.nik},
      pubKeyCredParams:[{type:'public-key', alg:-7}, {type:'public-key', alg:-257}],
      authenticatorSelection:{authenticatorAttachment:'platform', userVerification:'required', residentKey:'discouraged'}, timeout:60000, attestation:'none'}});
    const r = await apiPost({a:'bio_daftar', nik:anggotaAktif.nik, atoken:anggotaAktif.atoken, perangkat:bioPerangkat()});
    if(!r.ok){ alert('❌ ' + (r.msg || 'Gagal mengaktifkan.')); }
    else{ bioSimpan({nik:anggotaAktif.nik, nama:anggotaAktif.nama || '', cid:bioB64(cred.rawId), btoken:r.btoken}); alert('✅ Login sidik jari aktif di HP ini. Berlaku ' + r.hari + ' hari sejak terakhir dipakai.'); }
  }catch(e){ alert(bioPesanGalat(e)); }
  if(btn) btn.disabled = false; bioSegarkan();
}
async function bioMatikan(semua){
  if(!anggotaAktif || bioPreview()) return;
  const b = bioBaca();
  if(!await dialogKonfirmasi(semua ? 'Matikan login sidik jari di SEMUA perangkat Anda?' : 'Matikan login sidik jari di HP ini?')) return;
  try{ const r = await apiPost({a:'bio_cabut', nik:anggotaAktif.nik, atoken:anggotaAktif.atoken, btoken:b ? b.btoken : '', semua:!!semua}); if(!r.ok){ alert('❌ ' + (r.msg || 'Gagal.')); return; } }
  catch(e){ alert('Gagal terhubung ke server.'); return; }
  if(semua || b) bioHapusLokal(); bioSegarkan();
}
async function bioMasuk(){ // dari layar login
  if(cekBusy) return; const b = bioBaca(); if(!b || !bioDidukung()){ bioSegarkan(); return; }
  cekBusy = true; const btn = $('bioLoginBtn'); if(btn) btn.disabled = true;
  let token = '', nik = b.nik;
  try{
    await navigator.credentials.get({publicKey:{challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials:[{type:'public-key', id:bioDariB64(b.cid), transports:['internal']}], userVerification:'required', timeout:60000}});
    const r = await fetch(API_URL, {method:'POST', body:JSON.stringify({a:'bio_login', nik, btoken:b.btoken})}).then(x => x.json());
    if(!r.ok){ if(r.bioHabis) bioHapusLokal(); lgPesan(r.msg || 'Masuk dengan PIN.'); }
    else{ bioSimpan(Object.assign({}, b, {btoken:r.btoken})); nikSimpanIngat(nik); $('nikInput').value = nik; token = r.atoken; }
  }catch(e){ lgPesan(e && e.name ? bioPesanGalat(e) : 'Gagal terhubung ke server. Periksa internet lalu coba lagi.'); }
  finally{ cekBusy = false; if(btn) btn.disabled = false; }
  bioSegarkan();
  if(token){ try{ await masukDenganToken(nik, token); }catch(e){} }
}
async function bioSegarkan(){ // tampilan layar login + kartu di profil
  const b = bioBaca(), ok = bioDidukung(), btn = $('bioLoginBtn');
  if(btn){ btn.style.display = (b && ok) ? 'block' : 'none'; const n = $('bioLoginNama'); if(n && b) n.innerText = b.nama ? ' (' + b.nama.split(' ')[0] + ')' : ''; }
  const kartu = $('bioKartu'); if(!kartu) return;
  const tersedia = ok && await bioTersedia(); kartu.style.display = (tersedia || b) ? '' : 'none';
  const aktif = !!(b && anggotaAktif && b.nik === anggotaAktif.nik);
  if($('bioStatus')) $('bioStatus').innerHTML = aktif ? '✅ <b>Aktif di HP ini.</b> Anda bisa masuk dengan sidik jari.' : (b ? 'Sidik jari aktif di HP ini untuk akun lain (NIK ' + esc(b.nik) + '). Mengaktifkan di sini akan menggantinya.' : 'Belum aktif di HP ini. Masuk cukup dengan sidik jari, tanpa mengetik PIN.');
  if($('bioBtnOn')) $('bioBtnOn').style.display = aktif ? 'none' : 'block';
  if($('bioBtnOff')) $('bioBtnOff').style.display = aktif ? 'block' : 'none';
}
async function bioTawarkan(){ // sekali per akun per HP, setelah masuk dengan PIN
  if(!anggotaAktif || bioPreview() || !await bioTersedia()) return;
  const b = bioBaca(), kunci = 'bio_tanya_' + anggotaAktif.nik;
  if((b && b.nik === anggotaAktif.nik)) return; try{ if(localStorage.getItem(kunci)) return; localStorage.setItem(kunci, '1'); }catch(e){ return; }
  if(await dialogKonfirmasi('Aktifkan login dengan sidik jari di HP ini?\n\nLain kali Anda masuk cukup dengan sidik jari, tanpa mengetik PIN. Bisa dimatikan kapan saja di menu Profil.')) bioAktifkan();
}
bioSegarkan();
