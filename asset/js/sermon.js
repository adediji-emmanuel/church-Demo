 /*********************************************************************
   CONFIG: Edit these values below
  *********************************************************************/
  const JSONBIN_BIN_ID = '693c476fd0ea881f4024c700';
  const JSONBIN_MASTER_KEY = '$2a$10$qtoZhFMZ4JANryBb2s7LpOrnC2KpW0MIGpSvWVJxp1t7ta94N9SSO';


  const DATA_FILE = 'admin-data.json'; // admin file in same folder
  const YOUTUBE_API_KEY = 'AIzaSyDGRj-Xlw8sx4P18J5zFhX-ktQBsSYjJzo'; // OPTIONAL: put your YouTube Data API v3 key here (to auto-fetch thumbs & viewer counts). Leave blank to use thumb fields from JSON.
  const IFTTT_KEY = ''; // OPTIONAL: put your IFTTT Maker Webhooks key here if you want reminders to actually trigger.
  const IFTTT_EVENT = 'rlcc_reminder'; // default event name used in IFTTT instructions below

  /*********************************************************************
   Small helpers & DOM shortcuts
  *********************************************************************/
  function ytThumb(id){
  if(!id) return '';
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

  const $ = (s, root=document)=> root.querySelector(s);
  const $$ = (s, root=document)=> Array.from(root.querySelectorAll(s));
  function formatDate(d){ return new Date(d).toLocaleDateString(); }
  function makeQR(url,size=160){ return `<img src="https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(url)}" style="width:100%;height:100%;object-fit:contain;border-radius:6px">`; }

  /*********************************************************************
   APP STATE
  *********************************************************************/
  let APP = { data: null, ytPlayer: null, currentVideoId: null, viewerInterval: null, sermonModal:null, shareModal:null };

  /*********************************************************************
   LOAD admin-data.json and initialize UI
  *********************************************************************/
 /*********************************************************************
   LOAD DATA FROM JSONBIN (NO OTHER LOGIC CHANGED)
*********************************************************************/
async function loadAdminData(){
  try{
    const r = await fetch(
      `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`,
      {
        headers: {
          'X-Master-Key': JSONBIN_MASTER_KEY
        }
      }
    );

    if(!r.ok) throw new Error('JSONBin fetch failed');

    const res = await r.json();
    const json = res.record;

    if(!json) throw new Error('Empty JSONBin record');

    APP.data = json;

    /* ---------------- SITE ---------------- */
    $('#site-title').textContent =
      json.site?.title || 'RLCC — Sermons';

    $('#site-sub').textContent =
      json.site?.subtitle || 'Message';

    if(json.site?.logo)
      $('#brand-logo').src = json.site.logo;

    /* ---------------- PINNED ---------------- */
    if(json.pinned && json.pinned.youtubeId){

      $('#pinnedTitle').textContent = json.pinned.title || '';
      $('#pinnedMeta').textContent =
        (json.pinned.preacher || '') + ' • ' +
        formatDate(json.pinned.date || new Date().toISOString());

      $('#pinnedDesc').textContent = json.pinned.desc || '';

      // ✅ FIX: thumbnail fallback
      const pinnedThumb =
  json.pinned.thumb || ytThumb(json.pinned.youtubeId);

      // $('#pinnedThumb').style.backgroundImage =
      //   `url('${pinnedThumb}')`;
      $('#pinnedThumb').src = pinnedThumb;


      $('#pinnedWatch').onclick = () =>
        loadPlayerById(json.pinned.youtubeId);
    }

    /* ---------------- CLIPS ---------------- */
    populateClips(json.clips || []);

    /* ---------------- SERMONS ---------------- */
    const SERMON_LIMIT = 6;

    const sermons = (json.sermons || []).map(s => ({
      ...s,
      // ✅ FIX: ensure thumbnail always exists
      thumb: s.thumb || ytThumb(s.youtubeId)

    }));

    populateGrid(sermons.slice(0, SERMON_LIMIT));

    /* ---------------- PLAYER INIT ---------------- */
    APP.currentVideoId =
  json.pinned?.youtubeId ||
  sermons[0]?.youtubeId ||
  null;


    /* ---------------- SHARE ---------------- */
    $('#shareQRPreview').innerHTML =
      makeQR(window.location.href, 160);

  }catch(e){
    console.error('JSONBin load error:', e);

    // ✅ FIX: only alert if NOTHING loaded
    if(!APP.data){
      alert('Could not load sermons from JSONBin.');
    }
  }
}



  /*********************************************************************
   Populate clips & sermons (reads JSON arrays)
  *********************************************************************/
  function populateClips(clips){
    const row = $('#clipsRow'); row.innerHTML = '';
    clips.forEach(c=>{
      const el = document.createElement('div');
      el.className = 'clip';
      const clipThumb =
  c.thumb || `https://img.youtube.com/vi/${c.youtubeId}/hqdefault.jpg`;

const thumbHtml = `
  <div style="height:120px;border-radius:8px;
              background:url('${clipThumb}') center/cover">
  </div>
`;

      el.innerHTML = `${thumbHtml}<div style="margin-top:8px;font-weight:600">${c.title}</div><div class="muted small">${c.youtubeId || ''}</div>`;
      el.addEventListener('click', ()=> openSermonModal({ title:c.title, preacher:'Clip', date:new Date().toISOString(), desc:'Clip', youtubeId:c.youtubeId }));
      row.appendChild(el);
    });
  }

  function populateGrid(sermons){
    const grid = $('#sermonGrid'); grid.innerHTML = '';
    sermons.forEach(s=>{
      const card = document.createElement('div');
      card.className = 'sermon-card';
      const thumbHtml = s.thumb ? `<img src="${s.thumb}" style="width:100%;height:140px;object-fit:cover">` : `<div style="height:140px;background:#111;display:flex;align-items:center;justify-content:center">${s.title}</div>`;
      card.innerHTML = `
  ${thumbHtml}
  <div style="padding:10px;">
    <div style="font-weight:700">${s.title}</div>
    <div class="muted small">${s.preacher} • ${formatDate(s.date)}</div>
  </div>
`;

      card.addEventListener('click', ()=> openSermonModal(s));
      grid.appendChild(card);

      // if YOUTUBE_API_KEY is provided and thumb missing, fetch thumbnail
      if(YOUTUBE_API_KEY && s.youtubeId && (!s.thumb || s.thumb.length === 0)){
        fetchYouTubeSnippet(s.youtubeId).then(info=>{
          if(info && info.thumb){
            const img = document.createElement('img');
            img.src = info.thumb; img.style.width='100%'; img.style.height='140px'; img.style.objectFit='cover';
            const existing = card.querySelector('img');
            if(existing) existing.remove();
            card.insertBefore(img, card.firstChild);
          }
        });
      }
    });
  }

  /*********************************************************************
   Sermon modal
  *********************************************************************/
  function openSermonModal(s){
    $('#sermonModalTitle').textContent = s.title;
    $('#sermonMeta').textContent = (s.preacher || '') + ' • ' + formatDate(s.date || new Date().toISOString());
    $('#sermonDesc').textContent = s.desc || '';
    $('#modalPlayerWrap').innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${s.youtubeId}?rel=0" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    APP.sermonModal.show();
    $('#modalWatchBtn').onclick = ()=> { loadPlayerById(s.youtubeId); APP.sermonModal.hide(); };
  }

  /*********************************************************************
   YouTube IFrame API main player
  *********************************************************************/
  
// function onYouTubeIframeAPIReady(){

//   /* ----------------------------------------------------
//      👉 PUT YOUR LIVE VIDEO ID HERE
//      Example:
//      APP.currentVideoId = "YOUR_LIVE_VIDEO_ID_HERE";
//   ------------------------------------------------------ */
//   // APP.currentVideoId = "YOUR_LIVE_ID";

//   APP.ytPlayer = new YT.Player('yt-player', {
//     height:'100%',
//     width:'100%',
//     videoId: APP.currentVideoId || 'TyvVm-CWh0k',
//     playerVars: { autoplay:0, controls:0, rel:0, modestbranding:1, playsinline:1 },
//     events: { onReady:onPlayerReady, onStateChange:onPlayerStateChange }
//   });
// }

function onPlayerReady(){
  const vol = parseInt($('#volRange').value,10);
  try{ APP.ytPlayer.setVolume(vol); }catch(e){}
  updatePlayUI(false);
  updateViewerLoop();
}
function onPlayerStateChange(e){ updatePlayUI(e.data === YT.PlayerState.PLAYING); }
function updatePlayUI(isPlaying){
  $('#playPauseText').textContent = isPlaying ? 'Pause' : 'Play';
  $('#playPauseBtn i').className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
}

function loadPlayerById(id){
  APP.currentVideoId = id;

  // ✅ ADD THIS LINE (THIS IS THE FIX)
 const img = document.getElementById('pinnedThumb');
if(img) img.src = ytThumb(id);


  if(APP.ytPlayer && typeof APP.ytPlayer.loadVideoById === 'function'){
    APP.ytPlayer.loadVideoById({videoId:id});
    try{ APP.ytPlayer.playVideo(); }catch(e){}
  }
  else document.getElementById('yt-player').innerHTML =
    `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${id}?autoplay=1&rel=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;

  updateViewerLoop();
}


function updateViewerLoop(){
  if(!APP.currentVideoId) return;
  if(APP.viewerInterval) clearInterval(APP.viewerInterval);

  // initial
  if(YOUTUBE_API_KEY)
    fetchViewerCount(APP.currentVideoId).then(v=>
      $('#viewerCount').textContent = v ? v.toLocaleString() + ' viewers' : 'Live'
    );

  APP.viewerInterval = setInterval(async ()=>{
    if(YOUTUBE_API_KEY){
      const v = await fetchViewerCount(APP.currentVideoId);
      $('#viewerCount').textContent = v ? v.toLocaleString() + ' viewers' : 'Live';
    }
  }, 20000);
}


  /*********************************************************************
   Player controls
  *********************************************************************/
  function initPlayerControls(){
    $('#playPauseBtn').addEventListener('click', ()=> {
      if(!APP.ytPlayer) return;
      const st = APP.ytPlayer.getPlayerState();
      if(st === YT.PlayerState.PLAYING) APP.ytPlayer.pauseVideo(); else APP.ytPlayer.playVideo();
    });
    $('#muteBtn').addEventListener('click', ()=> {
      if(!APP.ytPlayer) return;
      if(APP.ytPlayer.isMuted()) { APP.ytPlayer.unMute(); $('#muteBtn i').className='fas fa-volume-up'; } else { APP.ytPlayer.mute(); $('#muteBtn i').className='fas fa-volume-mute'; }
    });
    $('#volRange').addEventListener('input', e=> { const v = parseInt(e.target.value,10); if(APP.ytPlayer && APP.ytPlayer.setVolume) APP.ytPlayer.setVolume(v); });
    $('#openInYT').addEventListener('click', ()=> { if(APP.currentVideoId) window.open('https://youtube.com/watch?v='+APP.currentVideoId,'_blank'); });
    $('#theaterBtn').addEventListener('click', ()=> { const panel = $('#playerPanel'); panel.classList.toggle('theater'); if(panel.classList.contains('theater')){ panel.style.position='fixed'; panel.style.left='6px'; panel.style.right='6px'; panel.style.top='72px'; panel.style.zIndex=2000; } else { panel.style.position=''; panel.style.left=''; panel.style.right=''; panel.style.top=''; panel.style.zIndex=''; } });
  }

  /*********************************************************************
   Filters & Search (responsive)
  *********************************************************************/
  let activeFilter = 'all';
  function initFilters(){
    $$('#filterChips .chip').forEach(chip=> chip.addEventListener('click', ()=>{
      $$('#filterChips .chip').forEach(c=>c.classList.remove('active'));
      chip.classList.add('active'); activeFilter = chip.getAttribute('data-filter'); applyFilters();
    }));
    $('#searchBox').addEventListener('input', applyFilters);
    $('#searchClear').addEventListener('click', ()=> { $('#searchBox').value=''; applyFilters(); });
  }
  function applyFilters(){
    if(!APP.data) return;
    const q = $('#searchBox').value.trim().toLowerCase();
    let items = APP.data.sermons.slice();
    if(activeFilter && activeFilter !== 'all') items = items.filter(s=> s.category === activeFilter);
    if(q) items = items.filter(s => (s.title||'').toLowerCase().includes(q) || (s.preacher||'').toLowerCase().includes(q) || (s.desc||'').toLowerCase().includes(q));
    populateGrid(items);
  }

  /*********************************************************************
   Countdown + Reminders (IFTTT)
  *********************************************************************/
  function initCountdown(){
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, 7,0,0);
    $('#nextTime').textContent = next.toLocaleString();
    function tick(){ const diff = next - new Date(); if(diff<=0){ $('#countdown').textContent = 'LIVE'; clearInterval(cnt); return; } const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000), s = Math.floor((diff%60000)/1000); $('#countdown').textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
    tick(); const cnt = setInterval(tick,1000);

    $('#setReminderBtn').addEventListener('click', async ()=>{
      if(!IFTTT_KEY) { alert('Reminder demo: configure IFTTT key in the code to enable real reminders.'); return; }
      try{
        await fetch(`https://maker.ifttt.com/trigger/${IFTTT_EVENT}/with/key/${IFTTT_KEY}`, { method:'POST', body: JSON.stringify({value1: 'RLCC Next Stream Reminder'}) });
        alert('Reminder sent via IFTTT!');
      }catch(e){ alert('Could not send reminder. Check IFTTT key.'); }
    });

    $('#reminderBtn').addEventListener('click', ()=> { if(!IFTTT_KEY) alert('Reminder demo: configure IFTTT key to enable reminders.'); else alert('Click Set Reminder button to send the webhook.'); });
  }

  /*********************************************************************
   Theme toggle (cycles few themes)
  *********************************************************************/
  const THEMES = ['dark','light','blue','green','grey'];
  let themeIndex = 0;
  function applyTheme(name){
    switch(name){
      case 'light': document.documentElement.style.setProperty('--bg','#fcfcfdff'); document.body.style.background='#aaaaadff'; document.body.style.color='#111'; break;
      case 'blue': document.documentElement.style.setProperty('--bg','#ff27f4ff'); document.body.style.background='linear-gradient(180deg, #a10199ff 0%, #ff27f4ff 100%)'; document.body.style.color='#111'; document.documentElement.style.setProperty('--accent','#4aa3ff'); break;
      case 'green': document.documentElement.style.setProperty('--bg','#2fd5ffff'); document.body.style.background='linear-gradient(180deg, #008db1ff 0%, #2fd5ffff 100%)'; document.body.style.color='#111'; document.documentElement.style.setProperty('--accent','#4AE66E'); break;
      case 'grey': document.documentElement.style.setProperty('--bg','#ff5f20ff'); document.body.style.background='linear-gradient(180deg, #b93500ff 0%, #ff5f20ff 100%)'; document.body.style.color='#111'; document.documentElement.style.setProperty('--accent','#bdbdbd'); break;
      default: document.documentElement.style.setProperty('--bg','#061018'); document.body.style.background='linear-gradient(180deg,#061018 0%, #0b0b0b 100%)'; document.body.style.color='#fff'; document.documentElement.style.setProperty('--accent','#4AE66E');
    }
    localStorage.setItem('rlcc_theme', name);
  }
  function initTheme(){ const saved = localStorage.getItem('rlcc_theme') || 'dark'; themeIndex = THEMES.indexOf(saved) >= 0 ? THEMES.indexOf(saved) : 0; applyTheme(THEMES[themeIndex]); $('#themeToggle').addEventListener('click', ()=> { themeIndex = (themeIndex+1) % THEMES.length; applyTheme(THEMES[themeIndex]); }); }

  /*********************************************************************
   Prayer input behavior: when + pressed, show an input box in the right panel
  *********************************************************************/
  function initPrayerBehavior(){
    const inputWrap = $('#prayerInputWrap');
    const openBtns = [$('#openPrayer'), $('#openPrayerBtn')];
    openBtns.forEach(b => b && b.addEventListener('click', ()=> { inputWrap.classList.toggle('show'); $('#prayerInput').focus(); }));
    $('#prayerCancel').addEventListener('click', ()=> { inputWrap.classList.remove('show'); $('#prayerInput').value=''; });
    $('#prayerSend').addEventListener('click', ()=> {
      const text = $('#prayerInput').value.trim();
      if(!text) return alert('Please type a request');
      const list = JSON.parse(localStorage.getItem('rlcc_prayers')||'[]');
      list.unshift({ text, date: Date.now(), anon:false });
      localStorage.setItem('rlcc_prayers', JSON.stringify(list));
      $('#prayerInput').value=''; inputWrap.classList.remove('show');
      $('#prayerBox').innerHTML = `<div style="text-align:left">${text}</div>`;
      alert('Prayer sent. The church team will pray with you.');
    });
  }

  /*********************************************************************
   Share behavior
  *********************************************************************/
  function initShare(){
    APP.shareModal = new bootstrap.Modal($('#shareModal'));
    $('#openShareBtn').addEventListener('click', ()=> APP.shareModal.show());
    $('#shareCopy').addEventListener('click', async ()=> { try{ await navigator.clipboard.writeText($('#shareInput').value); alert('Copied'); }catch(e){ alert('Copy not supported'); } });
    $('#shareWhatsapp').addEventListener('click', ()=> window.open('https://wa.me/?text='+encodeURIComponent($('#shareInput').value + ' — Watch sermons'), '_blank'));
    $('#shareTwitter').addEventListener('click', ()=> window.open('https://twitter.com/intent/tweet?url='+encodeURIComponent($('#shareInput').value), '_blank'));
  }

  /*********************************************************************
   Load more -> all-sermons.html
  *********************************************************************/
  function initLoadMore(){ $('#loadMore').addEventListener('click', ()=> window.location.href='all-sermons.html'); }

  /*********************************************************************
   misc: reveal on scroll and init
  *********************************************************************/
  function initReveal(){ const reveals = $$('.reveal'); const obs = new IntersectionObserver(entries=> entries.forEach(e=> e.isIntersecting && e.target.classList.add('show')), {threshold:0.08}); reveals.forEach(r=> obs.observe(r)); }

  /*********************************************************************
   Init all
  *********************************************************************/
  document.addEventListener('DOMContentLoaded', async ()=>{
    APP.sermonModal = new bootstrap.Modal($('#sermonModal'));
    await loadAdminData();
    initPlayerControls();
    initFilters();
    initCountdown();
    initTheme();
    initPrayerBehavior();
    initShare();
    initLoadMore();
    initReveal();
    // wire up modals
    $('#sermonModal').addEventListener('hidden.bs.modal', ()=> { $('#modalPlayerWrap').innerHTML = ''; });

    // mobile bottom nav
    $('#mb-prayer').addEventListener('click', ()=> { $('#prayerInputWrap').classList.add('show'); $('#prayerInput').focus(); });
    $('#mb-sermons').addEventListener('click', ()=> window.scrollTo({ top: document.querySelector('.center-col').offsetTop - 80, behavior:'smooth' }) );

    // init player: only create YouTube player when API ready (global)
    // APP.currentVideoId is set while loading admin-data.json earlier
    // If YouTube API script loads later, it will call onYouTubeIframeAPIReady
  });

  // Expose functions required by YouTube API
  function onYouTubeIframeAPIReady(){
     if(!APP.currentVideoId) APP.currentVideoId = (APP.data && ((APP.data.pinned && APP.data.pinned.youtubeId) || (APP.data.sermons && APP.data.sermons[0] && APP.data.sermons[0].youtubeId))) || ''; APP.ytPlayer = new YT.Player('yt-player', { height:'100%', width:'100%', videoId: APP.currentVideoId || '', playerVars:{autoplay:0,controls:0,rel:0,modestbranding:1,playsinline:1}, events:{ onReady:onPlayerReady, onStateChange:onPlayerStateChange } }); }

  // Expose loadPlayerById globally
  window.loadPlayerById = (id)=> loadPlayerById(id);





  // Animate pinned video thumbnail when changing
function animatePinnedThumb(id){
  const img = document.getElementById('pinnedThumb');
  if(!img) return;
  img.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
  img.style.transform = 'scale(0.95)';
  img.style.opacity = '0.6';
  setTimeout(()=>{
    img.src = ytThumb(id);
    img.style.transform = 'scale(1)';
    img.style.opacity = '1';
  }, 200);
}

// Call this inside loadPlayerById
loadPlayerById = (id) => {
  animatePinnedThumb(id);
  // existing logic...
};



// Bottom nav clicks
document.querySelectorAll('.mobile-bottom-nav .nav-item').forEach(item => {
  item.addEventListener('click', e => {
    const target = item.dataset.target;
    if(target === 'prayer') {
      document.getElementById('prayerInputWrap').classList.add('show');
      document.getElementById('prayerInput').focus();
    } else if(target === 'sermons') {
      document.querySelector('.center-col').scrollIntoView({behavior: 'smooth', block: 'start'});
    }
  });
});



