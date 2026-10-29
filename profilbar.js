// Bilah profil anggota: foto + mahkota tingkat masa kerja, jabatan, masa kerja (thn/bln/hari), lonceng notifikasi (kotak masuk broadcast)
function masaKerjaDetail(tglMasuk){
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(tglMasuk || '')); if(!m) return null;
  const n = new Date(); let y = n.getFullYear() - +m[1], b = n.getMonth() + 1 - +m[2], d = n.getDate() - +m[3];
  if(d < 0){ b--; d += new Date(n.getFullYear(), n.getMonth(), 0).getDate(); }
  if(b < 0){ y--; b += 12; }
  return {y: Math.max(0, y), b, d, tahun: Math.max(0, y) + b / 12 + d / 365};
}
const TINGKAT = [ // [batas bawah (tahun), nama]
  [15.0001, 'Diamond'], [10, 'Platinum'], [5, 'Gold'], [2, 'Silver'], [0, 'Brown']];
function tingkatDari(tahun){ return (TINGKAT.find(t => tahun >= t[0]) || TINGKAT[4])[1]; }
const MAHKOTA = '<path d="M2.5 20.5 L4.6 6.4 L11 13.2 L16 3.2 L21 13.2 L27.4 6.4 L29.5 20.5 Z" fill="url(#cg)" stroke="STROKE" stroke-width="1.1" stroke-linejoin="round"/><rect x="2.8" y="20" width="26.4" height="3.6" rx="1.2" fill="url(#cb)" stroke="STROKE" stroke-width=".9"/>';
function mahkotaSvg(t){
  const W = {
    Brown:    {g: ['#e0a070', '#a8642d', '#6b3a14'], b: ['#c07a3a', '#6b3a14'], s: '#4a2508', extra: ''},
    Silver:   {g: ['#ffffff', '#c3c8cf', '#8a919a'], b: ['#dfe3e8', '#8a919a'], s: '#5d646d', extra: ''},
    Gold:     {g: ['#fff3a0', '#ffd21f', '#d28f00'], b: ['#ffe066', '#c98400'], s: '#9a6400', extra: ''},
    Platinum: {g: ['#ffffff', '#e4ebf2', '#a7b4c4'], b: ['#ffffff', '#9fb0c2'], s: '#5f7188',
      extra: '<path d="M6 19 L8 9 L12 14 Z" fill="#fff" opacity=".85"/><path d="M14 6 L16 4.6 L17.5 9 Z" fill="#fff" opacity=".9"/><circle cx="24" cy="9" r="1" fill="#fff"/><circle cx="8.5" cy="7.5" r=".8" fill="#fff"/>'},
    Diamond:  {g: ['#4a4a4a', '#151515', '#000000'], b: ['#f3d36b', '#b88a10'], s: '#e2b93b',
      extra: '<polygon points="16,9.2 19.6,13 16,18.2 12.4,13" fill="#9fe8ff" stroke="#fff" stroke-width=".7"/><polygon points="16,9.2 17.8,13 14.2,13" fill="#ffffff" opacity=".9"/><polygon points="12.4,13 19.6,13 16,18.2" fill="#35b8e0" opacity=".75"/><circle cx="4.6" cy="6.4" r="1.5" fill="#f3d36b"/><circle cx="27.4" cy="6.4" r="1.5" fill="#f3d36b"/><circle cx="16" cy="3.2" r="1.6" fill="#9fe8ff" stroke="#fff" stroke-width=".5"/>'}
  }[t];
  const grad = `<defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${W.g[0]}"/><stop offset=".55" stop-color="${W.g[1]}"/><stop offset="1" stop-color="${W.g[2]}"/></linearGradient><linearGradient id="cb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${W.b[0]}"/><stop offset="1" stop-color="${W.b[1]}"/></linearGradient></defs>`;
  return '<svg viewBox="0 0 32 25" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + grad + MAHKOTA.replace(/STROKE/g, W.s) + W.extra + '</svg>';
}
function profilBarIsi(a){
  inboxData = []; inboxBadge();
  const mk = masaKerjaDetail(a.tglMasuk), tahun = mk ? mk.tahun : (+a.masaKerja || 0), t = tingkatDari(tahun);
  $('sbNama').textContent = a.nama; $('sbJab').textContent = a.jabatan || '';
  $('sbMasa').textContent = mk ? t + ' (' + mk.y + ' Th ' + mk.b + ' Bln)' : t + ' (' + Math.floor(+a.masaKerja || 0) + ' Th)';
  const c = $('avCrown'); c.innerHTML = mahkotaSvg(t); c.title = 'Tingkat ' + t; $('avMember').setAttribute('data-tingkat', t);
}

