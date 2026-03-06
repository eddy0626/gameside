/*
 * Member Page Feature
 *
 * Displays games filtered by a specific author.
 * URL: /member.html?name=AuthorName
 *
 * Tries to load member info from /data/members.json first.
 * Falls back to extracting unique authors from /api/games.
 */
(function () {
  'use strict';

  var GAMES_API = '/api/games';
  var MEMBERS_JSON = '/data/members.json';

  document.addEventListener('DOMContentLoaded', function () {
    var params = new URLSearchParams(window.location.search);
    var memberName = params.get('name');

    if (!memberName) {
      showError('No member specified.');
      return;
    }

    // Update page title immediately
    document.title = memberName + ' - 게임소모임';

    Promise.all([
      fetchGames(),
      fetchMembers()
    ]).then(function (results) {
      var games = results[0];
      var members = results[1];

      var memberGames = games.filter(function (g) {
        return g.author === memberName;
      });

      if (memberGames.length === 0) {
        showError('"' + memberName + '"님의 게임을 찾을 수 없습니다.');
        return;
      }

      // Find member info from members.json if available
      var memberInfo = null;
      if (members) {
        memberInfo = members.find(function (m) {
          return m.name === memberName;
        });
      }

      renderProfile(memberName, memberInfo, memberGames.length);
      renderGames(memberGames);
      initTagFilter(memberGames);
    }).catch(function () {
      showError('데이터를 불러오는데 실패했습니다.');
    });
  });

  function fetchGames() {
    return fetch(GAMES_API, { credentials: 'include' })
      .then(function (res) {
        if (!res.ok) throw new Error('Failed');
        return res.json();
      });
  }

  function fetchMembers() {
    return fetch(MEMBERS_JSON)
      .then(function (res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function (data) {
        if (!data) return null;
        return Array.isArray(data) ? data : (data.members || []);
      })
      .catch(function () {
        return null;
      });
  }

  function renderProfile(name, memberInfo, gameCount) {
    var nameEl = document.getElementById('member-name');
    var bioEl = document.getElementById('member-bio');
    var statsEl = document.getElementById('member-stats');
    var avatarEl = document.getElementById('member-avatar');

    nameEl.textContent = name;

    if (memberInfo && memberInfo.bio) {
      bioEl.textContent = memberInfo.bio;
    } else {
      bioEl.textContent = name + '님이 업로드한 게임 모음';
    }

    if (memberInfo && memberInfo.avatar) {
      var img = document.createElement('img');
      img.src = memberInfo.avatar;
      img.alt = name;
      img.className = 'member-profile__avatar-img';
      avatarEl.appendChild(img);
    } else {
      // Default initial avatar
      avatarEl.textContent = name.charAt(0).toUpperCase();
      avatarEl.classList.add('member-profile__avatar--default');
    }

    var stat = document.createElement('span');
    stat.className = 'member-profile__stat';
    stat.textContent = gameCount + '개의 게임';
    statsEl.appendChild(stat);

    var headingEl = document.getElementById('member-games-heading');
    headingEl.textContent = name + '님의 게임';
  }

  function renderGames(games) {
    var grid = document.querySelector('.gallery-grid');
    var fragment = document.createDocumentFragment();

    games.forEach(function (game) {
      fragment.appendChild(createGameCard(game));
    });

    grid.appendChild(fragment);
  }

  function createGameCard(game) {
    var card = document.createElement('a');
    card.href = 'game.html?id=' + encodeURIComponent(game.id);
    card.className = 'game-card';
    card.dataset.title = game.title.toLowerCase();
    card.dataset.gameId = game.id;

    var thumb = document.createElement('img');
    thumb.src = game.thumbnailUrl || game.thumbnail;
    thumb.alt = game.title;
    thumb.className = 'game-card__thumbnail';

    var body = document.createElement('div');
    body.className = 'game-card__body';

    var title = document.createElement('h3');
    title.className = 'game-card__title';
    title.textContent = game.title;

    var desc = document.createElement('p');
    desc.className = 'game-card__description';
    desc.textContent = game.description;

    var tags = document.createElement('div');
    tags.className = 'game-card__tags';
    (game.tags || []).forEach(function (tag) {
      var span = document.createElement('span');
      span.className = 'game-card__tag';
      span.textContent = tag;
      tags.appendChild(span);
    });

    body.appendChild(title);
    body.appendChild(desc);
    body.appendChild(tags);
    card.appendChild(thumb);
    card.appendChild(body);

    return card;
  }

  function initTagFilter(games) {
    var filterContainer = document.getElementById('tag-filter-container');
    if (!filterContainer) return;

    // Collect unique tags from member's games
    var tagSet = {};
    var gameTagMap = {};

    games.forEach(function (game) {
      gameTagMap[game.id] = game.tags || [];
      (game.tags || []).forEach(function (tag) {
        tagSet[tag] = true;
      });
    });

    var uniqueTags = Object.keys(tagSet).sort();

    // Only show filter if there are 2+ tags
    if (uniqueTags.length < 2) {
      filterContainer.style.display = 'none';
      return;
    }

    // Create "All" button
    var allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'tag-filter__btn tag-filter__btn--active';
    allBtn.textContent = 'All';
    allBtn.dataset.tag = '';
    filterContainer.appendChild(allBtn);

    uniqueTags.forEach(function (tag) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tag-filter__btn';
      btn.textContent = tag.charAt(0).toUpperCase() + tag.slice(1);
      btn.dataset.tag = tag;
      filterContainer.appendChild(btn);
    });

    filterContainer.addEventListener('click', function (e) {
      var btn = e.target.closest('.tag-filter__btn');
      if (!btn) return;

      var buttons = filterContainer.querySelectorAll('.tag-filter__btn');
      buttons.forEach(function (b) {
        b.classList.remove('tag-filter__btn--active');
      });
      btn.classList.add('tag-filter__btn--active');

      var selectedTag = btn.dataset.tag;
      var cards = document.querySelectorAll('.game-card');
      cards.forEach(function (card) {
        var gameId = card.dataset.gameId || '';
        var tags = gameTagMap[gameId] || [];
        if (!selectedTag || tags.indexOf(selectedTag) !== -1) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }

  function showError(message) {
    var profile = document.getElementById('member-profile');
    profile.style.display = 'none';

    var container = document.getElementById('game-container');
    container.textContent = '';
    var p = document.createElement('p');
    p.className = 'error-message';
    p.textContent = message;
    container.appendChild(p);

    var heading = document.getElementById('member-games-heading');
    heading.style.display = 'none';

    var filter = document.getElementById('tag-filter-container');
    if (filter) filter.style.display = 'none';
  }
})();
