/* BUDGET PINJAMAN BULANAN (menu pengurus): lihat kuota terpakai/sisa per bulan; Ketua & Bendahara dapat mengatur */
let bdData = null;
function bdAngka(v){ return parseInt(String(v || '').replace(/\D/g, ''), 10) || 0; }
function bdFmtInput(el){ const n = bdAngka(el.value); el.value = n ? n.toLocaleString('id-ID') : ''; }
function bdBar(st){
  const persen = st.budget > 0 ? Math.min(100, Math.round(st.terpakai / st.budget * 100)) : (st.terpakai > 0 ? 100 : 0), lebih = st.sisa < 0;
  const warna = lebih ? '#dc2626' : persen >= 100 ? '#dc2626' : persen >= 80 ? '#f59e0b' : '#16a34a';
  return `<div style="background:#d6e6f8;border-radius:8px;height:10px;margin:6px 0 4px;overflow:hidden"><div style="width:${persen}%;height:100%;background:${warna}"></div></div>
    <div class="small"><b>${pkRp(st.terpakai)}</b> terpakai dari ${pkRp(st.budget)} • ${lebih ? '<b style="color:#dc2626">terlampaui ' + pkRp(-st.sisa) + '</b>' : st.sisa === 0 ? '<b style="color:#dc2626">penuh</b>' : 'sisa <b>' + pkRp(st.sisa) + '</b>'} • ${st.n} pengajuan</div>`;
}
function bdDaftarTxt(st){
  if(!st.daftar.length) return '';
  const ST = {REVIEW_PENGURUS:'review', MENUNGGU_PIMPINAN:'menunggu pimpinan', MENUNGGU_PENCAIRAN:'menunggu cair', DISETUJUI:'berjalan', LUNAS:'lunas'};
  return `<details style="margin-top:4px"><summary class="small" style="cursor:pointer;color:#134e8a;font-weight:700">Rincian pengajuan</summary>` +
    st.daftar.map(x => `<div class="small" style="padding:3px 0;border-top:1px solid #eef3fa">${esc(x.nama)} • ${pkRp(x.nominal)} • ${ST[x.status] || esc(x.status)}${x.antre ? ' • <span style="color:#7c3aed">antre</span>' : ''}</div>`).join('') + '</details>';
}
function bdKartuBulan(b, bisaUbah){
  return `<div class="ok" style="background:#fff;margin-bottom:10px">
    <b>📅 ${esc(b.label)}</b>${b.koperasi.diatur ? ' <span class="small">(diatur khusus)</span>' : ''}${b.catatan ? '<div class="small" style="margin-top:2px">📝 ' + esc(b.catatan) + '</div>' : ''}
    <div style="margin-top:8px"><b>🏦 Pinjaman Koperasi</b>${bdBar(b.koperasi)}${bdDaftarTxt(b.koperasi)}</div>
    <div style="margin-top:10px"><b>💸 Kasbon</b>${bdBar(b.kasbon)}${bdDaftarTxt(b.kasbon)}</div>
    ${bisaUbah ? `<button class="btn" style="margin-top:10px;padding:10px;font-size:13.5px" onclick="bdAtur('${b.ym}')">✏️ Atur budget bulan ini</button>` : ''}
    <div id="bdForm-${b.ym}"></div></div>`;
}
async function bdMuat(){
  const box = $('bdIsi'); if(!box) return;
  box.innerHTML = '<p class="small">Memuat...</p>';
  try{
    const r = await pkApi({a:'budget_daftar', token:pkToken});
    if(r.expired){ pkExpired(); return; }
    if(!r.ok){ box.innerHTML = `<div class="err">${esc(r.msg)}</div>`; return; }
    bdData = r;
    if(r.auto){ bdOtomatis(r, box); return; }
    box.innerHTML = `<div class="ok" style="margin-bottom:10px">ℹ️ Budget tiap bulan <b>berdiri sendiri</b>: sisa budget bulan ini <b>tidak ditambahkan</b> ke bulan berikutnya (mis. terpakai Rp 10 juta dari Rp 25 juta, bulan depan tetap Rp 25 juta).</div><div class="warn" style="margin-bottom:10px">Budget bawaan: koperasi <b>${pkRp(r.def.koperasi)}</b> • kasbon <b>${pkRp(r.def.kasbon)}</b> per bulan.
      ${r.bisaUbah ? `<button class="btn btn-yellow" style="margin-top:8px;padding:10px;font-size:13.5px" onclick="bdAtur('DEFAULT')">✏️ Ubah budget bawaan</button><div id="bdForm-DEFAULT"></div>` : '<br>Pengaturan hanya dapat dilakukan oleh Ketua dan Bendahara.'}</div>` +
      r.bulan.map(b => bdKartuBulan(b, r.bisaUbah)).join('');
  }catch(e){ box.innerHTML = '<div class="err">Gagal memuat budget. Periksa koneksi.</div>'; }
}
function bdAtur(ym){
  const f = $('bdForm-' + ym); if(!f) return;
  if(f.innerHTML){ f.innerHTML = ''; return; }
  const b = ym === 'DEFAULT' ? {koperasi:{budget:bdData.def.koperasi}, kasbon:{budget:bdData.def.kasbon}, catatan:''} : bdData.bulan.find(x => x.ym === ym);
  f.innerHTML = `<div style="margin-top:10px;border-top:1px dashed #b9d2f0;padding-top:8px">
    <p class="small" style="margin:0 0 6px">Sesuaikan dengan sisa dana yang ada di rekening koperasi.</p>
    <label class="small">Budget Pinjaman Koperasi (Rp)</label><input id="bdKop-${ym}" inputmode="numeric" value="${b.koperasi.budget.toLocaleString('id-ID')}" oninput="bdFmtInput(this)">
    <label class="small">Budget Kasbon (Rp)</label><input id="bdKsb-${ym}" inputmode="numeric" value="${b.kasbon.budget.toLocaleString('id-ID')}" oninput="bdFmtInput(this)">
    ${ym === 'DEFAULT' ? '' : `<label class="small">Catatan (opsional)</label><input id="bdCat-${ym}" maxlength="200" value="${esc(b.catatan || '')}" placeholder="Mis. saldo rekening menipis"><label class="small" style="display:flex;gap:8px;align-items:center;margin:0 0 8px"><input type="checkbox" id="bdDef-${ym}" style="width:auto;margin:0"> Jadikan juga budget bawaan bulan-bulan berikutnya</label>`}
    <button class="btn" style="padding:10px;font-size:14px" onclick="bdSimpan('${ym}')">💾 Simpan</button></div>`;
}
async function bdSimpan(ym){
  const kop = bdAngka($('bdKop-' + ym).value), ksb = bdAngka($('bdKsb-' + ym).value);
  if(!await dialogKonfirmasi('Simpan budget ' + (ym === 'DEFAULT' ? 'bawaan' : 'bulan ini') + '?\n\nKoperasi: ' + pkRp(kop) + '\nKasbon: ' + pkRp(ksb))) return;
  try{
    const r = await pkApi({a:'budget_simpan', token:pkToken, bulan:ym, koperasi:kop, kasbon:ksb, catatan:ym === 'DEFAULT' ? '' : $('bdCat-' + ym).value, jadiDefault:ym !== 'DEFAULT' && $('bdDef-' + ym).checked});
    if(r.expired){ pkExpired(); return; }
    alert(r.ok ? r.msg : '❌ ' + r.msg);
    if(r.ok) bdMuat();
  }catch(e){ alert('Gagal terhubung ke server. Periksa koneksi lalu coba lagi.'); }
}

