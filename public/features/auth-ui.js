/* ==========================================================================
   Auth UI – Google login/logout UI in the header
   ========================================================================== */
(function () {
  'use strict';

  // --- Inject styles ---
  const style = document.createElement('style');
  style.textContent = `
    .auth__container {
      position: absolute;
      top: 50%;
      right: 1.5rem;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      gap: 0.75rem;
      z-index: 10;
    }

    .auth__avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid var(--neon-purple);
      object-fit: cover;
      flex-shrink: 0;
    }

    .auth__username {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-primary);
      white-space: nowrap;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .auth__btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      font-family: var(--font-body);
      font-size: 0.85rem;
      font-weight: 500;
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      cursor: pointer;
      transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
      white-space: nowrap;
    }

    .auth__btn--google {
      background: var(--bg-card);
      color: var(--text-primary);
    }

    .auth__btn--google:hover {
      border-color: var(--neon-cyan);
      box-shadow: 0 0 12px rgba(6, 182, 212, 0.3);
    }

    .auth__btn--upload {
      background: var(--neon-purple);
      color: #fff;
      border-color: var(--neon-purple);
    }

    .auth__btn--upload:hover {
      box-shadow: 0 0 16px rgba(124, 58, 237, 0.5);
      background: #6d28d9;
    }

    .auth__btn--logout {
      background: transparent;
      color: var(--text-secondary);
      border-color: var(--border-color);
    }

    .auth__btn--logout:hover {
      border-color: #ef4444;
      color: #ef4444;
    }

    .auth__toast {
      position: fixed;
      top: 1rem;
      left: 50%;
      transform: translateX(-50%) translateY(-120%);
      padding: 0.75rem 1.5rem;
      border-radius: var(--radius);
      font-family: var(--font-body);
      font-size: 0.9rem;
      font-weight: 500;
      color: #fff;
      z-index: 20000;
      opacity: 0;
      transition: transform 0.3s ease, opacity 0.3s ease;
      pointer-events: none;
      max-width: 90vw;
      text-align: center;
    }

    .auth__toast--visible {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }

    .auth__toast--success {
      background: linear-gradient(135deg, var(--neon-purple), var(--neon-cyan));
    }

    .auth__toast--error {
      background: linear-gradient(135deg, #dc2626, #ef4444);
    }

    @media (max-width: 640px) {
      .auth__container {
        position: static;
        transform: none;
        justify-content: center;
        margin-top: 0.75rem;
        flex-wrap: wrap;
      }

      .auth__username {
        max-width: 100px;
      }
    }
  `;
  document.head.appendChild(style);

  // --- State ---
  let currentUser = null;
  window.gamesideCsrfToken = null;

  function readCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  }

  function getCsrfToken() {
    return window.gamesideCsrfToken || readCookie('csrf_token');
  }

  // --- DOM refs ---
  const header = document.querySelector('.header');
  const authContainer = document.createElement('div');
  authContainer.className = 'auth__container';
  if (header) {
    header.appendChild(authContainer);
  }

  // --- Toast notification ---
  function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = 'auth__toast auth__toast--' + type;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger reflow then show
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        toast.classList.add('auth__toast--visible');
      });
    });

    setTimeout(function () {
      toast.classList.remove('auth__toast--visible');
      setTimeout(function () {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3500);
  }

  // --- Render UI ---
  function render() {
    // Clear container
    while (authContainer.firstChild) {
      authContainer.removeChild(authContainer.firstChild);
    }

    if (currentUser) {
      // Profile picture
      if (currentUser.picture) {
        const avatar = document.createElement('img');
        avatar.className = 'auth__avatar';
        avatar.src = currentUser.picture;
        avatar.alt = 'Profile picture';
        avatar.referrerPolicy = 'no-referrer';
        authContainer.appendChild(avatar);
      }

      // Username
      const username = document.createElement('span');
      username.className = 'auth__username';
      username.textContent = currentUser.name || currentUser.email || 'User';
      authContainer.appendChild(username);

      // Upload Game button
      const uploadBtn = document.createElement('button');
      uploadBtn.className = 'auth__btn auth__btn--upload';
      uploadBtn.type = 'button';
      uploadBtn.textContent = 'Upload Game';
      uploadBtn.addEventListener('click', function () {
        if (typeof window.openUploadModal === 'function') {
          window.openUploadModal();
        }
      });
      authContainer.appendChild(uploadBtn);

      // Logout button
      const logoutBtn = document.createElement('button');
      logoutBtn.className = 'auth__btn auth__btn--logout';
      logoutBtn.type = 'button';
      logoutBtn.textContent = 'Logout';
      logoutBtn.addEventListener('click', handleLogout);
      authContainer.appendChild(logoutBtn);
    } else {
      // Sign in button
      const signInBtn = document.createElement('button');
      signInBtn.className = 'auth__btn auth__btn--google';
      signInBtn.type = 'button';
      signInBtn.textContent = 'Sign in with Google';
      signInBtn.addEventListener('click', function () {
        window.location.href = '/auth/google';
      });
      authContainer.appendChild(signInBtn);
    }
  }

  // --- Check auth status ---
  function checkAuth() {
    fetch('/auth/me', { credentials: 'include' })
      .then(function (res) {
        if (res.ok) return res.json();
        currentUser = null;
        window.gamesideCsrfToken = null;
        render();
        return null;
      })
      .then(function (data) {
        if (data && data.user) {
          currentUser = data.user;
          window.gamesideCsrfToken = data.csrfToken || getCsrfToken() || null;
          render();
        }
      })
      .catch(function () {
        currentUser = null;
        window.gamesideCsrfToken = null;
        render();
      });
  }

  // --- Logout ---
  function handleLogout() {
    fetch('/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRF-Token': getCsrfToken() }
    })
      .then(function (res) {
        if (!res.ok) {
          throw new Error('Logout failed');
        }
        currentUser = null;
        window.gamesideCsrfToken = null;
        render();
        showToast('Logged out successfully', 'success');
      })
      .catch(function () {
        showToast('Logout failed. Please try again.', 'error');
      });
  }

  // --- Handle URL query params ---
  function handleLoginParams() {
    const params = new URLSearchParams(window.location.search);
    const login = params.get('login');

    if (login === 'success') {
      showToast('Welcome! You are now signed in.', 'success');
    } else if (login === 'failed') {
      showToast('Login failed. Please try again.', 'error');
    } else if (login === 'csrf_error') {
      showToast('Security error (CSRF). Please try signing in again.', 'error');
    }

    if (login) {
      // Clean URL without reloading
      const url = new URL(window.location.href);
      url.searchParams.delete('login');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
  }

  // --- Init ---
  handleLoginParams();
  checkAuth();
})();
