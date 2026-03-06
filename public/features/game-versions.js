(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var player = document.querySelector('.game-player');
    if (!player) return;

    var params = new URLSearchParams(window.location.search);
    var gameId = params.get('id');
    if (!gameId) return;

    var info = player.querySelector('.game-player__info');
    if (!info) return;

    var currentUser = null;

    function readCookie(name) {
      var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
      return match ? decodeURIComponent(match[1]) : '';
    }

    function getCsrfToken() {
      return (window.gamesideCsrfToken) || readCookie('csrf_token');
    }

    function getAuthHeaders() {
      return {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      };
    }

    // Detect logged-in user
    fetch('/auth/me', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.user) currentUser = data.user;
      })
      .catch(function () {});

    // Fetch versions
    fetch('/api/games/' + encodeURIComponent(gameId) + '/versions')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        renderVersionUI(data.currentVersion, data.versions);
      })
      .catch(function () {});

    function renderVersionUI(currentVersion, versions) {
      if (!versions || versions.length === 0) return;

      var container = document.createElement('div');
      container.className = 'game-versions';

      var badge = document.createElement('span');
      badge.className = 'game-versions__current';
      badge.textContent = 'v' + currentVersion;
      container.appendChild(badge);

      var toggle = document.createElement('button');
      toggle.className = 'game-versions__toggle';
      toggle.type = 'button';
      toggle.textContent = '\uBC84\uC804 \uD788\uC2A4\uD1A0\uB9AC \u25BE';
      container.appendChild(toggle);

      var list = document.createElement('div');
      list.className = 'game-versions__list';

      // Current version item
      var currentItem = document.createElement('div');
      currentItem.className = 'game-versions__item game-versions__item--current';
      var currentLabel = document.createElement('span');
      currentLabel.textContent = 'v' + currentVersion + ' (\uD604\uC7AC)';
      currentItem.appendChild(currentLabel);
      list.appendChild(currentItem);

      // Past versions
      var sorted = versions.slice().sort(function (a, b) { return b.version - a.version; });
      for (var i = 0; i < sorted.length; i++) {
        (function (entry) {
          var item = document.createElement('div');
          item.className = 'game-versions__item';

          var label = document.createElement('span');
          label.textContent = 'v' + entry.version;
          item.appendChild(label);

          var dateSpan = document.createElement('span');
          dateSpan.textContent = formatDate(entry.date);
          item.appendChild(dateSpan);

          if (currentUser) {
            var btn = document.createElement('button');
            btn.className = 'game-versions__rollback-btn';
            btn.type = 'button';
            btn.textContent = '\uB864\uBC31';
            btn.addEventListener('click', function () {
              if (!confirm('v' + entry.version + '(\uC73C)\uB85C \uB864\uBC31\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?')) return;
              rollback(entry.version);
            });
            item.appendChild(btn);
          }

          list.appendChild(item);
        })(sorted[i]);
      }

      container.appendChild(list);
      info.appendChild(container);

      toggle.addEventListener('click', function () {
        list.classList.toggle('game-versions__list--open');
      });

      document.addEventListener('click', function (e) {
        if (!container.contains(e.target)) {
          list.classList.remove('game-versions__list--open');
        }
      });
    }

    function formatDate(iso) {
      if (!iso) return '';
      var d = new Date(iso);
      return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
    }

    function rollback(version) {
      fetch('/api/games/' + encodeURIComponent(gameId) + '/rollback', {
        method: 'POST',
        credentials: 'same-origin',
        headers: getAuthHeaders(),
        body: JSON.stringify({ version: version }),
      })
        .then(function (r) {
          if (!r.ok) return r.json().then(function (d) { throw new Error(d.error || 'Rollback failed'); });
          return r.json();
        })
        .then(function () {
          window.location.reload();
        })
        .catch(function (err) {
          alert(err.message || '\uB864\uBC31\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.');
        });
    }
  });
})();
