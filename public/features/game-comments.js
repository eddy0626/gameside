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

    function getCsrfToken() {
      var match = document.cookie.match(/(^|;\s*)csrf_token=([^;]*)/);
      return match ? decodeURIComponent(match[2]) : '';
    }

    function relativeTime(dateStr) {
      var now = Date.now();
      var then = new Date(dateStr).getTime();
      var diff = Math.floor((now - then) / 1000);
      if (diff < 60) return '방금 전';
      if (diff < 3600) return Math.floor(diff / 60) + '분 전';
      if (diff < 86400) return Math.floor(diff / 3600) + '시간 전';
      if (diff < 2592000) return Math.floor(diff / 86400) + '일 전';
      var d = new Date(dateStr);
      return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
    }

    function buildSection() {
      var section = document.createElement('section');
      section.className = 'game-comments';

      var title = document.createElement('h3');
      title.className = 'game-comments__title';
      title.textContent = '댓글 (0)';
      section.appendChild(title);

      if (currentUser) {
        var form = document.createElement('form');
        form.className = 'game-comments__form';

        var textarea = document.createElement('textarea');
        textarea.className = 'game-comments__input';
        textarea.placeholder = '댓글을 남겨보세요...';
        textarea.maxLength = 1000;
        form.appendChild(textarea);

        var btn = document.createElement('button');
        btn.className = 'game-comments__submit';
        btn.type = 'submit';
        btn.textContent = '작성';
        form.appendChild(btn);

        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var text = textarea.value.trim();
          if (!text) return;
          btn.disabled = true;
          fetch('/api/games/' + encodeURIComponent(gameId) + '/comments', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': getCsrfToken(),
            },
            body: JSON.stringify({ text: text }),
          })
            .then(function (r) { return r.json(); })
            .then(function (data) {
              if (data.comments) {
                textarea.value = '';
                renderComments(data.comments);
              }
            })
            .catch(function () {})
            .finally(function () { btn.disabled = false; });
        });

        section.appendChild(form);
      } else {
        var notice = document.createElement('p');
        notice.className = 'game-comments__login-notice';
        notice.textContent = '로그인 후 댓글을 작성할 수 있습니다';
        section.appendChild(notice);
      }

      var list = document.createElement('div');
      list.className = 'game-comments__list';
      section.appendChild(list);

      info.appendChild(section);
    }

    function renderComments(comments) {
      var section = info.querySelector('.game-comments');
      if (!section) return;

      var titleEl = section.querySelector('.game-comments__title');
      titleEl.textContent = '댓글 (' + comments.length + ')';

      var list = section.querySelector('.game-comments__list');
      while (list.firstChild) {
        list.removeChild(list.firstChild);
      }

      if (comments.length === 0) {
        var empty = document.createElement('p');
        empty.className = 'game-comments__empty';
        empty.textContent = '아직 댓글이 없습니다. 첫 댓글을 남겨보세요!';
        list.appendChild(empty);
        return;
      }

      var userId = currentUser ? (currentUser.sub || currentUser.id || currentUser.email) : null;

      comments.forEach(function (comment) {
        var item = document.createElement('div');
        item.className = 'game-comments__item';

        var header = document.createElement('div');
        header.className = 'game-comments__item-header';

        var author = document.createElement('span');
        author.className = 'game-comments__item-author';
        author.textContent = comment.name;
        header.appendChild(author);

        var date = document.createElement('span');
        date.className = 'game-comments__item-date';
        date.textContent = relativeTime(comment.timestamp);
        header.appendChild(date);

        if (userId && comment.userId === userId) {
          var delBtn = document.createElement('button');
          delBtn.className = 'game-comments__item-delete';
          delBtn.type = 'button';
          delBtn.textContent = '삭제';
          delBtn.addEventListener('click', function () {
            if (!confirm('댓글을 삭제하시겠습니까?')) return;
            delBtn.disabled = true;
            fetch('/api/games/' + encodeURIComponent(gameId) + '/comments/' + encodeURIComponent(comment.id), {
              method: 'DELETE',
              credentials: 'include',
              headers: { 'X-CSRF-Token': getCsrfToken() },
            })
              .then(function (r) { return r.json(); })
              .then(function (data) {
                if (data.comments) {
                  renderComments(data.comments);
                }
              })
              .catch(function () { delBtn.disabled = false; });
          });
          header.appendChild(delBtn);
        }

        item.appendChild(header);

        var text = document.createElement('p');
        text.className = 'game-comments__item-text';
        text.textContent = comment.text;
        item.appendChild(text);

        list.appendChild(item);
      });
    }

    function loadComments() {
      fetch('/api/games/' + encodeURIComponent(gameId) + '/comments')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.comments) {
            renderComments(data.comments);
          }
        })
        .catch(function () {});
    }

    // Check login status then initialize
    fetch('/auth/me', { credentials: 'include' })
      .then(function (r) {
        if (r.ok) return r.json();
        return null;
      })
      .then(function (data) {
        currentUser = data && data.user ? data.user : data;
        buildSection();
        loadComments();
      })
      .catch(function () {
        currentUser = null;
        buildSection();
        loadComments();
      });
  });
})();
