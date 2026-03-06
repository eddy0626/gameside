// og-meta.js — Dynamic Open Graph meta tag updater
(function () {
  'use strict';

  function setMetaTag(property, content) {
    var isOg = property.startsWith('og:');
    var attr = isOg ? 'property' : 'name';
    var selector = 'meta[' + attr + '="' + property + '"]';
    var el = document.querySelector(selector);
    if (el) {
      el.setAttribute('content', content);
    } else {
      el = document.createElement('meta');
      el.setAttribute(attr, property);
      el.setAttribute('content', content);
      document.head.appendChild(el);
    }
  }

  var path = window.location.pathname;
  var params = new URLSearchParams(window.location.search);

  if (path.endsWith('game.html')) {
    var gameId = params.get('id');
    if (!gameId) return;
    fetch('/api/games')
      .then(function (res) { return res.json(); })
      .then(function (games) {
        var game = games.find(function (g) { return g.id === gameId; });
        if (!game) return;
        setMetaTag('og:title', game.title + ' - 게임소모임');
        setMetaTag('og:description', game.description || '게임소모임에서 플레이하세요');
        if (game.thumbnail) {
          setMetaTag('og:image', window.location.origin + '/' + game.thumbnail);
        }
        setMetaTag('twitter:card', 'summary_large_image');
        document.title = game.title + ' - 게임소모임';
      })
      .catch(function () {});
  } else if (path.endsWith('portfolio.html')) {
    var name = params.get('name');
    if (!name) return;
    fetch('/api/members')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var members = data.members || data;
        var member = members.find(function (m) { return m.name === name; });
        if (!member) return;
        setMetaTag('og:title', member.name + ' - 게임소모임');
        setMetaTag('og:description', member.bio || member.name + '의 포트폴리오');
        setMetaTag('twitter:card', 'summary_large_image');
        document.title = member.name + ' - 게임소모임';
      })
      .catch(function () {});
  }
  // index.html uses static tags only — no dynamic update needed
})();
