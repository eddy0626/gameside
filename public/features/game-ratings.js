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

    // --- State ---
    var currentUser = null;
    var userRating = 0;

    // --- Helpers ---
    function readCookie(name) {
      var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
      return match ? decodeURIComponent(match[1]) : '';
    }

    function getCsrfToken() {
      return (window.gamesideCsrfToken) || readCookie('csrf_token');
    }

    function getAuthHeaders() {
      var headers = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      };
      return headers;
    }

    // --- Build UI ---
    var container = document.createElement('div');
    container.className = 'game-ratings';

    var starsContainer = document.createElement('div');
    starsContainer.className = 'game-ratings__stars';

    var infoEl = document.createElement('span');
    infoEl.className = 'game-ratings__info';

    container.appendChild(starsContainer);
    container.appendChild(infoEl);
    info.appendChild(container);

    var starEls = [];
    for (var i = 1; i <= 5; i++) {
      var star = document.createElement('span');
      star.className = 'game-ratings__star';
      star.setAttribute('data-value', String(i));
      star.setAttribute('role', 'button');
      star.setAttribute('tabindex', '0');
      star.setAttribute('aria-label', i + ' stars');
      star.textContent = '\u2606'; // empty star
      starsContainer.appendChild(star);
      starEls.push(star);
    }

    // --- Render stars ---
    function renderStars(average, count, myRating) {
      var displayRating = myRating || Math.round(average);
      for (var j = 0; j < starEls.length; j++) {
        var val = j + 1;
        if (val <= displayRating) {
          starEls[j].textContent = '\u2605'; // filled
          starEls[j].classList.add('game-ratings__star--active');
        } else {
          starEls[j].textContent = '\u2606'; // empty
          starEls[j].classList.remove('game-ratings__star--active');
        }
        if (myRating && val === myRating) {
          starEls[j].classList.add('game-ratings__star--mine');
        } else {
          starEls[j].classList.remove('game-ratings__star--mine');
        }
      }
      if (count > 0) {
        infoEl.textContent = average + ' (' + count + (count === 1 ? ' rating)' : ' ratings)');
      } else {
        infoEl.textContent = 'No ratings yet';
      }
    }

    // --- Hover preview ---
    starsContainer.addEventListener('mouseover', function (e) {
      var target = e.target;
      if (!target.classList.contains('game-ratings__star')) return;
      var hoverVal = Number(target.getAttribute('data-value'));
      for (var j = 0; j < starEls.length; j++) {
        var val = j + 1;
        if (val <= hoverVal) {
          starEls[j].textContent = '\u2605';
          starEls[j].classList.add('game-ratings__star--hover');
        } else {
          starEls[j].textContent = '\u2606';
          starEls[j].classList.remove('game-ratings__star--hover');
        }
      }
    });

    starsContainer.addEventListener('mouseout', function () {
      for (var j = 0; j < starEls.length; j++) {
        starEls[j].classList.remove('game-ratings__star--hover');
      }
      renderStars(lastAverage, lastCount, userRating);
    });

    var lastAverage = 0;
    var lastCount = 0;

    // --- Click handler ---
    starsContainer.addEventListener('click', function (e) {
      var target = e.target;
      if (!target.classList.contains('game-ratings__star')) return;
      if (!currentUser) return; // must be logged in

      var value = Number(target.getAttribute('data-value'));
      submitRating(value);
    });

    // Keyboard support
    starsContainer.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var target = e.target;
      if (!target.classList.contains('game-ratings__star')) return;
      if (!currentUser) return;
      e.preventDefault();
      var value = Number(target.getAttribute('data-value'));
      submitRating(value);
    });

    function submitRating(value) {
      fetch('/api/games/' + encodeURIComponent(gameId) + '/ratings', {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({ rating: value }),
      })
        .then(function (r) {
          if (!r.ok) throw new Error('Failed to submit rating');
          return r.json();
        })
        .then(function (data) {
          userRating = value;
          lastAverage = data.average;
          lastCount = data.count;
          renderStars(data.average, data.count, value);
        })
        .catch(function () {
          // silent fail
        });
    }

    // --- Init: fetch ratings + auth ---
    function findUserRating(ratings, userId) {
      for (var j = 0; j < ratings.length; j++) {
        if (ratings[j].userId === userId) return ratings[j].rating;
      }
      return 0;
    }

    // Fetch ratings
    fetch('/api/games/' + encodeURIComponent(gameId) + '/ratings')
      .then(function (r) { return r.ok ? r.json() : { ratings: [], average: 0, count: 0 }; })
      .then(function (data) {
        lastAverage = data.average;
        lastCount = data.count;

        // Check auth
        return fetch('/auth/me', { credentials: 'include' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (authData) {
            if (authData && authData.user) {
              currentUser = authData.user;
              var userId = currentUser.sub || currentUser.id || currentUser.email;
              userRating = findUserRating(data.ratings, userId);
            }
            renderStars(data.average, data.count, userRating);
          });
      })
      .catch(function () {
        renderStars(0, 0, 0);
      });
  });
})();
