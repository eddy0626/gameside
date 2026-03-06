(function () {
  'use strict';

  var player = document.querySelector('.game-player');
  if (!player) return;

  // ── Fullscreen button enhancement ──────────────────────────────────

  var fullscreenBtn = player.querySelector('.game-player__fullscreen-btn');
  if (fullscreenBtn) {
    var expandSVG =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<polyline points="15 3 21 3 21 9"/>' +
        '<polyline points="9 21 3 21 3 15"/>' +
        '<line x1="21" y1="3" x2="14" y2="10"/>' +
        '<line x1="3" y1="21" x2="10" y2="14"/>' +
      '</svg>';

    var shrinkSVG =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<polyline points="4 14 10 14 10 20"/>' +
        '<polyline points="20 10 14 10 14 4"/>' +
        '<line x1="14" y1="10" x2="21" y2="3"/>' +
        '<line x1="3" y1="21" x2="10" y2="14"/>' +
      '</svg>';

    function updateFullscreenBtn() {
      var isFS = !!document.fullscreenElement || player.classList.contains('fullscreen');
      fullscreenBtn.innerHTML = (isFS ? shrinkSVG : expandSVG) +
        '<span>' + (isFS ? '\uc804\uccb4\ud654\uba74 \ub098\uac00\uae30' : '\uc804\uccb4\ud654\uba74') + '</span>';
    }

    updateFullscreenBtn();

    document.addEventListener('fullscreenchange', updateFullscreenBtn);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && player.classList.contains('fullscreen')) {
        player.classList.remove('fullscreen');
        updateFullscreenBtn();
      }
    });
  }

  // ── Share toolbar ──────────────────────────────────────────────────

  function getShareData() {
    var ogTitle = document.querySelector('meta[property="og:title"]');
    var ogDesc = document.querySelector('meta[property="og:description"]');
    var ogImage = document.querySelector('meta[property="og:image"]');

    return {
      title: ogTitle ? ogTitle.content : document.title,
      description: ogDesc ? ogDesc.content : '',
      image: ogImage ? ogImage.content : '',
      url: window.location.href
    };
  }

  // Build share toolbar HTML
  var shareToolbar = document.createElement('div');
  shareToolbar.className = 'game-controls__share';

  var shareLabel = document.createElement('span');
  shareLabel.className = 'game-controls__share-label';
  shareLabel.textContent = '\uacf5\uc720\ud558\uae30';
  shareToolbar.appendChild(shareLabel);

  var btnContainer = document.createElement('div');
  btnContainer.className = 'game-controls__share-buttons';

  // Kakao button
  var kakaoBtn = document.createElement('button');
  kakaoBtn.type = 'button';
  kakaoBtn.className = 'game-controls__share-btn game-controls__share-btn--kakao';
  kakaoBtn.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">' +
      '<path d="M12 3C6.48 3 2 6.58 2 10.9c0 2.78 1.8 5.22 4.52 6.6-.2.74-.72 2.68-.82 3.1-.13.5.18.5.38.36.16-.1 2.46-1.67 3.46-2.35.48.07.96.1 1.46.1 5.52 0 10-3.58 10-7.9S17.52 3 12 3z"/>' +
    '</svg>' +
    '<span>\uce74\uce74\uc624\ud1a1</span>';
  btnContainer.appendChild(kakaoBtn);

  // Twitter button
  var twitterBtn = document.createElement('button');
  twitterBtn.type = 'button';
  twitterBtn.className = 'game-controls__share-btn game-controls__share-btn--twitter';
  twitterBtn.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">' +
      '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>' +
    '</svg>' +
    '<span>\ud2b8\uc704\ud130</span>';
  btnContainer.appendChild(twitterBtn);

  // Copy link button
  var copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'game-controls__share-btn game-controls__share-btn--copy';
  copyBtn.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>' +
      '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>' +
    '</svg>' +
    '<span>\ub9c1\ud06c \ubcf5\uc0ac</span>';
  btnContainer.appendChild(copyBtn);

  shareToolbar.appendChild(btnContainer);

  // Toast element
  var toast = document.createElement('div');
  toast.className = 'game-controls__toast';
  toast.textContent = '\ubcf5\uc0ac\ub428!';
  shareToolbar.appendChild(toast);

  // Insert after .game-player__info
  var infoSection = player.querySelector('.game-player__info');
  if (infoSection) {
    infoSection.parentNode.insertBefore(shareToolbar, infoSection.nextSibling);
  }

  // ── Share button handlers ──────────────────────────────────────────

  function showToast() {
    toast.classList.add('game-controls__toast--visible');
    setTimeout(function () {
      toast.classList.remove('game-controls__toast--visible');
    }, 2000);
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(showToast);
    } else {
      // Fallback
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast();
    }
  }

  // Kakao share
  kakaoBtn.addEventListener('click', function () {
    var data = getShareData();

    if (window.Kakao && window.Kakao.isInitialized && window.Kakao.isInitialized()) {
      var linkObj = {
        objectType: 'feed',
        content: {
          title: data.title,
          description: data.description,
          imageUrl: data.image,
          link: { mobileWebUrl: data.url, webUrl: data.url }
        },
        buttons: [
          { title: '\uac8c\uc784 \ud50c\ub808\uc774', link: { mobileWebUrl: data.url, webUrl: data.url } }
        ]
      };
      Kakao.Share.sendDefault(linkObj);
    } else {
      // Fallback: copy URL
      copyToClipboard(data.url);
    }
  });

  // Twitter share
  twitterBtn.addEventListener('click', function () {
    var data = getShareData();
    var text = encodeURIComponent(data.title + ' - ' + data.description);
    var url = encodeURIComponent(data.url);
    window.open(
      'https://twitter.com/intent/tweet?text=' + text + '&url=' + url,
      '_blank',
      'width=550,height=420'
    );
  });

  // Copy link
  copyBtn.addEventListener('click', function () {
    copyToClipboard(window.location.href);
  });
})();
