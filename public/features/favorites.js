(function () {
  'use strict';

  const STORAGE_KEY = 'favorites';

  function getFavorites() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }

  function saveFavorites(favs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
  }

  function toggleFavorite(gameId) {
    let favs = getFavorites();
    if (favs.includes(gameId)) {
      favs = favs.filter(function (id) { return id !== gameId; });
    } else {
      favs.push(gameId);
    }
    saveFavorites(favs);
    return favs.includes(gameId);
  }

  function getGameIdFromCard(card) {
    // card.href = "game.html?id=xxx"
    const url = new URL(card.href, window.location.origin);
    return url.searchParams.get('id');
  }

  document.addEventListener('DOMContentLoaded', function () {
    // MutationObserver to detect dynamically added cards
    const container = document.getElementById('game-container');
    if (!container) return;

    let favs = getFavorites();

    function addHeartToCard(card) {
      if (card.querySelector('.favorite-btn')) return; // already has heart

      const gameId = getGameIdFromCard(card);
      if (!gameId) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'favorite-btn' + (favs.includes(gameId) ? ' favorite-btn--active' : '');
      btn.setAttribute('aria-label', 'Toggle favorite');
      btn.textContent = '\u2665';

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const isNowFav = toggleFavorite(gameId);
        btn.classList.toggle('favorite-btn--active', isNowFav);
      });

      // Insert inside .game-card__body if present, otherwise directly in card
      const body = card.querySelector('.game-card__body');
      if (body) {
        body.style.position = 'relative';
        body.appendChild(btn);
      } else {
        card.style.position = 'relative';
        card.appendChild(btn);
      }
    }

    // Add hearts to existing cards
    container.querySelectorAll('.game-card').forEach(addHeartToCard);

    // Watch for dynamically added cards
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) {
            if (node.classList && node.classList.contains('game-card')) {
              addHeartToCard(node);
            }
            if (node.querySelectorAll) {
              node.querySelectorAll('.game-card').forEach(addHeartToCard);
            }
          }
        });
      });
    });
    observer.observe(container, { childList: true, subtree: true });
  });
})();
