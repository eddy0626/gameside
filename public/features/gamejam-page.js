/* ==========================================================================
   Game Jam Page – fetches jams, renders cards, create/join forms
   ========================================================================== */
(function () {
  'use strict';

  var container = document.getElementById('gamejam');
  if (!container) return;

  var listEl = document.getElementById('gamejam-list');
  var createBtn = document.getElementById('gamejam-create-btn');
  var currentUser = null;
  var allGames = [];

  // --- Helpers ---
  function formatDate(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '.' + m + '.' + day;
  }

  function getCsrfToken() {
    var match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  function statusLabel(status) {
    if (status === 'active') return '\uC9C4\uD589 \uC911';
    if (status === 'upcoming') return '\uC608\uC815';
    return '\uC885\uB8CC';
  }

  // --- Check auth ---
  function checkAuth() {
    return fetch('/auth/me', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  // --- Fetch games ---
  function fetchGames() {
    return fetch('/api/games', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; });
  }

  // --- Fetch jams ---
  function fetchJams() {
    return fetch('/api/gamejam', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; });
  }

  // --- Render ---
  function renderJams(jams) {
    listEl.textContent = '';

    var groups = { active: [], upcoming: [], ended: [] };
    jams.forEach(function (jam) {
      var s = jam.status || 'ended';
      if (groups[s]) groups[s].push(jam);
    });

    var order = [
      { key: 'active', title: '\uC9C4\uD589 \uC911' },
      { key: 'upcoming', title: '\uC608\uC815' },
      { key: 'ended', title: '\uC885\uB8CC' },
    ];

    var hasAny = false;

    order.forEach(function (group) {
      var items = groups[group.key];
      if (!items || items.length === 0) return;
      hasAny = true;

      var section = document.createElement('div');
      section.className = 'gamejam__group';

      var heading = document.createElement('h3');
      heading.className = 'gamejam__group-title';
      heading.textContent = group.title;
      section.appendChild(heading);

      var grid = document.createElement('div');
      grid.className = 'gamejam__grid';

      items.forEach(function (jam) {
        grid.appendChild(createCard(jam));
      });

      section.appendChild(grid);
      listEl.appendChild(section);
    });

    if (!hasAny) {
      var empty = document.createElement('p');
      empty.className = 'gamejam__empty';
      empty.textContent = '\uC544\uC9C1 \uB4F1\uB85D\uB41C \uAC8C\uC784\uC7BC\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.';
      listEl.appendChild(empty);
    }
  }

  function createCard(jam) {
    var card = document.createElement('div');
    card.className = 'gamejam-card gamejam-card--' + (jam.status || 'ended');

    var badge = document.createElement('div');
    badge.className = 'gamejam-card__status';
    badge.textContent = statusLabel(jam.status);
    card.appendChild(badge);

    var title = document.createElement('h3');
    title.className = 'gamejam-card__title';
    title.textContent = jam.title;
    card.appendChild(title);

    if (jam.theme) {
      var theme = document.createElement('p');
      theme.className = 'gamejam-card__theme';
      theme.textContent = '\uD14C\uB9C8: ' + jam.theme;
      card.appendChild(theme);
    }

    if (jam.description) {
      var desc = document.createElement('p');
      desc.className = 'gamejam-card__desc';
      desc.textContent = jam.description;
      card.appendChild(desc);
    }

    var dates = document.createElement('div');
    dates.className = 'gamejam-card__dates';
    dates.textContent = formatDate(jam.startDate) + ' ~ ' + formatDate(jam.endDate);
    card.appendChild(dates);

    var entries = document.createElement('div');
    entries.className = 'gamejam-card__entries';
    entries.textContent = '\uCC38\uAC00\uC791 ' + (jam.entries ? jam.entries.length : 0) + '\uAC1C';
    card.appendChild(entries);

    // Show entry thumbnails
    if (jam.entries && jam.entries.length > 0) {
      var thumbs = document.createElement('div');
      thumbs.className = 'gamejam-card__thumbs';
      jam.entries.slice(0, 4).forEach(function (gid) {
        var game = allGames.find(function (g) { return g.id === gid; });
        if (game) {
          var img = document.createElement('img');
          img.className = 'gamejam-card__thumb';
          img.src = game.thumbnailUrl || game.thumbnail || '';
          img.alt = game.title || '';
          img.width = 48;
          img.height = 48;
          thumbs.appendChild(img);
        }
      });
      card.appendChild(thumbs);
    }

    // Join button for active jams
    if (jam.status === 'active' && currentUser) {
      var joinBtn = document.createElement('button');
      joinBtn.className = 'gamejam-card__join-btn';
      joinBtn.textContent = '\uAC8C\uC784 \uCC38\uAC00';
      joinBtn.addEventListener('click', function () {
        openJoinModal(jam);
      });
      card.appendChild(joinBtn);
    }

    return card;
  }

  // --- Create Modal ---
  function openCreateModal() {
    var overlay = document.createElement('div');
    overlay.className = 'gamejam-modal__overlay';

    var modal = document.createElement('div');
    modal.className = 'gamejam-modal';

    var heading = document.createElement('h3');
    heading.className = 'gamejam-modal__title';
    heading.textContent = '\uAC8C\uC784\uC7BC \uB9CC\uB4E4\uAE30';
    modal.appendChild(heading);

    var form = document.createElement('form');
    form.className = 'gamejam-modal__form';

    var fields = [
      { name: 'title', label: '\uC81C\uBAA9', type: 'text', required: true, max: 100 },
      { name: 'description', label: '\uC124\uBA85', type: 'textarea', required: false },
      { name: 'theme', label: '\uD14C\uB9C8', type: 'text', required: false },
      { name: 'startDate', label: '\uC2DC\uC791\uC77C', type: 'date', required: true },
      { name: 'endDate', label: '\uC885\uB8CC\uC77C', type: 'date', required: true },
    ];

    fields.forEach(function (f) {
      var label = document.createElement('label');
      label.className = 'gamejam-modal__label';
      label.textContent = f.label;

      var input;
      if (f.type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = 3;
      } else {
        input = document.createElement('input');
        input.type = f.type;
      }
      input.className = 'gamejam-modal__input';
      input.name = f.name;
      if (f.required) input.required = true;
      if (f.max) input.maxLength = f.max;

      label.appendChild(input);
      form.appendChild(label);
    });

    var actions = document.createElement('div');
    actions.className = 'gamejam-modal__actions';

    var submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'gamejam-modal__submit';
    submitBtn.textContent = '\uB9CC\uB4E4\uAE30';
    actions.appendChild(submitBtn);

    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'gamejam-modal__cancel';
    cancelBtn.textContent = '\uCDE8\uC18C';
    cancelBtn.addEventListener('click', function () {
      overlay.remove();
    });
    actions.appendChild(cancelBtn);

    form.appendChild(actions);
    modal.appendChild(form);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.remove();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitBtn.disabled = true;

      var data = {
        title: form.elements.title.value,
        description: form.elements.description.value,
        theme: form.elements.theme.value,
        startDate: form.elements.startDate.value,
        endDate: form.elements.endDate.value,
      };

      fetch('/api/gamejam', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify(data),
      })
        .then(function (r) {
          if (!r.ok) return r.json().then(function (d) { throw new Error(d.error || 'Failed'); });
          return r.json();
        })
        .then(function () {
          overlay.remove();
          loadAll();
        })
        .catch(function (err) {
          submitBtn.disabled = false;
          alert(err.message);
        });
    });
  }

  // --- Join Modal ---
  function openJoinModal(jam) {
    var available = allGames.filter(function (g) {
      return jam.entries.indexOf(g.id) === -1;
    });

    if (available.length === 0) {
      alert('\uCC38\uAC00\uD560 \uC218 \uC788\uB294 \uAC8C\uC784\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.');
      return;
    }

    var overlay = document.createElement('div');
    overlay.className = 'gamejam-modal__overlay';

    var modal = document.createElement('div');
    modal.className = 'gamejam-modal';

    var heading = document.createElement('h3');
    heading.className = 'gamejam-modal__title';
    heading.textContent = '\uAC8C\uC784 \uCC38\uAC00';
    modal.appendChild(heading);

    var desc = document.createElement('p');
    desc.className = 'gamejam-modal__desc';
    desc.textContent = jam.title + '\uC5D0 \uCC38\uAC00\uD560 \uAC8C\uC784\uC744 \uC120\uD0DD\uD558\uC138\uC694.';
    modal.appendChild(desc);

    var list = document.createElement('div');
    list.className = 'gamejam-modal__game-list';

    available.forEach(function (game) {
      var item = document.createElement('button');
      item.className = 'gamejam-modal__game-item';
      item.type = 'button';

      var thumb = document.createElement('img');
      thumb.className = 'gamejam-modal__game-thumb';
      thumb.src = game.thumbnailUrl || game.thumbnail || '';
      thumb.alt = game.title || '';
      thumb.width = 40;
      thumb.height = 40;
      item.appendChild(thumb);

      var name = document.createElement('span');
      name.className = 'gamejam-modal__game-name';
      name.textContent = game.title;
      item.appendChild(name);

      item.addEventListener('click', function () {
        submitEntry(jam.id, game.id, overlay);
      });

      list.appendChild(item);
    });

    modal.appendChild(list);

    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'gamejam-modal__cancel';
    cancelBtn.textContent = '\uCDE8\uC18C';
    cancelBtn.addEventListener('click', function () {
      overlay.remove();
    });
    modal.appendChild(cancelBtn);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.remove();
    });
  }

  function submitEntry(jamId, gameId, overlay) {
    fetch('/api/gamejam/' + encodeURIComponent(jamId) + '/entries', {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      body: JSON.stringify({ gameId: gameId }),
    })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (d) { throw new Error(d.error || 'Failed'); });
        return r.json();
      })
      .then(function () {
        overlay.remove();
        loadAll();
      })
      .catch(function (err) {
        alert(err.message);
      });
  }

  // --- Init ---
  function loadAll() {
    Promise.all([fetchJams(), fetchGames(), checkAuth()])
      .then(function (results) {
        var jams = results[0];
        allGames = results[1];
        currentUser = results[2];

        if (currentUser) {
          createBtn.style.display = '';
        } else {
          createBtn.style.display = 'none';
        }

        renderJams(jams);
      })
      .catch(function (err) {
        console.error('Failed to load gamejam data:', err);
      });
  }

  createBtn.addEventListener('click', function () {
    openCreateModal();
  });

  loadAll();
})();
