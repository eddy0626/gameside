(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', async function () {
    const player = document.querySelector('.game-player');
    if (!player) return; // game.html에서만 동작

    const params = new URLSearchParams(window.location.search);
    const gameId = params.get('id');
    if (!gameId) return;

    // games/index.json fetch
    const response = await fetch('/api/games', { credentials: 'include' });
    const games = await response.json();
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    const info = player.querySelector('.game-player__info');

    // 태그 뱃지 삽입
    const tagsEl = document.createElement('div');
    tagsEl.className = 'game-detail__tags';
    game.tags.forEach(tag => {
      const badge = document.createElement('a');
      badge.href = 'index.html?tag=' + encodeURIComponent(tag);
      badge.className = 'game-detail__tag';
      badge.textContent = tag;
      tagsEl.appendChild(badge);
    });

    // 메타 정보 (날짜, 플레이 수)
    const metaEl = document.createElement('div');
    metaEl.className = 'game-detail__meta';
    const dateEl = document.createElement('span');
    dateEl.className = 'game-detail__date';
    dateEl.textContent = 'Uploaded: ' + game.date;
    const playsEl = document.createElement('span');
    playsEl.className = 'game-detail__plays';
    playsEl.textContent = game.plays + ' plays';
    metaEl.appendChild(dateEl);
    metaEl.appendChild(playsEl);

    // info 영역 끝에 추가
    info.appendChild(tagsEl);
    info.appendChild(metaEl);
  });
})();
