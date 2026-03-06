(function () {
  'use strict';

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function init() {
    var player = document.querySelector('.game-player');
    if (!player) return;

    var params = new URLSearchParams(window.location.search);
    var gameId = params.get('id');
    if (!gameId) return;

    fetch('/api/games')
      .then(function (res) { return res.json(); })
      .then(function (games) {
        var game = games.find(function (g) { return g.id === gameId; });
        if (!game || !game.devNote || !game.devNote.trim()) return;

        return Promise.all([
          loadScript('https://cdn.jsdelivr.net/npm/marked/marked.min.js'),
          loadScript('https://cdn.jsdelivr.net/npm/dompurify/dist/purify.min.js')
        ]).then(function () {
          renderDevNote(player, game.devNote);
        });
      })
      .catch(function (err) {
        console.error('game-devnote: failed to load', err);
      });
  }

  function renderDevNote(player, devNoteText) {
    var section = document.createElement('section');
    section.className = 'game-devnote';

    var title = document.createElement('h3');
    title.className = 'game-devnote__title';
    title.textContent = '\uAC1C\uBC1C \uD6C4\uAE30';

    var content = document.createElement('div');
    content.className = 'game-devnote__content';
    // Safe: sanitized with DOMPurify
    content.innerHTML = DOMPurify.sanitize(marked.parse(devNoteText));

    section.appendChild(title);
    section.appendChild(content);

    player.parentNode.insertBefore(section, player.nextSibling);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
