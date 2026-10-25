// Pengganti Google Form: kirim pengajuan ke Apps Script + tampilkan status
const API_URL = 'GANTI_DENGAN_URL_WEB_APP_APPS_SCRIPT'; // https://script.google.com/macros/s/AKfycbwuBNxy2l1jlKwTyANiqEr9F0nyee2aQl_fDFOpFXCWlRAwWyggO4Dj0ojI0T-IGmD3/exec
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function togglePernah(){ $('tglLunasWrap').style.display = $('pernahPinjam').value === 'Ya' ? 'block' : 'none'; }

async function kirimPengajuan(){
  if(!anggotaAktif){ alert('Cek NIK dulu'); return; }
  if(API_URL.startsWith('GANTI')){ alert('API_URL belum diisi'); return; }
  const g = id => $(id).value.trim();
  const d = {
    a:'ajukan', nik:anggotaAktif.nik, nominal:g('nomRange'), tenor:g('tenor'),
    alasan:g('tujuan'), alamat:g('alamat'), hp:g('hp'), email:g('email'), rek:g('rek'), gajiUnder:g('gajiUnder'),
    infaq:g('infaq')||0, pernahPinjam:g('pernahPinjam'), tglLunas:g('tglLunas'),
    jmlDitahan:g('jmlDitahan'), gajiDitahan:g('gajiDitahan')||(g('jmlDitahan')==='0'?'Tidak ada':''),
    gaji1:g('gaji1'), gaji2:g('gaji2'), gaji3:g('gaji3'),
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
