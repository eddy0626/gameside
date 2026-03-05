// features/sort.js
// Requires: #sort-container element inside .search-bar in index.html
// Requires: .sort-bar, .sort-bar__select CSS classes in style.css
(function () {
  'use strict';

  const GAMES_JSON_PATH = '/api/games';
  let cachedGames = null;

  function fetchGames() {
    if (cachedGames) {
      return Promise.resolve(cachedGames);
    }
    return fetch(GAMES_JSON_PATH, { credentials: 'include' })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Failed to load games (' + response.status + ')');
        }
        return response.json();
      })
      .then(function (data) {
        cachedGames = data;
        return data;
      });
  }

  function getGameIdFromCard(card) {
    const href = card.getAttribute('href') || '';
    const match = href.match(/[?&]id=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  function sortGames(games, criterion) {
    const sorted = games.slice();
    switch (criterion) {
      case 'newest':
        sorted.sort(function (a, b) {
          return new Date(b.date) - new Date(a.date);
        });
        break;
      case 'popular':
        sorted.sort(function (a, b) {
          return (b.plays || 0) - (a.plays || 0);
        });
        break;
      case 'az':
        sorted.sort(function (a, b) {
          return a.title.localeCompare(b.title);
        });
        break;
      default:
        // 'default' — keep original order from JSON
        break;
    }
    return sorted;
  }

  function reorderCards(grid, orderedIds) {
    const cards = Array.prototype.slice.call(grid.querySelectorAll('.game-card'));
    const cardMap = {};
    cards.forEach(function (card) {
      const id = getGameIdFromCard(card);
      if (id) {
        cardMap[id] = card;
      }
    });

    const fragment = document.createDocumentFragment();
    orderedIds.forEach(function (id) {
      if (cardMap[id]) {
        fragment.appendChild(cardMap[id]);
      }
    });

    // Append any remaining cards not found in orderedIds
    cards.forEach(function (card) {
      if (!card.parentNode || card.parentNode === fragment) return;
      const id = getGameIdFromCard(card);
      if (!cardMap[id] || fragment.contains(card)) return;
    });

    grid.appendChild(fragment);
  }

  document.addEventListener('DOMContentLoaded', function () {
    const sortContainer = document.getElementById('sort-container');
    if (!sortContainer) return;

    // Build dropdown
    const select = document.createElement('select');
    select.className = 'sort-bar__select';
    select.setAttribute('aria-label', 'Sort games');

    const options = [
      { value: 'default', label: 'Default' },
      { value: 'newest', label: 'Newest' },
      { value: 'popular', label: 'Most Played' },
      { value: 'az', label: 'A \u2013 Z' }
    ];

    options.forEach(function (opt) {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      select.appendChild(option);
    });

    sortContainer.appendChild(select);

    // Handle change
    select.addEventListener('change', function () {
      const grid = document.querySelector('.gallery-grid');
      if (!grid) return;

      fetchGames().then(function (games) {
        const sorted = sortGames(games, select.value);
        const orderedIds = sorted.map(function (g) { return g.id; });
        reorderCards(grid, orderedIds);
      });
    });
  });
})();
