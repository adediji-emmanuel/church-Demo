 class RadioPlayer {
    constructor(container, config) {
        this.container = container;
        this.config = config;
        this.audio = new Audio();
        this.isPlaying = false;
        this.currentVolume = 1;
        this.elapsed = 0;
        this.metadata = null;
        this.lastFetchTime = 0;
        this.fetchInProgress = false;

        this.init();
    }

    init() {
        this.audio.src = this.config.streamUrl;
        this.audio.preload = 'none';

        this.setupElements();
        this.attachEventListeners();
        this.startMetadataPolling();
        this.startTimeTracking();
    }

    setupElements() {
        this.artworkImage = this.container.querySelector('.artwork-image');
        this.artworkPlaceholder = this.container.querySelector('.artwork-placeholder');
        this.songNameDiv = this.container.querySelector('.song-name');
        this.artistNameDiv = this.container.querySelector('.artist-name');
        this.radioNameDiv = this.container.querySelector('.radio-name');
        if (this.radioNameDiv) {
            this.radioNameDiv.style.fontWeight = '600';
        }
        this.liveContainer = this.container.querySelector('.live-container');
        this.playButton = this.container.querySelector('.play-button');
        this.volumeButton = this.container.querySelector('.volume-button');
        this.volumeSlider = this.container.querySelector('.volume-slider');
        this.timeBarProgress = this.container.querySelector('.time-bar-progress');
        this.elapsedTimeSpan = this.container.querySelector('.elapsed-time');
        this.durationTimeSpan = this.container.querySelector('.duration-time');
        this.historyModal = document.querySelector('.history-modal');
        this.historyList = document.querySelector('.history-list');

        // Initialize volume state
        if (this.volumeSlider) {
            this.volumeSlider.value = 100;
            this.isMuted = false;
            this.preMuteVolume = 1;
        }

        // Apply border color if specified
        if (this.config.borderColor) {
            this.container.style.borderColor = this.config.borderColor;
        }

        if (this.volumeButton && this.volumeSlider) {
            this.setupVolumeControls();
        }

        if (this.historyModal) {
            this.attachHistoryEventListeners();
        }
    }

    setupVolumeControls() {
        const volumeContainer = this.container.querySelector('.volume-bar-container');
        let hideTimeout;

        const showVolume = () => {
            clearTimeout(hideTimeout);
            volumeContainer.classList.add('show');
        };

        const hideVolume = () => {
            hideTimeout = setTimeout(() => {
                volumeContainer.classList.remove('show');
            }, 200);
        };

        // Hover events
        this.volumeButton.addEventListener('mouseenter', showVolume);
        this.volumeButton.addEventListener('mouseleave', hideVolume);
        volumeContainer.addEventListener('mouseenter', showVolume);
        volumeContainer.addEventListener('mouseleave', hideVolume);

        // Click events
        this.volumeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMute();
        });

        this.volumeSlider.addEventListener('input', (e) => {
            const value = e.target.value / 100;
            this.setVolume(value);
            if (value > 0 && this.isMuted) {
                this.isMuted = false;
            }
        });

        // Close volume bar when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.volume-bar-container') && 
                !e.target.closest('.volume-button')) {
                volumeContainer.classList.remove('show');
            }
        });
    }

    attachEventListeners() {
        this.audio.addEventListener('play', () => this.updatePlayState());
        this.audio.addEventListener('pause', () => this.updatePlayState());
        this.audio.addEventListener('volumechange', () => this.updateVolumeState());

        if (this.playButton) {
            this.playButton.addEventListener('click', () => this.togglePlay());
        }
    }

    startMetadataPolling() {
        this.fetchMetadata();
        setInterval(() => this.fetchMetadata(), 10000);
    }

    startTimeTracking() {
        this.elapsedInterval = setInterval(() => {
            this.elapsed++;
            this.updateTimeDisplay();
        }, 1000);
    }

    async fetchMetadata() {
        if (this.fetchInProgress || Date.now() - this.lastFetchTime < 2000) return;
        this.fetchInProgress = true;

        try {
            const response = await fetch(this.config.apiUrl);
            const data = await response.json();
            this.metadata = data;
            this.updateMetadata(data);
            this.lastFetchTime = Date.now();
        } catch (error) {
            console.error('Error fetching metadata:', error);
        } finally {
            this.fetchInProgress = false;
        }
    }

    async togglePlay() {
        try {
            if (this.isPlaying) {
                this.audio.pause();
            } else {
                await this.audio.play();
            }
            this.isPlaying = !this.isPlaying;
            this.updatePlayState();
        } catch (error) {
            console.error('Error toggling play state:', error);
        }
    }

    updatePlayState() {
        if (this.playButton) {
            if ('icons' === 'text') {
                this.playButton.textContent = this.isPlaying ? 'Pause' : 'Play';
            } else {
                this.playButton.innerHTML = `<i class="fas fa-${this.isPlaying ? 'pause' : 'play'}"></i>`;
            }
        }
    }

    setVolume(value) {
        this.audio.volume = value;
        this.currentVolume = value;
        this.isMuted = value === 0;
        this.updateVolumeState();
    }

    toggleMute() {
        if (this.audio.volume > 0) {
            this.preMuteVolume = this.audio.volume;
            this.setVolume(0);
        } else {
            this.setVolume(this.preMuteVolume);
        }
    }

    updateVolumeState() {
        if (this.volumeButton && this.volumeSlider) {
            const volume = this.audio.volume;
            this.volumeSlider.value = volume * 100;
            
            let icon = 'volume-up';
            if (volume === 0) icon = 'volume-mute';
            else if (volume < 0.33) icon = 'volume-off';
            else if (volume < 0.66) icon = 'volume-down';

            if ('icons' === 'text') {
                this.volumeButton.textContent = volume === 0 ? 'Unmute' : 'Mute';
            } else {
                this.volumeButton.innerHTML = `<i class="fas fa-${icon}"></i>`;
            }
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    updateTimeDisplay() {
        if (this.timeBarProgress && this.metadata?.now_playing) {
            const duration = this.metadata.now_playing.duration || 0;
            const progress = duration > 0 ? (this.elapsed / duration) * 100 : 0;
            this.timeBarProgress.style.width = `${Math.min(progress, 100)}%`;
        }
        
        if (this.elapsedTimeSpan) {
            this.elapsedTimeSpan.textContent = this.formatTime(this.elapsed);
        }
        if (this.durationTimeSpan && this.metadata?.now_playing) {
            this.durationTimeSpan.textContent = this.formatTime(this.metadata.now_playing.duration || 0);
        }
    }

    updateMetadata(data) {
        const nowPlaying = data.now_playing;
        if (!nowPlaying) return;

        // Reset elapsed time when new song starts
        this.elapsed = Math.max(0, data.now_playing.elapsed || 0);

        // Update artwork
        if (this.artworkImage && nowPlaying.song.art) {
            this.artworkImage.src = nowPlaying.song.art;
            this.artworkImage.style.display = 'block';
            this.artworkPlaceholder.style.display = 'none';
        } else if (this.artworkImage) {
            this.artworkImage.style.display = 'none';
            this.artworkPlaceholder.style.display = 'flex';
        }

        // Update song info
        if (this.songNameDiv) {
            this.songNameDiv.textContent = nowPlaying.song.title || '';
        }
        if (this.artistNameDiv) {
            this.artistNameDiv.textContent = nowPlaying.song.artist || '';
        }

        // Update radio name
        if (this.radioNameDiv && data.station?.name) {
            this.radioNameDiv.textContent = data.station.name;
        }

        // Update live status
        if (this.liveContainer) {
            const isLive = data.live?.is_live || false;
            this.liveContainer.style.display = isLive ? 'flex' : 'none';
            const liveText = this.liveContainer.querySelector('.live-text');
            if (liveText && isLive) {
                liveText.textContent = data.live?.streamer_name || 'LIVE';
            }
        }

        // Update history list if modal is open
        if (this.historyModal && this.historyModal.style.display === 'block') {
            this.updateHistoryList();
        }
    }

    cleanup() {
        if (this.elapsedInterval) {
            clearInterval(this.elapsedInterval);
            this.elapsedInterval = null;
        }
        if (this.metadataInterval) {
            clearInterval(this.metadataInterval);
            this.metadataInterval = null;
        }
        if (this.audio) {
            this.audio.pause();
            this.audio.src = '';
            this.isPlaying = false;
            this.currentVolume = 1;
            this.elapsed = 0;
            this.metadata = null;
            this.lastFetchTime = 0;
            this.fetchInProgress = false;
        }
        if (this.historyModal) {
            this.hideHistoryModal();
        }
    }

    attachHistoryEventListeners() {
        const historyButton = this.container.querySelector('.history-button');
        const historyModalClose = document.querySelector('.history-modal-close');
        const historyModalOverlay = document.querySelector('.history-modal-overlay');

        if (historyButton && this.historyModal) {
            historyButton.addEventListener('click', () => this.showHistoryModal());
            historyModalClose.addEventListener('click', () => this.hideHistoryModal());
            historyModalOverlay.addEventListener('click', () => this.hideHistoryModal());
        }
    }

    showHistoryModal() {
        if (this.historyModal && this.metadata?.song_history) {
            this.updateHistoryList();
            this.historyModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    hideHistoryModal() {
        if (this.historyModal) {
            this.historyModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    updateHistoryList() {
        if (!this.historyList || !this.metadata?.song_history) return;

        this.historyList.innerHTML = this.metadata.song_history.map(item => `
            <div class="history-item">
                <div class="history-artwork">
                    <img src="${item.song.art}" alt="${item.song.title}" />
                </div>
                <div class="history-song-info">
                    <div class="history-song-title">${item.song.title}</div>
                    <div class="history-artist-name">${item.song.artist}</div>
                </div>
            </div>
        `).join('');
    }
}

// Initialize the player
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('radio-player');
    const config = {
        streamUrl: 'https://s125.radiolize.com:8040/radio.mp3',
        apiUrl: 'https://s125.radiolize.com/api/nowplaying/6',
        borderColor: 'transparent'
    };
    window.radioPlayer = new RadioPlayer(container, config);
});

// Cleanup on page unload
window.addEventListener('unload', () => {
    if (window.radioPlayer) {
        window.radioPlayer.cleanup();
    }
});


    //  ADDITIONAL ENHANCEMENT SCRIPT
    //  (features added WITHOUT modifying original code)
    


  (function(){
    // Small helper
    const $ = (s,root=document)=> root.querySelector(s);
    const $$ = (s,root=document)=> Array.from(root.querySelectorAll(s));

    // Wait until original RadioPlayer exists
    function whenPlayerReady(cb){
      if (window.radioPlayer && window.radioPlayer.audio) return cb();
      const unbind = () => {};
      document.addEventListener('DOMContentLoaded', () => {
        // Slight delay to ensure radioPlayer created
        setTimeout(()=> cb(), 250);
      });
    }

    whenPlayerReady(() => {
      const rp = window.radioPlayer;
      // ====== Feature 1: Auto-resume play state (persist across page loads) ======
      try {
        const saved = localStorage.getItem('rlcc_radio_playing');
        if (saved === 'true') {
          // attempt autoplay
          rp.audio.autoplay = true;
          // try to play (some browsers require user gesture)
          rp.audio.play().then(()=> {
            rp.isPlaying = true;
            rp.updatePlayState();
          }).catch(()=> {
            // do nothing
          });
        }
      } catch(e){}

      // When user toggles play, persist
      const originalToggle = rp.togglePlay.bind(rp);
      rp.togglePlay = async function(){
        await originalToggle();
        localStorage.setItem('rlcc_radio_playing', this.isPlaying ? 'true' : 'false');
        updateMiniAndNow();
        animateVisualizer(this.isPlaying);
      };

      // When metadata updates, update UI spots outside the widget
      const originalUpdateMetadata = rp.updateMetadata.bind(rp);
      rp.updateMetadata = function(data){
        originalUpdateMetadata(data);
        try {
          updateNowPlayingPanels(data);
        } catch(e){ console.error(e); }
      };

      // Update time display also drives program progress UI
      const originalUpdateTime = rp.updateTimeDisplay.bind(rp);
      rp.updateTimeDisplay = function(){
        originalUpdateTime();
        syncProgramProgress();
      };

      // ====== UI elements references ======
      const mini = $('#mini-player');
      const miniArt = $('#mini-art');
      const miniTitle = $('#mini-title');
      const miniSub = $('#mini-sub');
      const miniPlay = $('#mini-play');
      const shareModal = $('#share-modal');
      const shareCopy = $('#share-copy');
      const shareClose = $('#share-close');
      const shareLink = $('#share-link');
      const qrArea = $('#qr-area');
      const openSchedule = $('#open-schedule');
      const scheduleSheet = $('#schedule-sheet');
      const scheduleClose = $('#schedule-close');
      const openScheduleSheet = $('#open-schedule-sheet');
      const sleepBtn = $('#sleep-btn');
      const themeBtn = $('#theme-toggle');
      const lowDataBtn = $('#low-data-toggle');
      const listenerCount = $('#listener-count');
      const sidebarTitle = $('#sidebar-now-title');
      const sidebarArtist = $('#sidebar-now-artist');
      const sidebarArt = $('#sidebar-now-art');
      const sidebarLogo = $('#sidebar-logo');
      const topLogo = $('#top-logo');

      // Put same logo in top and sidebar if metadata contains art
      function updateNowPlayingPanels(data){
        const now = data.now_playing || {};
        const song = now.song || {};
        const art = song.art || '';
        const title = song.title || 'RLCC Live';
        const artist = song.artist || '';
        sidebarTitle.textContent = title;
        sidebarArtist.textContent = artist;
        $('#main-title').textContent = (data.station && data.station.name) ? data.station.name : 'RLCC Live';
        $('#main-sub').textContent = artist || 'Praise & Worship';

        // update small art placeholders
        if (art) {
          sidebarArt.style.backgroundImage = `url('${art}')`;
          sidebarArt.style.backgroundSize = 'cover';
          sidebarArt.style.backgroundPosition = 'center';
          topLogo.src = art;
          sidebarLogo.src = art;
          $('#mini-art').style.backgroundImage = `url('${art}')`;
          $('#mini-art').style.backgroundSize = 'cover';
        } else {
          topLogo.src = '';
          sidebarLogo.src = '';
          $('#mini-art').style.backgroundImage = '';
          sidebarArt.style.background = '#ffffff10';
        }

        // listener count (if API provided)
        try {
          const listeners = data.listeners || (data.stats && data.stats.listeners) || 0;
          listenerCount.textContent = listeners;
        } catch(e){}

        // Update history modal list if open
        // (original RadioPlayer handles this)
      }

      // update mini player fields
      function updateMiniAndNow(){
        const song = rp.metadata && rp.metadata.now_playing && rp.metadata.now_playing.song;
        if (song) {
          miniTitle.textContent = song.title || 'RLCC Live';
          miniSub.textContent = song.artist || '';
          if (song.art) {
            miniArt.style.backgroundImage = `url('${song.art}')`;
            miniArt.style.backgroundSize = 'cover';
            miniArt.style.backgroundPosition = 'center';
          } else {
            miniArt.style.backgroundImage = '';
          }
        }
      }

      // show mini player when user scrolls away from main area
      let showMini = false;
      function handleScroll(){
        const rect = document.getElementById('radio-player').getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) {
          // out of view
          if (!mini.classList.contains('show')) mini.classList.add('show');
        } else {
          if (mini.classList.contains('show')) mini.classList.remove('show');
        }
      }
      window.addEventListener('scroll', handleScroll, {passive:true});
      handleScroll(); // initial

      // mini-play toggle (mirrors main play button)
      miniPlay.addEventListener('click', async () => {
        await rp.togglePlay();
        syncMiniIcon();
      });

      function syncMiniIcon() {
        const icon = miniPlay.querySelector('i');
        if (rp.isPlaying) icon.className = 'fas fa-pause';
        else icon.className = 'fas fa-play';
      }

      // copy share link
      shareCopy.addEventListener('click', async ()=>{
        try {
          await navigator.clipboard.writeText(shareLink.value);
          shareCopy.textContent = 'Copied';
          setTimeout(()=> shareCopy.textContent = 'Copy', 1200);
        } catch(e){
          alert('Copy not supported');
        }
      });
      shareClose.addEventListener('click', ()=> hideModal(shareModal));
      $('#share-btn').addEventListener('click', ()=> showModal(shareModal));
      $('#open-on-phone').addEventListener('click', ()=> {
        alert('Open this link on your phone or scan the QR shown.');
      });

      function showModal(el){
        el.classList.add('show');
        el.setAttribute('aria-hidden', 'false');
      }
      function hideModal(el){
        el.classList.remove('show');
        el.setAttribute('aria-hidden', 'true');
      }

      // schedule bottom sheet
      $('#open-schedule').addEventListener('click', ()=> scheduleSheet.classList.toggle('open'));
      openScheduleSheet.addEventListener('click', ()=> scheduleSheet.classList.add('open'));
      $$('.sheet-item').forEach(item=>{
        item.addEventListener('click', ()=>{
          const t = item.getAttribute('data-start');
          alert('Reminder set for ' + item.textContent + ' at ' + t);
        });
      });
      
      $("#open-schedule").onclick = ()=> {
  $("#schedule-sheet").classList.add("open");
};
$("#schedule-close").onclick = ()=> {
  $("#schedule-sheet").classList.remove("open");
};

      // sleep timer: cycles through 10, 30, 60, off
      let sleepState = 0;
      let sleepTimeout = null;
      const sleepValues = [10,30,60,0];
      sleepBtn.addEventListener('click', ()=>{
        sleepState = (sleepState + 1) % sleepValues.length;
        if (sleepTimeout) { clearTimeout(sleepTimeout); sleepTimeout = null; }
        const minutes = sleepValues[sleepState];
        if (minutes > 0) {
          sleepTimeout = setTimeout(()=> { if (rp.isPlaying) rp.togglePlay(); alert('Sleep timer ended — playback stopped.'); }, minutes*60*1000);
          sleepBtn.textContent = 'Sleep ' + minutes + 'm';
        } else {
          sleepBtn.textContent = 'Sleep';
        }
      });

      // low-data toggle: swap to a low bitrate stream URL (we attempt)
      let lowData = false;
      const originalStream = rp.config.streamUrl;
      const lowStream = originalStream.replace('.mp3','_low.mp3'); // naive; fallback handled
      lowDataBtn.addEventListener('click', async ()=>{
        lowData = !lowData;
        lowDataBtn.setAttribute('aria-pressed', lowData ? 'true' : 'false');
        try {
          rp.audio.pause();
          rp.audio.src = lowData ? lowStream : originalStream;
          await rp.audio.load();
          if (localStorage.getItem('rlcc_radio_playing') === 'true') {
            await rp.audio.play();
            rp.isPlaying = true;
            rp.updatePlayState();
          }
        } catch(e){
          console.warn('low-data swap failed', e);
          lowData = false;
          lowDataBtn.setAttribute('aria-pressed','false');
        }
      });

      // theme toggle (dark / light)
      let light = false;
      themeBtn.addEventListener('click', ()=>{
        light = !light;
        if (light) {
          document.documentElement.style.setProperty('--bg','#f6f7fb');
          document.body.style.background = 'linear-gradient(180deg,#dad2d2ff 0%, #fff 100%)';
          document.body.style.color = '#0b0b0b';
        } else {
          document.documentElement.style.setProperty('--bg','#0b0b0b');
          document.body.style.background = 'linear-gradient(180deg,#061018 0%, #0b0b0b 100%)';
          document.body.style.color = '#fff';
        }
      });

      // favorite / follow quick local actions
      $('#fav-btn').addEventListener('click', ()=>{
        const s = (localStorage.getItem('rlcc_fav') === 'true');
        localStorage.setItem('rlcc_fav', (!s).toString());
        alert(!s ? 'Added to favorites' : 'Removed from favorites');
      });
      $('#follow-btn').addEventListener('click', ()=>{
        const s = (localStorage.getItem('rlcc_follow') === 'true');
        localStorage.setItem('rlcc_follow',(!s).toString());
        alert(!s ? 'You are now following this channel' : 'Unfollowed');
      });

      // share quick social buttons
      $('#share-twitter').addEventListener('click', ()=>{
        const url = encodeURIComponent(shareLink.value);
        window.open('https://twitter.com/intent/tweet?url='+url,'_blank');
      });
      $('#share-whatsapp').addEventListener('click', ()=>{
        const url = encodeURIComponent(shareLink.value + ' — Listen now!');
        window.open('https://wa.me/?text='+url,'_blank');
      });

      // open prayer modal
      $('#open-prayer').addEventListener('click', ()=> showModal($('#prayer-modal')));
      $('#prayer-close').addEventListener('click', ()=> hideModal($('#prayer-modal')));
      $('#send-prayer').addEventListener('click', ()=>{
        const text = $('#prayer-text').value.trim();
        if (!text) return alert('Please write a request');
        // store locally (admin area would sync on a real site)
        const existing = JSON.parse(localStorage.getItem('rlcc_prayers')||'[]');
        existing.unshift({ text, date: Date.now(), anon:false});
        localStorage.setItem('rlcc_prayers', JSON.stringify(existing));
        $('#prayer-text').value = '';
        hideModal($('#prayer-modal'));
        $('#prayer-box').innerHTML = `<div style="text-align:left">${text}</div>`;
        alert('Prayer sent. The church team will pray with you.');
      });

      // Copy + QR generation (uses Google Chart API as a quick QR)
      function updateQRCode() {
        const link = shareLink.value;
        const qrsrc = 'https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=' + encodeURIComponent(link);
        qrArea.innerHTML = `<img src="${qrsrc}" alt="qr" style="width:100%;height:100%;object-fit:contain;border-radius:4px">`;
      }
      updateQRCode();

      // sync UI with player state every second
      function syncUI(){
        try {
          updateMiniAndNow();
          syncMiniIcon();
          // set play icon of main button
          const playBtn = document.querySelector('.play-button i');
          if (playBtn) playBtn.className = rp.isPlaying ? 'fas fa-pause' : 'fas fa-play';

          // update progress bar
          if (rp.metadata && rp.metadata.now_playing) {
            const duration = rp.metadata.now_playing.duration || 0;
            const prog = duration > 0 ? (rp.elapsed / duration) * 100 : 0;
            $('#prog-bar').style.width = Math.min(prog,100) + '%';
            $('#prog-elapsed').textContent = rp.formatTime(rp.elapsed);
            $('#prog-duration').textContent = rp.formatTime(duration);
            // small main progress also
            rp.updateTimeDisplay();
          }
        } catch(e){}
      }
      setInterval(syncUI, 900);

      // keyboard shortcuts (desktop)
      window.addEventListener('keydown', (e)=>{
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.code === 'Space') {
          e.preventDefault();
          rp.togglePlay();
        } else if (e.key === 'ArrowUp') {
          const v = Math.min(1, rp.audio.volume + 0.05);
          rp.setVolume(v);
        } else if (e.key === 'ArrowDown') {
          const v = Math.max(0, rp.audio.volume - 0.05);
          rp.setVolume(v);
        }
      });

      // animate visualizer when playing (pure css toggling)
      function animateVisualizer(play){
        const bars = $$('#visualizer .bar');
        bars.forEach(b => b.style.animationPlayState = play ? 'running' : 'paused');
      }

      // sync program progress
      function syncProgramProgress(){
        if (rp.metadata && rp.metadata.now_playing){
          const d = rp.metadata.now_playing.duration || 0;
          if (d > 0){
            const p = Math.min(100, (rp.elapsed/d)*100);
            $('#prog-bar').style.width = p + '%';
          }
        }
      }

      // Attempt to fetch listener count more often and update metadata
      setInterval(()=>{
        if (!rp.config || !rp.config.apiUrl) return;
        fetch(rp.config.apiUrl).then(r=>r.json()).then(data=>{
          if (data) {
            rp.metadata = data;
            updateNowPlayingPanels(data);
            // update history if modal open
            if (rp.historyModal && rp.historyModal.style.display === 'block') rp.updateHistoryList();
          }
        }).catch(()=>{});
      }, 15000);

      // On first load populate a few UI spots
      updateMiniAndNow();
      updateNowPlayingPanels(rp.metadata || {});
      animateVisualizer(rp.isPlaying);
      syncMiniIcon();

      // small accessibility: if clicking outside modal close it
      document.addEventListener('click', (e)=>{
        if (e.target === shareModal) hideModal(shareModal);
        if (e.target === $('#prayer-modal')) hideModal($('#prayer-modal'));
      });

      // expose small API for external use
      window.RLCC_UI = {
        showSchedule: ()=> scheduleSheet.classList.add('open'),
        hideSchedule: ()=> scheduleSheet.classList.remove('open'),
        openShare: ()=> showModal(shareModal),
      };

    }); // end whenPlayerReady

  })();