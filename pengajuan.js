// Pengganti Google Form: kirim pengajuan ke Apps Script + tampilkan status
const API_URL = 'https://script.google.com/macros/s/AKfycbwuBNxy2l1jlKwTyANiqEr9F0nyee2aQl_fDFOpFXCWlRAwWyggO4Dj0ojI0T-IGmD3/exec';
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function togglePernah(){ $('tglLunasWrap').style.display = $('pernahPinjam').value === 'Ya' ? 'block' : 'none'; }

/* ===== FORMAT & VALIDASI INPUT ===== */
const onlyDigits = s => String(s || '').replace(/\D/g, '');
const hpDigits = v => onlyDigits(String(v || '').replace(/^\s*\+?62/, '')).replace(/^0+/, '');
function fmtHp(raw){            // +62 897-1521-2487
  const d = hpDigits(raw).slice(0, 12);
  if(!d) return '';
  const g = [d.slice(0, 3)];
  for(let i = 3; i < d.length; i += 4) g.push(d.slice(i, i + 4));
  return '+62 ' + g.join('-');
}
function fmtMoney(raw){         // 2.500.000
  const d = onlyDigits(raw).replace(/^0+(?=\d)/, '');
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
const moneyVal = id => parseInt(onlyDigits($(id).value) || '0', 10);

function validate(el){
  const v = el.value.trim(), t = el.dataset.fmt;
  if(!v) return el.dataset.opt ? '' : 'Wajib diisi';
  if(t === 'hp')     return /^8\d{8,11}$/.test(hpDigits(v)) ? '' : 'Nomor HP tidak valid. Contoh: +62 897-1521-2487';
  if(t === 'email')  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Format email tidak valid. Contoh: nama@gmail.com';
  if(t === 'digits') return /^\d{8,16}$/.test(v) ? '' : 'Nomor rekening hanya angka (8-16 digit)';
  return '';
}
function showErr(el, msg){
  let e = el.nextElementSibling;
  if(!e || !e.classList.contains('ferr')){
    e = document.createElement('div'); e.className = 'ferr small'; e.style.color = '#c0392b'; el.after(e);
  }
  e.textContent = msg; el.style.borderColor = msg ? '#c0392b' : '';
}
function initFmt(){
  document.querySelectorAll('[data-fmt]').forEach(el => {
    const t = el.dataset.fmt;
    el.addEventListener('input', () => {
      if(t === 'hp') el.value = fmtHp(el.value);
      else if(t === 'money') el.value = fmtMoney(el.value);
      else if(t === 'digits') el.value = onlyDigits(el.value).slice(0, 16);
      if(el.dataset.touched) showErr(el, validate(el));
    });
    el.addEventListener('blur', () => { el.dataset.touched = '1'; showErr(el, validate(el)); });
  });
}
document.addEventListener('DOMContentLoaded', initFmt);

async function kirimPengajuan(){
  if(!anggotaAktif){ alert('Cek NIK dulu'); return; }
  if(API_URL.startsWith('GANTI')){ alert('API_URL belum diisi'); return; }
  // validasi semua kolom berformat
  let first = null;
  document.querySelectorAll('[data-fmt]').forEach(el => {
    const m = validate(el); el.dataset.touched = '1'; showErr(el, m);
    if(m && !first) first = el;
  });
  if(first){ first.scrollIntoView({behavior:'smooth', block:'center'}); first.focus(); alert('Periksa kolom yang berwarna merah.'); return; }
  const g = id => $(id).value.trim();
  const d = {
    a:'ajukan', nik:anggotaAktif.nik, nominal:g('nomRange'), tenor:g('tenor'),
    alasan:g('tujuan'), alamat:g('alamat'), hp:g('hp'), email:g('email'), rek:onlyDigits(g('rek')), gajiUnder:g('gajiUnder'),
    infaq:moneyVal('infaq'), pernahPinjam:g('pernahPinjam'), tglLunas:g('tglLunas'),
    jmlDitahan:g('jmlDitahan'), gajiDitahan:g('gajiDitahan')||(g('jmlDitahan')==='0'?'Tidak ada':''),
    gaji1:moneyVal('gaji1'), gaji2:moneyVal('gaji2'), gaji3:moneyVal('gaji3'),
    namaDarurat:g('namaDarurat'), hpDarurat:g('hpDarurat'), hubungan:g('hubungan')
  };
  if(!$('setuju').checked){ alert('Centang pernyataan persetujuan dulu'); return; }
  const btn = $('btnKirim'); btn.disabled = true; btn.innerText = 'Mengirim...';
  try{
    const r = await (await fetch(API_URL, {method:'POST', body:JSON.stringify(d)})).json();
    if(r.ok){
      localStorage.setItem('intisel_nik', anggotaAktif.nik);
      alert('✅ Pengajuan terkirim. No: ' + r.id);
      $('formPinjam').style.display = 'none';
      muatStatus();
    } else alert('❌ ' + r.msg);
  }catch(e){ alert('Gagal terhubung ke server. Coba lagi.'); }
  btn.disabled = false; btn.innerText = 'Kirim Pengajuan';
}

const LABEL = {REVIEW_PENGURUS:'⏳ Direview Pengurus', MENUNGGU_PIMPINAN:'⏳ Menunggu Pimpinan', DISETUJUI:'✅ Disetujui', DITOLAK:'❌ Ditolak'};
const ICON = v => v==='Y' ? '✅' : v==='N' ? '❌' : '⏳';

async function muatStatus(){
  const nik = (anggotaAktif && anggotaAktif.nik) || localStorage.getItem('intisel_nik');
  const box = $('statusBox'); $('statusCard').style.display = 'block';
  if(!nik){ box.innerHTML = '<p class="small">Masukkan NIK dulu.</p>'; return; }
  box.innerHTML = '<p class="small">Memuat...</p>';
  try{
    const r = await (await fetch(API_URL + '?a=status&nik=' + encodeURIComponent(nik))).json();
    if(!r.list || !r.list.length){ box.innerHTML = '<p class="small">Belum ada pengajuan.</p>'; return; }
    box.innerHTML = r.list.map(p => {
      const done = p.pengurus.filter(x => x.v==='Y').length;
      return `<div class="ok" style="margin-bottom:10px;background:#fff">
        <b>${esc(p.id)}</b> • ${esc(p.waktu)}<br>Rp ${p.nominal.toLocaleString('id-ID')} / ${p.tenor} bln<br>
        <b>${LABEL[p.status]||esc(p.status)}</b>
        <div class="small" style="margin-top:6px">
          ${p.pengurus.map(x => ICON(x.v)+' '+esc(x.nama)).join('<br>')}
          <br>${p.status==='REVIEW_PENGURUS' ? 'Review pengurus: '+done+'/3' : ICON(p.pimpinan)+' Persetujuan Pimpinan'}
          ${p.alasanTolak ? '<br><b>Catatan:</b> '+esc(p.alasanTolak) : ''}
        </div></div>`;
    }).join('');
  }catch(e){ box.innerHTML = '<p class="small">Gagal memuat status.</p>'; }
}
