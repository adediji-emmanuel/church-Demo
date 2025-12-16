/*********************************************************************
  CONFIG: JSONBin
*********************************************************************/
const JSONBIN_BIN_ID = '693c476fd0ea881f4024c700';
const JSONBIN_MASTER_KEY = '$2a$10$qtoZhFMZ4JANryBb2s7LpOrnC2KpW0MIGpSvWVJxp1t7ta94N9SSO';

/*********************************************************************
  Load data from JSONBin
*********************************************************************/
async function loadAdmin(){
  try{
    const r = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
    });
    if(!r.ok) throw new Error('JSONBin fetch failed');
    const res = await r.json();
    const j = res.record;
    if(!j) throw new Error('Empty JSONBin record');
    return j;
  }catch(e){ 
    alert('Could not load sermons from JSONBin'); 
    console.error(e);
    return null; 
  }
}

/*********************************************************************
  Render all sermons
*********************************************************************/
function renderAll(sermons){
  const list = document.getElementById('allList'); 
  list.innerHTML='';
  sermons.forEach(s=>{
    const el = document.createElement('div'); 
    el.className='card';
    
    const thumb = s.thumb 
      ? `<img src="${s.thumb}" style="width:100%;height:140px;object-fit:cover;border-radius:6px">` 
      : `<div style="height:140px;background:#111;border-radius:6px;display:flex;align-items:center;justify-content:center">${s.title}</div>`;
    
    el.innerHTML = `
      ${thumb}
      <div style="font-weight:700">${s.title}</div>
      <div class="muted">${s.preacher} • ${new Date(s.date).toLocaleDateString()}</div>
    `;
    el.addEventListener('click', ()=> openDetail(s));
    list.appendChild(el);
  });
}

/*********************************************************************
  Open sermon detail modal
*********************************************************************/
function openDetail(s){
  document.getElementById('detailTitle').textContent = s.title;
  document.getElementById('detailDesc').textContent = s.desc || '';
  document.getElementById('detailPlayer').innerHTML = `
    <iframe width="100%" height="100%" 
      src="https://www.youtube.com/embed/${s.youtubeId}?rel=0" 
      frameborder="0" allow="autoplay; encrypted-media" allowfullscreen>
    </iframe>`;
  new bootstrap.Modal(document.getElementById('detailModal')).show();
}

/*********************************************************************
  Initialize
*********************************************************************/
(async ()=>{
  const data = await loadAdmin();
  if(!data) return;

  // ensure thumbnails exist like in sermon.js
  const sermons = (data.sermons || []).map(s=>({
    ...s,
    thumb: s.thumb || `https://img.youtube.com/vi/${s.youtubeId}/hqdefault.jpg`
  }));

  renderAll(sermons);

  // Search/filter
  document.getElementById('filterInput').addEventListener('input', (e)=>{
    const q = e.target.value.trim().toLowerCase();
    renderAll(sermons.filter(s=> 
      s.title.toLowerCase().includes(q) || s.preacher.toLowerCase().includes(q)
    ));
  });
})();
