/* Penyelesaian Khusus: anggota keluar / meninggal dunia. Diusulkan pengurus, wajib disetujui Penasehat + Ketua + Bendahara. Sisa tagihan di atas Rp 1.000.000: Pimpinan wajib ikut menyetujui. */
const SK_LABEL = {MENUNGGU:'⏳ Menunggu keputusan', DISETUJUI:'✅ Disetujui — pinjaman ditutup', DITOLAK:'❌ Ditolak'};
let skFoto = '', skPinjaman = [];
async function skMuat(){
  const box = $('skDaftar'); if(!box) return;
  try{
    const r = await pkApi({a:'sk_daftar', token:pkToken});
    if(r.expired){ pkExpired(); return; }
    if(!r.ok){ box.innerHTML = `<div class="err">${esc(r.msg)}</div>`; return; }
    pkBadge2('pbSelesai', r.menunggu.filter(k => k.bisaPutus).length);
    $('skFormBox').classList.toggle('hidden', !r.bisaAjukan);
    box.innerHTML = (r.menunggu.length ? r.menunggu.map(skKartu).join('') : '<p class="small">Tidak ada usulan yang menunggu. ✅</p>') +
      (r.riwayat.length ? '<div style="font-weight:800;margin:14px 0 6px">Riwayat terakhir</div>' + r.riwayat.map(skKartu).join('') : '');
    if(r.bisaAjukan){ skPinjaman = []; skMuatPinjaman(); }
  }catch(e){ box.innerHTML = '<div class="err">Gagal memuat data.</div>'; }
}
async function skMuatPinjaman(){
  if(skPinjaman.length) return;
  try{
    const r = await pkApi({a:'daftar_status', token:pkToken, status:'DISETUJUI'});
    if(r.ok) skPinjaman = r.list;
  }catch(e){}
}
function skCariIsi(){
  $('skPinjaman').value = ''; $('skInfo').style.display = 'none';
  const q = ($('skCari').value || '').trim().toLowerCase(), box = $('skSaran');
  if(!q){ box.innerHTML = ''; return; }
  const hit = skPinjaman.filter(p => String(p.nama).toLowerCase().indexOf(q) >= 0 || String(p.id).toLowerCase().indexOf(q) >= 0).slice(0, 8);
  box.innerHTML = hit.length ? hit.map(p => `<div class="small" style="padding:10px;border:1px solid #b9d2f0;border-radius:8px;margin:4px 0;background:#fff;cursor:pointer" onclick="skPilih('${esc(p.id)}')"><b>${esc(p.nama)}</b> • ${esc(p.id)}<br>Sisa belum terbayar <b>${pkRp(p.sisa)}</b></div>`).join('') : '<p class="small">Tidak ada pinjaman berjalan dengan nama itu.</p>';
}
function skPilih(id){
  const x = skPinjaman.filter(p => p.id === id)[0]; if(!x) return;
  $('skPinjaman').value = id; $('skCari').value = x.nama; $('skSaran').innerHTML = '';
  const b = $('skInfo'); b.style.display = 'block';
  b.innerHTML = `<b>${esc(x.nama)}</b> (${esc(x.id)})<br><span class="small">Pinjaman ${pkRp(x.nominal)} • ${x.jenis === 'KASBON' ? 'kasbon' : x.tenor + ' bulan'} • ${x.lunasKe || 0}/${x.total || 0} angsuran lunas</span><div style="font-size:18px;font-weight:800;color:#b91c1c;margin-top:4px">Sisa belum terbayar ${pkRp(x.sisa)}</div>` +
    (x.sisa > 1000000 ? '<div class="small" style="margin-top:4px">⚠ Di atas Rp 1.000.000 — Pimpinan juga wajib menyetujui.</div>' : '');
}
function skKartu(k){
  const sid = esc(k.sid);
  return `<div class="ok" style="background:#fff;margin-bottom:12px" id="sk-${sid}">
    <b>${esc(k.nama)}</b> <span class="small">(${esc(k.id)} • diusulkan ${esc(k.pengaju)} • ${esc(k.waktu)})</span><br>
    <span class="small">${esc(k.jenisTeks)} • tgl kejadian ${esc(k.tgl)}${k.perluPimpinan ? ' • <b>perlu persetujuan Pimpinan</b>' : ''}</span><br>
    <span class="small">Sisa tagihan <b>${pkRp(k.sisa)}</b> • diterima <b>${pkRp(k.dibayar)}</b> • dihapuskan <b style="color:#b91c1c">${pkRp(k.dihapus)}</b></span>
    <div class="small" style="white-space:pre-wrap;margin:6px 0;padding:8px;background:#f4f9ff;border-radius:8px">${esc(k.uraian)}</div>
    <a href="#" class="small" onclick="skBukti('${sid}');return false">📎 Lihat dokumen pendukung</a><div id="skb-${sid}"></div>
    <div class="small" style="margin-top:6px"><b>Suara pengurus:</b> ${(k.suara || []).map(x => (x.v === 'Y' ? '✅' : x.v === 'N' ? '❌' : '⏳') + ' ' + esc(x.jabatan || x.nama) + (x.k ? ' <i>“' + esc(x.k) + '”</i>' : '')).join(' • ')}</div>
    ${k.status === 'MENUNGGU' ? (k.bisaPutus ? `
      <textarea id="skK-${sid}" rows="2" placeholder="Komentar (wajib bila menolak)" style="margin-top:8px"></textarea>
      <div style="display:flex;gap:8px"><button class="btn" style="background:#16a34a;padding:12px;font-size:14px" onclick="skPutus('${sid}','Y','${esc(k.nama).replace(/'/g, '')}')">✔ Setujui</button><button class="btn" style="background:#dc2626;padding:12px;font-size:14px" onclick="skPutus('${sid}','N','${esc(k.nama).replace(/'/g, '')}')">✖ Tolak</button></div>`
      : '<p class="small">Menunggu suara pengurus lain. Keputusan oleh Penasehat, Ketua, dan Bendahara' + (k.perluPimpinan ? ', ditambah Pimpinan' : '') + ' (semuanya harus setuju).</p>')
      : `<div class="small" style="margin-top:6px"><b>${SK_LABEL[k.status] || esc(k.status)}</b> • ${esc(k.oleh)} • ${esc(k.waktuPutus)}${k.komentar ? '<br><i>“' + esc(k.komentar) + '”</i>' : ''}</div>`}
  </div>`;
}
async function skBukti(sid){
  const box = $('skb-' + sid); if(!box) return; box.innerHTML = '<span class="small">Memuat foto...</span>';
  try{
    const r = await pkApi({a:'sk_foto', token:pkToken, sid});
    if(r.expired){ pkExpired(); return; }
    if(!r.ok){ box.innerHTML = `<div class="err">${esc(r.msg)}</div>`; return; }
    const img = document.createElement('img'); img.src = r.data; img.alt = 'Dokumen pendukung';
    img.style.cssText = 'max-width:100%;border-radius:10px;margin-top:6px;border:1px solid #b9d2f0';
    box.innerHTML = ''; box.appendChild(img);
  }catch(e){ box.innerHTML = '<div class="err">Gagal memuat foto.</div>'; }
}
function skPilihFoto(inp){
  const f = inp.files && inp.files[0]; skFoto = ''; if(!f) return;
  const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => {
    const m = 1400, s = Math.min(1, m / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = im.width * s; c.height = im.height * s;
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); skFoto = c.toDataURL('image/jpeg', 0.8); $('skFotoInfo').innerText = '✔ Dokumen terpilih'; }; im.src = rd.result; }; rd.readAsDataURL(f);
}
async function skAjukan(){
  const id = $('skPinjaman').value, nama = (skPinjaman.filter(p => p.id === id)[0] || {}).nama || '';
  const o = {a:'sk_ajukan', token:pkToken, id, jenis:$('skJenis').value, tgl:$('skTgl').value, dibayar:moneyVal($('skDibayar').value), uraian:$('skUraian').value, foto:skFoto};
  if(!id){ alert('Pilih pinjaman terlebih dahulu.'); return; }
  if(!await dialogKonfirmasi('Usulkan penyelesaian khusus untuk ' + nama + '?\n\nPinjaman baru ditutup bila ketiga pengurus (dan Pimpinan bila sisa di atas Rp 1.000.000) menyetujui.')) return;
  const b = $('skKirim'); b.disabled = true;
  try{
    const r = await pkApi(o); if(r.expired){ pkExpired(); return; }
    alert(r.ok ? r.msg : '❌ ' + r.msg);
    if(r.ok){ ['skUraian', 'skDibayar'].forEach(i => $(i).value = ''); $('skPinjaman').value = ''; $('skCari').value = ''; skPinjaman = []; skFoto = ''; $('skFotoInfo').innerText = ''; $('skInfo').style.display = 'none'; }
  }catch(e){ alert('Gagal terhubung ke server.'); }
  b.disabled = false; skMuat();
}
async function skPutus(sid, v, nama){
  const kom = ($('skK-' + sid).value || '').trim();
  if(v === 'N' && !kom){ alert('Alasan penolakan wajib diisi.'); return; }
  if(!await dialogKonfirmasi((v === 'Y' ? 'Setujui penyelesaian khusus untuk ' + nama + '? Pinjaman ditutup bila semua pihak yang diwajibkan menyetujui.' : 'Tolak usulan penyelesaian khusus untuk ' + nama + '?') + '\n\nLanjutkan?')) return;
  document.querySelectorAll('#sk-' + sid + ' button').forEach(b => b.disabled = true);
  try{
    const r = await pkApi({a:'sk_putus', token:pkToken, sid, v, komentar:kom});
    if(r.expired){ pkExpired(); return; }
    alert(r.ok ? r.msg : '❌ ' + r.msg);
  }catch(e){ alert('Gagal terhubung ke server.'); }
  skMuat();
}
