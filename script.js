(() => {
  'use strict';
  document.documentElement.classList.add('js-ready');
  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const PAGE_FILES = new Set(['index.html', 'overworld.html', 'nether.html', 'end.html', 'numbers.html']);

  function storageGet(key, fallback = null) {
    try { const value = localStorage.getItem(key); return value === null ? fallback : value; }
    catch { return fallback; }
  }
  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch { /* storage may be disabled */ }
  }
  function storageReadJSON(key, fallback = {}) {
    try { return JSON.parse(storageGet(key, JSON.stringify(fallback))) || fallback; }
    catch { return fallback; }
  }
  function storageWriteJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage may be disabled */ }
  }

  // Theme switcher remains mounted while page content changes.
  const savedTheme = storageGet('ow2end-theme');
  if (savedTheme === 'light' || savedTheme === 'dark') root.dataset.theme = savedTheme;
  else root.dataset.theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';

  const themeButton = $('[data-theme-toggle]');
  function paintThemeButton() {
    if (!themeButton) return;
    const light = root.dataset.theme === 'light';
    themeButton.textContent = light ? '☾' : '☀';
    themeButton.setAttribute('aria-pressed', String(light));
    themeButton.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
  }
  paintThemeButton();

  // Shared toast.
  let toastTimeout;
  let toast = $('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 2100);
  }

  themeButton?.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    storageSet('ow2end-theme', root.dataset.theme);
    paintThemeButton();
    showToast(`${root.dataset.theme.toUpperCase()} MODE ACTIVATED`);
  });

  // Responsive navigation.
  const menuButton = $('[data-menu-toggle]');
  const nav = $('.site-nav');
  menuButton?.addEventListener('click', () => {
    const open = nav?.classList.toggle('is-open') ?? false;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.textContent = open ? '×' : '☰';
  });

  // Scroll progress.
  const scrollBar = $('#scroll-progress');
  const updateScroll = () => {
    if (!scrollBar) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const percent = max > 0 ? (window.scrollY / max) * 100 : 0;
    scrollBar.style.width = `${Math.min(100, percent)}%`;
  };
  window.addEventListener('scroll', updateScroll, { passive: true });

  // Scroll reveal; re-used after in-page navigation swaps content.
  let revealObserver = null;
  if ('IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
  }
  function setupReveals(scope = document) {
    const elements = $$('.reveal', scope);
    if (revealObserver) elements.forEach(el => revealObserver.observe(el));
    else elements.forEach(el => el.classList.add('is-visible'));
  }

  // Pixel particles for the hero and mine button.
  function burst(x, y, target = document.body, amount = 10) {
    for (let i = 0; i < amount; i++) {
      const particle = document.createElement('span');
      particle.className = 'particles';
      const dx = Math.round((Math.random() - .5) * 150);
      const dy = Math.round((Math.random() - .6) * 125);
      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      particle.style.setProperty('--dx', `${dx}px`);
      particle.style.setProperty('--dy', `${dy}px`);
      particle.style.background = ['var(--green)', 'var(--orange)', 'var(--purple)', 'var(--blue)'][i % 4];
      target.appendChild(particle);
      particle.addEventListener('animationend', () => particle.remove(), { once: true });
    }
  }

  // Persistent counter, checklist restoration, and checklist meters.
  let blocksMined = Number(storageGet('ow2end-mined', '0')) || 0;
  function paintMinedCount(scope = document) {
    $$('[data-mined-count]', scope).forEach(el => el.textContent = String(blocksMined));
  }
  function listInputs(listName, scope = document) {
    const all = $$('input[type="checkbox"][data-save-list]', scope);
    if (listName === 'all-pack') return all.filter(input => input.dataset.saveList.startsWith('pack-'));
    return all.filter(input => input.dataset.saveList === listName);
  }
  function updateChecklistMeters(listName, scope = document) {
    const inputs = listInputs(listName, scope);
    const checked = inputs.filter(input => input.checked).length;
    $$('[data-checklist-meter]', scope).filter(el => el.dataset.checklistMeter === listName)
      .forEach(el => el.textContent = `${checked} / ${inputs.length}${listName.startsWith('pack-') ? ' checked' : ' complete'}`);
    $$('[data-checklist-progress]', scope).filter(el => el.dataset.checklistProgress === listName)
      .forEach(el => el.style.width = `${inputs.length ? checked / inputs.length * 100 : 0}%`);
  }
  function restoreChecklistState(scope = document) {
    const inputs = $$('input[type="checkbox"][data-save-list]', scope);
    inputs.forEach(input => {
      const state = storageReadJSON(`ow2end-check-${input.dataset.saveList}`, {});
      input.checked = Boolean(state[input.value || input.id]);
    });
    const listNames = [...new Set(inputs.map(input => input.dataset.saveList))];
    listNames.forEach(name => updateChecklistMeters(name, scope));
    updateChecklistMeters('all-pack', scope);
  }

  // Event delegation means page controls also work after navigation without reloading the site.
  const main = $('main#main') || $('main');
  if (main) {
    main.addEventListener('click', event => {
      const linkInBurst = event.target.closest('[data-burst-area]');
      if (linkInBurst && !event.target.closest('a')) {
        const rect = linkInBurst.getBoundingClientRect();
        burst(event.clientX - rect.left, event.clientY - rect.top, linkInBurst, 9);
      }

      const mineButton = event.target.closest('[data-mine]');
      if (mineButton) {
        blocksMined += 1;
        storageSet('ow2end-mined', String(blocksMined));
        paintMinedCount(document);
        const rect = mineButton.getBoundingClientRect();
        burst(event.clientX ? event.clientX - rect.left : rect.width / 2,
              event.clientY ? event.clientY - rect.top : rect.height / 2,
              mineButton, 12);
        showToast(`BLOCK MINED! TOTAL: ${blocksMined}`);
      }

      const nextTipButton = event.target.closest('[data-next-tip]');
      if (nextTipButton) {
        tipIndex = (tipIndex + 1 + tips.length) % tips.length;
        const output = $('[data-tip-output]', main);
        if (output) {
          output.animate?.([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220, easing: 'ease-out' });
          output.textContent = tips[tipIndex];
        }
      }

      const resetButton = event.target.closest('[data-reset-list]');
      if (resetButton) {
        const name = resetButton.dataset.resetList;
        try { localStorage.removeItem(`ow2end-check-${name}`); } catch {}
        listInputs(name, main).forEach(input => { input.checked = false; });
        updateChecklistMeters(name, main);
        updateChecklistMeters('all-pack', main);
        showToast('CHECKLIST RESET');
      }

      const resetAll = event.target.closest('[data-reset-all-pack]');
      if (resetAll) {
        const inputs = $$('input[type="checkbox"][data-save-list^="pack-"]', main);
        const names = [...new Set(inputs.map(input => input.dataset.saveList))];
        names.forEach(name => { try { localStorage.removeItem(`ow2end-check-${name}`); } catch {} });
        inputs.forEach(input => { input.checked = false; });
        names.forEach(name => updateChecklistMeters(name, main));
        updateChecklistMeters('all-pack', main);
        showToast('ALL PACK ITEMS RESET');
      }
    });

    main.addEventListener('change', event => {
      const input = event.target;
      if (!input.matches('input[type="checkbox"][data-save-list]')) return;
      const name = input.dataset.saveList;
      const key = input.value || input.id;
      const state = storageReadJSON(`ow2end-check-${name}`, {});
      state[key] = input.checked;
      storageWriteJSON(`ow2end-check-${name}`, state);
      updateChecklistMeters(name, main);
      updateChecklistMeters('all-pack', main);
    });
  }

  const tips = [
    'Never dig straight down. You do not know what is below your feet.',
    'Bring extra food before exploring caves or travelling through the Nether.',
    'Mark your route with torches or blocks so you can find your way home.',
    'A shield can help you survive skeleton arrows and other dangerous encounters.',
    'Keep spare blocks on your hotbar for bridges, cover, and quick escapes.',
    'Write down your base coordinates before going far from home.',
    'Carry a water bucket in the Overworld, but remember water evaporates in the Nether.',
    'Before entering the End, bring a bow, arrows, food, blocks, and a safe plan.'
  ];
  let tipIndex = 0;

  // ==============================================
  // Pixel music player. music.mp3 is the user asset
  // placeholder. Once playing, SPA navigation below
  // swaps only <main>, leaving this audio element alive.
  // ==============================================
  const audio = $('#siteMusic');
  const musicBar = $('#musicBar');
  const playButton = $('#musicPlayPause');
  const collapseButton = $('#musicCollapse');
  const progressSlider = $('#musicProgress');
  const volumeSlider = $('#musicVolume');
  const currentTimeLabel = $('#musicCurrentTime');
  const durationLabel = $('#musicDuration');
  const volumePercent = $('#musicVolumePercent');
  const musicStatus = $('#musicStatus');
  const musicStateKey = 'ow2end-music-v1';
  const savedMusic = storageReadJSON(musicStateKey, {});
  let seekingMusic = false;
  let restoredTime = false;

  function musicWrite(patch) {
    const latest = storageReadJSON(musicStateKey, {});
    storageWriteJSON(musicStateKey, Object.assign(latest, patch));
  }
  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }
  function paintMusicButton() {
    if (!audio || !playButton) return;
    const playing = !audio.paused && !audio.ended;
    playButton.textContent = playing ? 'Ⅱ' : '▶';
    playButton.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
    playButton.title = playing ? 'Pause music' : 'Play music';
    musicBar?.classList.toggle('playing', playing);
    if (playing && musicStatus) musicStatus.textContent = 'NOW PLAYING · MUSIC.MP3';
    else if (audio.error && musicStatus) musicStatus.textContent = 'ADD music.mp3 TO THE WEBSITE FOLDER';
    else if (!playing && musicStatus && musicStatus.dataset.userStatus !== 'true') musicStatus.textContent = 'READY WHEN YOU ARE';
  }
  function saveMusicState() {
    if (!audio || !musicBar) return;
    musicWrite({ time: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
      playing: !audio.paused, volume: audio.volume,
      collapsed: musicBar.classList.contains('is-collapsed') });
  }
  async function startMusic() {
    if (!audio) return;
    try {
      await audio.play();
      paintMusicButton();
    } catch (error) {
      if (musicStatus) {
        musicStatus.textContent = audio.error ? 'ADD music.mp3 TO ENABLE MUSIC' : 'CLICK PLAY AGAIN TO START';
        musicStatus.dataset.userStatus = 'true';
      }
      paintMusicButton();
    }
  }
  if (audio && musicBar) {
    audio.loop = true;
    audio.volume = typeof savedMusic.volume === 'number' ? Math.max(0, Math.min(1, savedMusic.volume)) : 0.45;
    if (volumeSlider) volumeSlider.value = String(audio.volume);
    if (volumePercent) volumePercent.textContent = `${Math.round(audio.volume * 100)}%`;
    if (savedMusic.collapsed) musicBar.classList.add('is-collapsed');
    if (collapseButton) collapseButton.setAttribute('aria-expanded', String(!musicBar.classList.contains('is-collapsed')));

    audio.addEventListener('loadedmetadata', () => {
      if (durationLabel) durationLabel.textContent = formatTime(audio.duration);
      if (progressSlider) progressSlider.max = String(Number.isFinite(audio.duration) ? audio.duration : 0);
      if (!restoredTime) {
        const oldTime = Number(savedMusic.time) || 0;
        if (oldTime > 0 && Number.isFinite(audio.duration) && oldTime < audio.duration) {
          try { audio.currentTime = oldTime; } catch {}
        }
        restoredTime = true;
        if (savedMusic.playing) startMusic();
      }
    });
    audio.addEventListener('timeupdate', () => {
      if (currentTimeLabel) currentTimeLabel.textContent = formatTime(audio.currentTime);
      if (progressSlider && !seekingMusic) progressSlider.value = String(audio.currentTime || 0);
      musicWrite({ time: Number.isFinite(audio.currentTime) ? audio.currentTime : 0 });
    });
    audio.addEventListener('durationchange', () => {
      if (durationLabel) durationLabel.textContent = formatTime(audio.duration);
      if (progressSlider) progressSlider.max = String(Number.isFinite(audio.duration) ? audio.duration : 0);
    });
    audio.addEventListener('play', () => { musicStatus && (musicStatus.dataset.userStatus = 'false'); paintMusicButton(); saveMusicState(); });
    audio.addEventListener('pause', () => { paintMusicButton(); saveMusicState(); });
    audio.addEventListener('volumechange', () => {
      if (volumeSlider) volumeSlider.value = String(audio.volume);
      if (volumePercent) volumePercent.textContent = `${Math.round(audio.volume * 100)}%`;
      musicWrite({ volume: audio.volume });
    });
    audio.addEventListener('error', () => {
      if (musicStatus) {
        musicStatus.textContent = 'PLACE YOUR AUDIO FILE AS music.mp3';
        musicStatus.dataset.userStatus = 'true';
      }
      paintMusicButton();
    });
    playButton?.addEventListener('click', () => {
      if (audio.paused) startMusic();
      else audio.pause();
    });
    collapseButton?.addEventListener('click', () => {
      const collapsed = musicBar.classList.toggle('is-collapsed');
      collapseButton.textContent = collapsed ? '+' : '−';
      collapseButton.setAttribute('aria-expanded', String(!collapsed));
      collapseButton.setAttribute('aria-label', collapsed ? 'Expand music player' : 'Collapse music player');
      collapseButton.title = collapsed ? 'Expand player' : 'Collapse player';
      musicWrite({ collapsed });
    });
    volumeSlider?.addEventListener('input', () => {
      audio.volume = Math.max(0, Math.min(1, Number(volumeSlider.value)));
      if (volumePercent) volumePercent.textContent = `${Math.round(audio.volume * 100)}%`;
      musicWrite({ volume: audio.volume });
    });
    progressSlider?.addEventListener('input', () => {
      seekingMusic = true;
      if (currentTimeLabel) currentTimeLabel.textContent = formatTime(Number(progressSlider.value));
    });
    progressSlider?.addEventListener('change', () => {
      if (Number.isFinite(audio.duration)) audio.currentTime = Math.max(0, Math.min(audio.duration, Number(progressSlider.value)));
      seekingMusic = false;
      saveMusicState();
    });
    window.addEventListener('pagehide', saveMusicState);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveMusicState(); });
    paintMusicButton();
  }

  // Initialize interactive content on the current document.
  function initializeMainContent() {
    const currentMain = $('main#main') || $('main');
    if (!currentMain) return;
    restoreChecklistState(currentMain);
    paintMinedCount(currentMain);
    setupReveals(currentMain);
    updateScroll();
  }
  initializeMainContent();

  // ==============================================
  // Seamless in-site navigation. Instead of loading a
  // whole new document, only main content is swapped.
  // The player/audio element remains alive and keeps
  // playing between the five pages. This requires HTTP(S)
  // (GitHub Pages, hosting, or a local development server).
  // ==============================================
  const mainContainer = $('main#main') || $('main');
  let navigationBusy = false;
  async function navigateTo(urlLike, options = {}) {
    const target = new URL(urlLike, location.href);
    const pageName = target.pathname.split('/').filter(Boolean).pop() || 'index.html';
    if (!PAGE_FILES.has(pageName)) { location.href = target.href; return; }
    if (target.origin !== location.origin || location.protocol === 'file:') { location.href = target.href; return; }
    if (navigationBusy) return;
    navigationBusy = true;
    try {
      const response = await fetch(target.href, { headers: { 'X-Requested-With': 'OverworldToEnd' } });
      if (!response.ok) throw new Error(`Page request failed: ${response.status}`);
      const html = await response.text();
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const nextMain = parsed.querySelector('main#main') || parsed.querySelector('main');
      const activeMain = $('main#main') || $('main');
      if (!nextMain || !activeMain) throw new Error('The page has no main content');

      if (revealObserver) $$('.reveal', activeMain).forEach(el => revealObserver.unobserve(el));
      activeMain.innerHTML = nextMain.innerHTML;
      document.title = parsed.title || 'Overworld to End';
      $$('.site-nav a').forEach(link => {
        const linkName = new URL(link.href, location.href).pathname.split('/').filter(Boolean).pop() || 'index.html';
        if (linkName === pageName) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
      nav?.classList.remove('is-open');
      if (menuButton) { menuButton.setAttribute('aria-expanded', 'false'); menuButton.textContent = '☰'; }

      if (options.push !== false) history.pushState({ ow2end: true }, '', `${target.pathname}${target.search}${target.hash}`);
      activeMain.classList.remove('page-entering');
      void activeMain.offsetWidth;
      activeMain.classList.add('page-entering');
      initializeMainContent();

      requestAnimationFrame(() => {
        if (target.hash) {
          const id = decodeURIComponent(target.hash.slice(1));
          const destination = document.getElementById(id);
          if (destination) destination.scrollIntoView({ behavior: 'smooth', block: 'start' });
          else window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (options.scroll !== false) {
          window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
        }
        updateScroll();
      });
    } catch (error) {
      console.warn('Seamless navigation failed; loading the page normally.', error);
      location.href = target.href;
    } finally {
      navigationBusy = false;
    }
  }

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest('a[href]');
    if (!anchor || anchor.hasAttribute('download') || anchor.target && anchor.target !== '_self') return;
    const target = new URL(anchor.href, location.href);
    if (target.origin !== location.origin) return;
    const pageName = target.pathname.split('/').filter(Boolean).pop() || 'index.html';
    if (!PAGE_FILES.has(pageName)) return;
    if (location.protocol === 'file:') return; // fetch is restricted on file://; normal navigation still works.
    if (target.pathname === location.pathname && target.search === location.search) return; // same-page hash links scroll natively.
    event.preventDefault();
    navigateTo(target.href);
  });

  window.addEventListener('popstate', () => navigateTo(location.href, { push: false }));
})();
