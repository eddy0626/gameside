(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var player = document.querySelector('.game-player');
    if (!player) return;

    var params = new URLSearchParams(window.location.search);
    var gameId = params.get('id');
    if (!gameId) return;

    fetch('/api/games', { credentials: 'include' })
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load games');
        return res.json();
      })
      .then(function (games) {
        var game = games.find(function (g) { return g.id === gameId; });
        if (!game) return;
        if (!game.coAuthors || !Array.isArray(game.coAuthors) || game.coAuthors.length === 0) return;

        var info = player.querySelector('.game-player__info');
        var authorEl = player.querySelector('.game-player__author');
        if (!info || !authorEl) return;

        var container = document.createElement('div');
        container.className = 'game-coauthors';

        var label = document.createElement('span');
        label.className = 'game-coauthors__label';
        label.textContent = '\uACF5\uB3D9 \uAC1C\uBC1C:';
        container.appendChild(label);

        game.coAuthors.forEach(function (name, i) {
          if (i > 0) {
            var sep = document.createElement('span');
            sep.className = 'game-coauthors__separator';
            sep.textContent = ', ';
            container.appendChild(sep);
          }

          var link = document.createElement('a');
          link.href = 'portfolio.html?name=' + encodeURIComponent(name);
          link.className = 'game-coauthors__link';
          link.textContent = name;
          container.appendChild(link);
        });

        // Insert after the author element
        if (authorEl.nextSibling) {
          info.insertBefore(container, authorEl.nextSibling);
        } else {
          info.appendChild(container);
        }
      })
      .catch(function () {
        // Silently fail
      });
  });
})();
