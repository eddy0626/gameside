(function () {
  'use strict';

  const STORAGE_KEY = 'recentPlays';
  const MAX_RECENT = 10;

  function getRecent() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }

  function addRecent(gameId) {
    let recent = getRecent().filter(id => id !== gameId);
    recent.unshift(gameId);
    if (recent.length > MAX_RECENT) recent = recent.slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
  }

  document.addEventListener('DOMContentLoaded', async function () {
    // game.html: 플레이 기록 저장
    const player = document.querySelector('.game-player');
    if (player) {
      const params = new URLSearchParams(window.location.search);
      const gameId = params.get('id');
      if (gameId) addRecent(gameId);
      return;
    }

    // index.html: 최근 플레이 섹션 렌더링
    const recent = getRecent();
    if (recent.length === 0) return;

    const response = await fetch('/api/games', { credentials: 'include' });
    const games = await response.json();

    const recentGames = recent
      .map(id => games.find(g => g.id === id))
      .filter(Boolean);

    if (recentGames.length === 0) return;

    // #recent-plays-container에 카드 렌더링
    const container = document.getElementById('recent-plays-container');
    if (!container) return;

    const title = document.createElement('h2');
    title.className = 'recent-plays__title';
    title.textContent = 'Recently Played';

    const scroll = document.createElement('div');
    scroll.className = 'recent-plays__scroll';

    recentGames.forEach(game => {
      const card = document.createElement('a');
      card.href = 'game.html?id=' + encodeURIComponent(game.id);
      card.className = 'recent-plays__card';

      const img = document.createElement('img');
      img.src = game.thumbnail;
      img.alt = game.title;
      img.className = 'recent-plays__thumb';

      const name = document.createElement('span');
      name.className = 'recent-plays__name';
      name.textContent = game.title;

      card.appendChild(img);
      card.appendChild(name);
      scroll.appendChild(card);
    });

    container.appendChild(title);
    container.appendChild(scroll);
  });
})();
