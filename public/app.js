(async function () {
  'use strict';

  const GAMES_JSON_PATH = '/api/games';

  let cachedGames = null;

  async function fetchGames() {
    if (cachedGames) return cachedGames;
    const response = await fetch(GAMES_JSON_PATH, { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`Failed to load games (${response.status})`);
    }
    cachedGames = await response.json();
    return cachedGames;
  }

  function getThumbnailSrc(game) {
    return game.thumbnailUrl || game.thumbnail;
  }

  function getPlayUrl(game) {
    return game.playUrl || `games/${game.folder}/index.html`;
  }

  function debounce(fn, delay) {
    let timer;
    return function () {
      const args = arguments;
      const ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
    };
  }

  // ── Index page (gallery) ──────────────────────────────────────────

  function createGameCard(game) {
    const card = document.createElement('a');
    card.href = `game.html?id=${encodeURIComponent(game.id)}`;
    card.className = 'game-card';
    card.dataset.title = game.title.toLowerCase();

    const thumb = document.createElement('img');
    thumb.src = getThumbnailSrc(game);
    thumb.alt = game.title;
    thumb.className = 'game-card__thumbnail';

    const body = document.createElement('div');
    body.className = 'game-card__body';

    const title = document.createElement('h3');
    title.className = 'game-card__title';
    title.textContent = game.title;

    const desc = document.createElement('p');
    desc.className = 'game-card__description';
    desc.textContent = game.description;

    const author = document.createElement('a');
    author.className = 'game-card__author';
    author.textContent = game.author;
    author.href = 'portfolio.html?name=' + encodeURIComponent(game.author);
    author.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    var plays = document.createElement('span');
    plays.className = 'game-card__plays';
    plays.textContent = (game.plays || 0) + ' plays';

    body.appendChild(title);
    body.appendChild(desc);
    body.appendChild(author);
    body.appendChild(plays);
    card.appendChild(thumb);
    card.appendChild(body);

    return card;
  }

  async function initGallery() {
    const container = document.getElementById('game-container');
    const grid = container.querySelector('.gallery-grid');
    const searchInput = document.getElementById('search-input');

    let games = [];

    try {
      games = await fetchGames();
      const fragment = document.createDocumentFragment();
      games.forEach(function (game) {
        fragment.appendChild(createGameCard(game));
      });
      grid.appendChild(fragment);
    } catch (err) {
      container.textContent = '';
      const errMsg = document.createElement('p');
      errMsg.className = 'error-message';
      errMsg.textContent = 'Failed to load games. Please try again later.';
      container.appendChild(errMsg);
      return;
    }

    searchInput.addEventListener('input', debounce(function () {
      const query = searchInput.value.toLowerCase();
      const cards = grid.querySelectorAll('.game-card');

      cards.forEach(function (card) {
        const title = card.dataset.title || '';
        card.style.display = title.includes(query) ? '' : 'none';
      });
    }, 200));
  }

  // ── Game page (player) ────────────────────────────────────────────

  async function initPlayer() {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get('id');
    const player = document.querySelector('.game-player');

    if (!gameId) {
      showPlayerError(player, 'No game specified.');
      return;
    }

    let games;
    try {
      games = await fetchGames();
    } catch (err) {
      showPlayerError(player, 'Failed to load game data.');
      return;
    }

    const game = games.find(function (g) { return g.id === gameId; });

    if (!game) {
      showPlayerError(player, 'Game not found.');
      return;
    }

    // Set iframe source
    const iframe = player.querySelector('.game-player__iframe');
    iframe.src = getPlayUrl(game);

    // Populate game info
    player.querySelector('.game-player__title').textContent = game.title;
    player.querySelector('.game-player__description').textContent = game.description;
    player.querySelector('.game-player__author').textContent = game.author;

    // Update page title
    document.title = `${game.title} - Game Showcase`;

    // Fullscreen toggle
    const fullscreenBtn = player.querySelector('.game-player__fullscreen-btn');
    fullscreenBtn.addEventListener('click', function () {
      player.classList.toggle('fullscreen');

      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        player.requestFullscreen().catch(function () {
          // Fullscreen API not supported or denied — class toggle still works
        });
      }
    });
  }

  function showPlayerError(player, message) {
    const info = player.querySelector('.game-player__info');
    info.textContent = '';
    const p = document.createElement('p');
    p.className = 'error-message';
    p.textContent = message;
    info.appendChild(p);
    player.querySelector('.game-player__wrapper').style.display = 'none';
    player.querySelector('.game-player__fullscreen-btn').style.display = 'none';
  }

  // ── Command Palette (cmdk) ───────────────────────────────────────

  function initCommandPalette() {
    const overlay = document.getElementById('cmdk-overlay');
    const input = document.getElementById('cmdk-input');
    const list = document.getElementById('cmdk-list');
    const dialog = overlay ? overlay.querySelector('.cmdk') : null;
    if (!overlay || !input || !list) return;

    let games = [];
    let activeIndex = 0;
    let filteredItems = [];
    let loadError = false;
    let previouslyFocused = null;

    fetchGames()
      .then(function (data) { games = data; })
      .catch(function () { loadError = true; });

    function open() {
      previouslyFocused = document.activeElement;
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
      input.value = '';
      activeIndex = 0;

      if (loadError) {
        list.textContent = '';
        const errEl = document.createElement('div');
        errEl.className = 'cmdk__empty';
        errEl.textContent = 'Failed to load games.';
        list.appendChild(errEl);
      } else {
        render(games);
      }

      setTimeout(function () { input.focus(); }, 50);
    }

    function close() {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      input.value = '';
      if (previouslyFocused) {
        previouslyFocused.focus();
        previouslyFocused = null;
      }
    }

    // Focus trap: keep Tab within the dialog
    if (dialog) {
      dialog.addEventListener('keydown', function (e) {
        if (e.key !== 'Tab') return;
        const focusable = dialog.querySelectorAll(
          'input, a[href], button, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      });
    }

    function render(items) {
      filteredItems = items;
      list.textContent = '';

      if (items.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'cmdk__empty';
        empty.textContent = 'No games found.';
        list.appendChild(empty);
        return;
      }

      const label = document.createElement('div');
      label.className = 'cmdk__group-label';
      label.textContent = 'Games';
      list.appendChild(label);

      items.forEach(function (game, i) {
        const item = document.createElement('a');
        item.href = 'game.html?id=' + encodeURIComponent(game.id);
        item.className = 'cmdk__item' + (i === activeIndex ? ' active' : '');
        item.dataset.index = i;

        const icon = document.createElement('img');
        icon.src = getThumbnailSrc(game);
        icon.alt = '';
        icon.className = 'cmdk__item-icon';

        const textWrap = document.createElement('div');
        textWrap.className = 'cmdk__item-text';

        const titleEl = document.createElement('div');
        titleEl.className = 'cmdk__item-title';
        titleEl.textContent = game.title;

        const descEl = document.createElement('div');
        descEl.className = 'cmdk__item-desc';
        descEl.textContent = game.description;

        textWrap.appendChild(titleEl);
        textWrap.appendChild(descEl);
        item.appendChild(icon);
        item.appendChild(textWrap);
        list.appendChild(item);
      });
    }

    function setActive(index) {
      if (filteredItems.length === 0) return;
      activeIndex = (index + filteredItems.length) % filteredItems.length;
      const items = list.querySelectorAll('.cmdk__item');
      items.forEach(function (el, i) {
        el.classList.toggle('active', i === activeIndex);
        if (i === activeIndex) el.scrollIntoView({ block: 'nearest' });
      });
    }

    // Keyboard shortcut: Ctrl+K / Cmd+K
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (overlay.classList.contains('open')) { close(); } else { open(); }
      }
      if (e.key === 'Escape' && overlay.classList.contains('open')) {
        e.preventDefault();
        close();
      }
    });

    // Close on overlay click
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    // Search filtering
    input.addEventListener('input', function () {
      const q = input.value.toLowerCase();
      const filtered = games.filter(function (g) {
        return g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q);
      });
      activeIndex = 0;
      render(filtered);
    });

    // Arrow key navigation + Enter
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(activeIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(activeIndex - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const items = list.querySelectorAll('.cmdk__item');
        if (items[activeIndex]) items[activeIndex].click();
      }
    });

    // Hover to highlight
    list.addEventListener('mouseover', function (e) {
      const item = e.target.closest('.cmdk__item');
      if (item) setActive(parseInt(item.dataset.index, 10));
    });

    // Initial aria state
    overlay.setAttribute('aria-hidden', 'true');
  }

  // ── Bootstrap ─────────────────────────────────────────────────────

  const isGamePage = document.querySelector('.game-player') !== null;

  if (isGamePage) {
    initPlayer();
  } else {
    initGallery();
  }

  initCommandPalette();
})();
