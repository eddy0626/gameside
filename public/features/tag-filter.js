/*
 * Tag Filter Feature
 *
 * HTML required (place before #game-container in index.html):
 *   <div id="tag-filter-container" class="tag-filter"></div>
 *
 * CSS required (add to style.css):
 *   .tag-filter { display: flex; flex-wrap: wrap; gap: 0.5rem; max-width: 800px; margin: 0 auto 1.5rem; justify-content: center; }
 *   .tag-filter__btn { padding: 0.4rem 1rem; border-radius: 20px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-secondary); font-size: 0.85rem; cursor: pointer; transition: all 0.3s ease; }
 *   .tag-filter__btn:hover { border-color: var(--neon-purple); color: var(--text-primary); }
 *   .tag-filter__btn--active { background: var(--neon-purple); border-color: var(--neon-purple); color: #fff; }
 */
(function () {
  'use strict';

  const GAMES_JSON_PATH = '/api/games';

  document.addEventListener('DOMContentLoaded', function () {
    const filterContainer = document.getElementById('tag-filter-container');
    if (!filterContainer) return;

    // Check for ?tag= param from game-detail tag links
    const urlParams = new URLSearchParams(window.location.search);
    const preselectedTag = urlParams.get('tag') || '';

    fetch(GAMES_JSON_PATH, { credentials: 'include' })
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load games');
        return res.json();
      })
      .then(function (games) {
        const gameTagMap = {};
        const tagSet = {};

        games.forEach(function (game) {
          gameTagMap[game.id] = game.tags || [];
          (game.tags || []).forEach(function (tag) {
            tagSet[tag] = true;
          });
        });

        const uniqueTags = Object.keys(tagSet).sort();

        // Create "All" button
        const allBtn = document.createElement('button');
        allBtn.type = 'button';
        allBtn.className = 'tag-filter__btn' + (!preselectedTag ? ' tag-filter__btn--active' : '');
        allBtn.textContent = 'All';
        allBtn.dataset.tag = '';
        filterContainer.appendChild(allBtn);

        // Create a button for each unique tag
        uniqueTags.forEach(function (tag) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'tag-filter__btn' + (preselectedTag === tag ? ' tag-filter__btn--active' : '');
          btn.textContent = tag.charAt(0).toUpperCase() + tag.slice(1);
          btn.dataset.tag = tag;
          filterContainer.appendChild(btn);
        });

        // Apply preselected tag filter on load
        if (preselectedTag) {
          applyFilter(preselectedTag, gameTagMap);
        }

        // Handle filter clicks
        filterContainer.addEventListener('click', function (e) {
          const btn = e.target.closest('.tag-filter__btn');
          if (!btn) return;

          const buttons = filterContainer.querySelectorAll('.tag-filter__btn');
          buttons.forEach(function (b) {
            b.classList.remove('tag-filter__btn--active');
          });
          btn.classList.add('tag-filter__btn--active');

          applyFilter(btn.dataset.tag, gameTagMap);
        });
      })
      .catch(function () {
        // Silently fail - filter just won't appear
      });

    function applyFilter(selectedTag, gameTagMap) {
      const cards = document.querySelectorAll('.game-card');
      cards.forEach(function (card) {
        const href = card.getAttribute('href') || '';
        const match = href.match(/[?&]id=([^&]+)/);
        const gameId = match ? decodeURIComponent(match[1]) : '';
        const tags = gameTagMap[gameId] || [];

        if (!selectedTag || tags.indexOf(selectedTag) !== -1) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    }
  });
})();
