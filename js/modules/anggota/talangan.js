/* ===== Dana Talangan Operasional (anggota berkategori pengelola/managerial) ===== */
let tlnData = null;
const TLN_BADGE = {MENUNGGU_PIMPINAN:['MENUNGGU PIMPINAN', '#dbeafe', '#134e8a'], DISETUJUI:['DISETUJUI — MENUNGGU PENCAIRAN', '#fef3c7', '#92400e'], DICAIRKAN:['SUDAH DICAIRKAN', '#dcfce7', '#166534'], DITOLAK:['DITOLAK', '#fee2e2', '#991b1b'], DIBATALKAN:['DIBATALKAN', '#eef2f7', '#475569']};
async function tlnMuat(){
  if(!anggotaAktif) return;
  $('tlnList').innerHTML = '<p class="small">Memuat...</p>';
  try{
    const r = await apiPost({a:'tln_saya', nik:anggotaAktif.nik, atoken:anggotaAktif.atoken});
    if(!r.ok){ $('tlnList').innerHTML = `<div class="err">${esc(r.msg || 'Gagal memuat')}</div>`; return; }
    tlnData = r;
    const t = $('tlnTglButuh'); t.min = r.hariIni; if(!t.value) t.value = r.hariIni;
    const b = $('tlnTglBayar'); b.min = r.hariIni;
    $('tlnSisa').innerHTML = r.sisa > 0 ? `<div class="warn" style="margin:8px 0">Dana talangan yang <b>belum Anda kembalikan: ${rpf(r.sisa)}</b>${r.sejak ? ' (sejak ' + tglf(r.sejak) + ')' : ''}.</div>` : '';
    tlnBudgetTampil();
    const aktif = r.list.some(x => x.status === 'MENUNGGU_PIMPINAN');
    $('tlnBtn').disabled = aktif; $('tlnBtn').innerText = aktif ? 'Masih ada permintaan yang menunggu' : 'Kirim Permintaan';
    $('tlnList').innerHTML = r.list.length ? r.list.map(p => {
      const bd = TLN_BADGE[p.status] || [p.status, '#eef5ff', '#134e8a'];
      return `<div style="border-bottom:1px solid #d6e6f8;padding:10px 0"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><b>${esc(p.id)}</b><br><span class="small">${tglf(p.waktu.slice(0, 10))}</span></div><span class="badge" style="background:${bd[1]};color:${bd[2]};margin-left:0">${bd[0]}</span></div>
        <div style="margin-top:6px"><b>${rpf(p.nominal)}</b></div><div class="small">${esc(p.ket)}<br>Dibutuhkan ${tglf(p.tglButuh)} • dikembalikan ${tglf(p.tglBayar)}</div>
        ${p.status === 'DITOLAK' && p.catatan ? `<div class="small" style="color:#991b1b;margin-top:4px">Catatan pimpinan: ${esc(p.catatan)}</div>` : ''}
        ${p.status === 'MENUNGGU_PIMPINAN' ? `<span class="back-link" style="margin:6px 0 0;display:inline-block" onclick="tlnBatal('${esc(p.id)}')">✖ Batalkan permintaan</span>` : ''}</div>`;
    }).join('') : '<p class="small">Belum ada permintaan.</p>';
  }catch(e){ $('tlnList').innerHTML = '<div class="err">Gagal terhubung ke server.</div>'; }
}
async function tlnKirim(){
  if(!anggotaAktif){ alert('Masuk dulu'); return; }
  const nominal = moneyVal('tlnNominal'), ket = $('tlnKet').value.trim(), butuh = $('tlnTglButuh').value, bayar = $('tlnTglBayar').value;
  if(!(nominal >= 100000)){ alert('Isi nominal minimal Rp 100.000.'); return; }
  if(ket.length < 10){ alert('Isi keperluan dengan jelas (minimal 10 huruf).'); return; }
  if(!butuh){ alert('Isi tanggal dana dibutuhkan.'); return; }
  if(!bayar){ alert('Isi perkiraan tanggal pembayaran.'); return; }
  if(bayar < butuh){ alert('Perkiraan tanggal pembayaran tidak boleh sebelum tanggal dana dibutuhkan.'); return; }
  const png = await ttdMinta({nama:anggotaAktif.nama, jenis:'TALANGAN', nominal, tenor:bayar, infaq:0});
  if(!png) return;
  const btn = $('tlnBtn'); btn.disabled = true; btn.innerText = 'Mengirim...';
  let sukses = false, pesan = '';
  try{
    const r = await apiPost({a:'tln_ajukan', nik:anggotaAktif.nik, atoken:anggotaAktif.atoken, nominal, keperluan:ket, tglButuh:butuh, tglBayar:bayar, ttd:png, setuju:true});
    if(r.ok){ sukses = true; pesan = '✅ Permintaan terkirim ke Pimpinan. No. registrasi: ' + r.id; }
    else pesan = '❌ ' + r.msg;
  }catch(e){ pesan = 'Gagal terhubung ke server. Coba lagi.'; }
  ttdTutup(null);
  alert(pesan);
  if(sukses){ $('tlnNominal').value = ''; $('tlnKet').value = ''; $('tlnTglBayar').value = ''; }
  await tlnMuat();
}
async function tlnBatal(id){
  if(!await dialogKonfirmasi('Batalkan permintaan ' + id + '?')) return;
  try{ const r = await apiPost({a:'tln_batal', nik:anggotaAktif.nik, atoken:anggotaAktif.atoken, id}); alert((r.ok ? '✅ ' : '❌ ') + r.msg); await tlnMuat(); }
  catch(e){ alert('Gagal terhubung ke server. Coba lagi.'); }
}

function tlnBudgetTampil(){ // sisa dana talangan (cadangan) + peringatan bila nominal melebihi
  const r = tlnData; if(!r || !r.cadangan) return;
  const n = moneyVal('tlnNominal'), c = r.cadangan, lebih = n > c.sisa;
  $('tlnBudget').innerHTML = `<div class="ok" style="margin:8px 0;display:flex;justify-content:space-between;gap:8px"><span>Dana talangan tersedia<br><span class="small">dari cadangan ${rpf(c.penuh)} • terpakai ${rpf(c.pakai)}</span></span><b style="font-size:18px">${rpf(c.sisa)}</b></div>` +
    (n > 0 && lebih ? `<div class="warn" style="margin:0 0 8px">Nominal ${rpf(n)} melebihi dana talangan tersedia (${rpf(c.sisa)}). Permintaan tetap dapat diajukan, tetapi keputusan ada pada Pimpinan.</div>` : '');
}