function bdOtomatis(r, box){ // budget otomatis mengikuti saldo Kas Koperasi
  const ok = r.tersedia >= 0, jenisLbl = {KOPERASI:'Pinjaman', KASBON:'Kasbon'};
  box.innerHTML = `<div class="ok" style="margin-bottom:10px">ℹ️ Budget kini <b>otomatis mengikuti saldo Kas Koperasi</b>. Tidak perlu diatur manual.</div>
    <div class="stt"><div><b style="color:#134e8a">${pkRp(r.saldo)}</b><span class="small">Saldo kas real-time</span></div><div><b style="color:#b45309">− ${pkRp(r.cadangan)}</b><span class="small">Cadangan dana talangan pengelola (tidak boleh dipakai pinjaman)</span></div></div>
    <div class="stt" style="margin-top:0"><div><b style="color:#b45309">− ${pkRp(r.komit)}</b><span class="small">Pinjaman/kasbon diajukan atau disetujui, belum cair</span></div><div style="border-color:${ok ? '#86efac' : '#fca5a5'};background:${ok ? '#ecfdf3' : '#fef2f2'}"><b style="color:${ok ? '#166534' : '#b91c1c'}">${pkRp(r.tersedia)}</b><span class="small">Dana tersedia untuk pengajuan baru</span></div></div>
    ${r.talangan > 0 ? `<div class="small" style="margin-bottom:8px">Cadangan penuh ${pkRp(r.cadanganPenuh)}; sebagian sedang dipakai dana talangan pengelola sebesar <b>${pkRp(r.talangan)}</b> (belum kembali / disetujui belum cair), sisa cadangan ${pkRp(r.cadangan)}.</div>` : ''}
    ${ok ? '' : '<div class="warn" style="margin-bottom:10px">Dana tersedia minus: pinjaman yang belum cair melebihi saldo kas setelah cadangan. Pengajuan baru ditolak sistem sampai dana tersedia lagi.</div>'}
    <b>Belum dicairkan (${r.daftar.length})</b>
    ${r.daftar.length ? r.daftar.map(x => `<div style="display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid #d6e6f8;padding:7px 0"><span>${esc(x.nama)}<br><span class="small">${esc(x.id)} • ${jenisLbl[x.jenis] || x.jenis} • ${esc(pkLabel[x.status] || x.status)}</span></span><b>${pkRp(x.nominal)}</b></div>`).join('') : '<p class="small">Tidak ada pinjaman yang menunggu pencairan.</p>'}`;
}
