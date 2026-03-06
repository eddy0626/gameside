/*
 * Member Navigation Feature
 *
 * Populates the header nav with links to each member's page.
 * Tries /data/members.json first, falls back to /api/games unique authors.
 */
(function () {
  'use strict';

  var GAMES_API = '/api/games';
  var MEMBERS_JSON = '/data/members.json';

  document.addEventListener('DOMContentLoaded', function () {
    var nav = document.getElementById('member-nav');
    if (!nav) return;

    // Try members.json first, fall back to /api/games
    fetch(MEMBERS_JSON)
      .then(function (res) {
        if (!res.ok) throw new Error('No members.json');
        return res.json();
      })
      .then(function (data) {
        var list = Array.isArray(data) ? data : (data.members || []);
        var names = list.map(function (m) { return m.name; });
        renderNav(nav, names);
      })
      .catch(function () {
        // Fallback: extract unique authors from /api/games
        fetch(GAMES_API, { credentials: 'include' })
          .then(function (res) {
            if (!res.ok) throw new Error('Failed');
            return res.json();
          })
          .then(function (games) {
            var seen = {};
            var names = [];
            games.forEach(function (g) {
              if (g.author && !seen[g.author]) {
                seen[g.author] = true;
                names.push(g.author);
              }
            });
            renderNav(nav, names);
          })
          .catch(function () {
            // Silently fail
          });
      });
  });

  function renderNav(nav, names) {
    if (names.length === 0) return;

    var label = document.createElement('span');
    label.className = 'header__nav-label';
    label.textContent = 'Members';
    nav.appendChild(label);

    names.forEach(function (name) {
      var link = document.createElement('a');
      link.href = 'member.html?name=' + encodeURIComponent(name);
      link.className = 'header__nav-link';
      link.textContent = name;
      nav.appendChild(link);
    });
  }
})();
