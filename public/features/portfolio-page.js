(function () {
  'use strict';

  var MEMBERS_JSON_PATH = 'data/members.json';
  var GAMES_API_PATH = '/api/games';

  function getQueryParam(key) {
    var params = new URLSearchParams(window.location.search);
    return params.get(key);
  }

  function getThumbnailSrc(game) {
    return game.thumbnailUrl || game.thumbnail;
  }

  function createPortfolioGameCard(game) {
    var card = document.createElement('a');
    card.href = 'game.html?id=' + encodeURIComponent(game.id);
    card.className = 'game-card';

    var thumb = document.createElement('img');
    thumb.src = getThumbnailSrc(game);
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

    body.appendChild(title);
    body.appendChild(desc);
    card.appendChild(thumb);
    card.appendChild(body);

    return card;
  }

  function renderLinks(container, links) {
    if (!links) return;

    var items = [
      { key: 'github', label: 'GitHub', icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/></svg>' },
      { key: 'email', label: 'Email', icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4l-10 8L2 4"/></svg>' },
      { key: 'linkedin', label: 'LinkedIn', icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>' }
    ];

    items.forEach(function (item) {
      var value = links[item.key];
      if (!value) return;

      var a = document.createElement('a');
      a.className = 'portfolio__link-btn';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label', item.label);

      if (item.key === 'email') {
        a.href = 'mailto:' + value;
      } else {
        a.href = value;
      }

      a.innerHTML = item.icon + '<span>' + item.label + '</span>';
      container.appendChild(a);
    });
  }

  function showError(message) {
    var portfolio = document.getElementById('portfolio');
    portfolio.innerHTML = '';
    var p = document.createElement('p');
    p.className = 'error-message';
    p.textContent = message;
    portfolio.appendChild(p);
  }

  function getInitials(name) {
    return name.charAt(0);
  }

  async function init() {
    var portfolio = document.getElementById('portfolio');
    if (!portfolio) return;

    var name = getQueryParam('name');
    if (!name) {
      showError('No member specified.');
      return;
    }

    // Fetch member data
    var members;
    try {
      var res = await fetch(MEMBERS_JSON_PATH);
      if (!res.ok) throw new Error('Failed to load members');
      members = await res.json();
    } catch (err) {
      showError('Failed to load member data.');
      return;
    }

    var member = members.find(function (m) { return m.name === name; });

    if (!member) {
      // Show default profile for unknown members
      member = {
        name: name,
        role: '',
        picture: '',
        tagline: '',
        bio: '',
        skills: [],
        links: {}
      };
    }

    // Update page title
    document.title = member.name + ' - Portfolio - Game Showcase';

    // Avatar
    var avatarEl = document.getElementById('portfolio-avatar');
    if (member.picture) {
      avatarEl.innerHTML = '';
      var img = document.createElement('img');
      img.src = member.picture;
      img.alt = member.name;
      img.className = 'portfolio__avatar-img';
      avatarEl.appendChild(img);
    } else {
      // Show initials instead of placeholder SVG
      avatarEl.innerHTML = '';
      var initialsEl = document.createElement('span');
      initialsEl.className = 'portfolio__avatar-initials';
      initialsEl.textContent = getInitials(member.name);
      avatarEl.appendChild(initialsEl);
    }

    // Name, role, tagline
    document.getElementById('portfolio-name').textContent = member.name;
    var roleEl = document.getElementById('portfolio-role');
    if (member.role) {
      roleEl.textContent = member.role;
    } else {
      roleEl.style.display = 'none';
    }

    var taglineEl = document.getElementById('portfolio-tagline');
    if (member.tagline) {
      taglineEl.textContent = member.tagline;
    } else {
      taglineEl.style.display = 'none';
    }

    // Bio
    var bioEl = document.getElementById('portfolio-bio');
    if (member.bio) {
      bioEl.textContent = member.bio;
    } else {
      bioEl.parentElement.style.display = 'none';
    }

    // Skills
    var skillsContainer = document.getElementById('portfolio-skills');
    if (member.skills && member.skills.length > 0) {
      member.skills.forEach(function (skill) {
        var tag = document.createElement('span');
        tag.className = 'portfolio__skill-tag';
        tag.textContent = skill;
        skillsContainer.appendChild(tag);
      });
    } else {
      skillsContainer.parentElement.style.display = 'none';
    }

    // Links
    var linksContainer = document.getElementById('portfolio-links');
    renderLinks(linksContainer, member.links);

    // Fetch games by this author
    try {
      var gamesRes = await fetch(GAMES_API_PATH, { credentials: 'include' });
      if (!gamesRes.ok) throw new Error('Failed to load games');
      var games = await gamesRes.json();
      var authorGames = games.filter(function (g) { return g.author === member.name; });

      var gamesGrid = document.getElementById('portfolio-games');
      var noGamesMsg = document.getElementById('portfolio-no-games');

      if (authorGames.length > 0) {
        var fragment = document.createDocumentFragment();
        authorGames.forEach(function (game) {
          fragment.appendChild(createPortfolioGameCard(game));
        });
        gamesGrid.appendChild(fragment);
      } else {
        noGamesMsg.style.display = '';
      }
    } catch (err) {
      // Silently skip games section on error
      document.getElementById('portfolio-no-games').textContent = 'Failed to load games.';
      document.getElementById('portfolio-no-games').style.display = '';
    }
  }

  init();
})();