function profilBarPk(r){
  const mk = masaKerjaDetail(r.tglMasuk), c = $('avCrownPk');
  $('pkMasa').textContent = mk ? tingkatDari(mk.tahun) + ' (' + mk.y + ' Th ' + mk.b + ' Bln)' : '';
  if(mk){ const t = tingkatDari(mk.tahun); c.innerHTML = mahkotaSvg(t); c.title = 'Tingkat ' + t; c.style.display = ''; } else { c.innerHTML = ''; c.style.display = 'none'; }
  inboxData = []; inboxBadge(); inboxMuat();
}

/* ---------- Kotak masuk notifikasi (broadcast dari pengurus) ---------- */
let inboxData = [];
const inboxPk = () => (typeof pkToken !== 'undefined' && pkToken && currentPage === 'pengurus');
const inboxKunci = () => 'inbox_seen_' + (inboxPk() ? 'pk_' + $('pkNama').textContent : (anggotaAktif ? anggotaAktif.nik : ''));
const inboxSeen = () => { try{ return localStorage.getItem(inboxKunci()) || ''; }catch(e){ return ''; } };
function inboxBadge(){
  const s = inboxSeen(), n = inboxData.filter(x => x.id > s).length;
  ['bellBadge', 'bellBadgePk'].forEach(id => { const e = $(id); if(!e) return; e.textContent = n > 9 ? '9+' : String(n); e.style.display = n ? 'block' : 'none'; });
}
async function inboxMuat(){
  const pk = inboxPk(), a = anggotaAktif; if(!pk && !a) return;
  const kunci = inboxKunci();
  try{ const r = await apiPost(pk ? {a: 'notif_inbox', token: pkToken} : {a: 'notif_inbox', nik: a.nik, atoken: a.atoken}); if(r && r.ok && kunci === inboxKunci()){ inboxData = r.list || []; inboxBadge(); } }catch(e){}
}
async function inboxBuka(){
  $('inboxModal').classList.remove('hidden'); modalPush(inboxTutupUI);
  const box = $('inboxList'); box.textContent = inboxData.length ? '' : 'Memuat...';
  await inboxMuat(); const seen = inboxSeen(); box.textContent = '';
  if(!inboxData.length){ const p = document.createElement('p'); p.className = 'small'; p.textContent = 'Belum ada notifikasi dari pengurus.'; box.appendChild(p); }
  inboxData.forEach(x => {
    const k = document.createElement('div'); k.className = 'inbox' + (x.id > seen ? ' baru' : '');
    const j = document.createElement('b'); j.textContent = x.judul;
    const i = document.createElement('div'); i.textContent = x.isi;
    const m = document.createElement('div'); m.className = 'small'; m.style.marginTop = '4px'; m.textContent = String(x.waktu).slice(0, 16);
    k.append(j, i, m); box.appendChild(k);
  });
  if(inboxData.length){ try{ localStorage.setItem(inboxKunci(), inboxData[0].id); }catch(e){} } inboxBadge();
}
function inboxTutupUI(){ $('inboxModal').classList.add('hidden'); }
function inboxTutup(){ if(window.modalRiwayat) history.back(); else inboxTutupUI(); }
document.addEventListener('visibilitychange', () => { if(!document.hidden && ((typeof anggotaAktif !== 'undefined' && anggotaAktif) || inboxPk())) inboxMuat(); });
