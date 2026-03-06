(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------
  const STYLES = `
    .upload-modal__overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      opacity: 0;
      transition: opacity 0.25s ease;
    }
    .upload-modal__overlay--visible {
      opacity: 1;
    }
    .upload-modal__dialog {
      position: relative;
      width: 95%;
      max-width: 520px;
      max-height: 90vh;
      overflow-y: auto;
      background: var(--bg-card, #1a1a2e);
      border: 1px solid var(--border-color, #27273a);
      border-radius: var(--radius, 12px);
      padding: 2rem;
      box-shadow: 0 0 40px rgba(124, 58, 237, 0.15);
    }
    .upload-modal__close {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      background: none;
      border: none;
      color: var(--text-muted, #71717a);
      font-size: 1.5rem;
      cursor: pointer;
      line-height: 1;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      transition: color 0.2s;
    }
    .upload-modal__close:hover,
    .upload-modal__close:focus-visible {
      color: var(--text-primary, #e4e4e7);
      outline: 2px solid var(--neon-purple, #7c3aed);
      outline-offset: 2px;
    }
    .upload-modal__title {
      margin: 0 0 1.5rem;
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--text-primary, #e4e4e7);
    }
    .upload-modal__field {
      margin-bottom: 1rem;
    }
    .upload-modal__label {
      display: block;
      margin-bottom: 0.35rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary, #a1a1aa);
    }
    .upload-modal__input {
      width: 100%;
      padding: 0.55rem 0.75rem;
      background: var(--bg-surface, #12121c);
      border: 1px solid var(--border-color, #27273a);
      border-radius: 8px;
      color: var(--text-primary, #e4e4e7);
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }
    .upload-modal__input:focus {
      border-color: var(--neon-purple, #7c3aed);
    }
    .upload-modal__textarea {
      resize: vertical;
      min-height: 70px;
    }
    .upload-modal__dropzone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      padding: 1.25rem 1rem;
      border: 2px dashed var(--border-color, #27273a);
      border-radius: 8px;
      background: var(--bg-surface, #12121c);
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
      text-align: center;
    }
    .upload-modal__dropzone:hover,
    .upload-modal__dropzone--dragover {
      border-color: var(--neon-purple, #7c3aed);
      background: rgba(124, 58, 237, 0.06);
    }
    .upload-modal__dropzone-icon {
      font-size: 1.6rem;
      color: var(--text-muted, #71717a);
    }
    .upload-modal__dropzone-text {
      font-size: 0.8rem;
      color: var(--text-muted, #71717a);
    }
    .upload-modal__dropzone-filename {
      font-size: 0.8rem;
      color: var(--neon-cyan, #06b6d4);
      word-break: break-all;
    }
    .upload-modal__progress-wrap {
      display: none;
      margin-bottom: 1rem;
    }
    .upload-modal__progress-wrap--visible {
      display: block;
    }
    .upload-modal__progress-bar {
      width: 100%;
      height: 8px;
      background: var(--bg-surface, #12121c);
      border-radius: 4px;
      overflow: hidden;
    }
    .upload-modal__progress-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, var(--neon-purple, #7c3aed), var(--neon-cyan, #06b6d4));
      border-radius: 4px;
      transition: width 0.2s ease;
    }
    .upload-modal__progress-text {
      font-size: 0.75rem;
      color: var(--text-muted, #71717a);
      margin-top: 0.3rem;
      text-align: right;
    }
    .upload-modal__error {
      display: none;
      padding: 0.6rem 0.75rem;
      margin-bottom: 1rem;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      color: #f87171;
      font-size: 0.85rem;
    }
    .upload-modal__error--visible {
      display: block;
    }
    .upload-modal__submit {
      width: 100%;
      padding: 0.65rem;
      border: none;
      border-radius: 8px;
      background: linear-gradient(135deg, var(--neon-purple, #7c3aed), var(--neon-cyan, #06b6d4));
      color: #fff;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .upload-modal__submit:hover {
      opacity: 0.9;
    }
    .upload-modal__submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .upload-modal__submit:focus-visible,
    .upload-modal__input:focus-visible,
    .upload-modal__dropzone:focus-visible {
      outline: 2px solid var(--neon-purple, #7c3aed);
      outline-offset: 2px;
    }
  `;

  // ---------------------------------------------------------------------------
  // Inject stylesheet
  // ---------------------------------------------------------------------------
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  let overlay = null;
  let gameFile = null;
  let thumbnailFile = null;
  let previouslyFocused = null;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function el(tag, className, attrs) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === 'textContent') {
          node.textContent = attrs[key];
        } else {
          node.setAttribute(key, attrs[key]);
        }
      });
    }
    return node;
  }

  function readCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  }

  function getCsrfToken() {
    return window.gamesideCsrfToken || readCookie('csrf_token');
  }

  // ---------------------------------------------------------------------------
  // Build modal DOM
  // ---------------------------------------------------------------------------
  function buildModal() {
    // Overlay
    overlay = el('div', 'upload-modal__overlay', {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Upload Game'
    });

    // Dialog
    const dialog = el('div', 'upload-modal__dialog');

    // Close button
    const closeBtn = el('button', 'upload-modal__close', {
      type: 'button',
      'aria-label': 'Close'
    });
    closeBtn.textContent = '\u00d7';
    closeBtn.addEventListener('click', closeModal);

    // Title
    const title = el('h2', 'upload-modal__title');
    title.textContent = 'Upload Game';

    // Error area
    const errorBox = el('div', 'upload-modal__error', { role: 'alert' });

    // --- Game file dropzone ---
    const gameField = el('div', 'upload-modal__field');
    const gameLabel = el('label', 'upload-modal__label');
    gameLabel.textContent = 'Game File (.zip / .html)';
    const gameDropzone = createDropzone(
      'game-file-input',
      '.zip,.html',
      function (file) { gameFile = file; },
      'Drop game file here or click to select'
    );
    gameField.appendChild(gameLabel);
    gameField.appendChild(gameDropzone.zone);

    // --- Thumbnail dropzone ---
    const thumbField = el('div', 'upload-modal__field');
    const thumbLabel = el('label', 'upload-modal__label');
    thumbLabel.textContent = 'Thumbnail (.png / .jpg)';
    const thumbDropzone = createDropzone(
      'thumb-file-input',
      '.png,.jpg,.jpeg',
      function (file) { thumbnailFile = file; },
      'Drop thumbnail here or click to select'
    );
    thumbField.appendChild(thumbLabel);
    thumbField.appendChild(thumbDropzone.zone);

    // --- Title input ---
    const titleField = el('div', 'upload-modal__field');
    const titleLabel = el('label', 'upload-modal__label', { for: 'upload-modal-title' });
    titleLabel.textContent = 'Title';
    const titleInput = el('input', 'upload-modal__input', {
      type: 'text',
      id: 'upload-modal-title',
      placeholder: 'Game title',
      required: 'true',
      autocomplete: 'off'
    });
    titleField.appendChild(titleLabel);
    titleField.appendChild(titleInput);

    // --- Description ---
    const descField = el('div', 'upload-modal__field');
    const descLabel = el('label', 'upload-modal__label', { for: 'upload-modal-desc' });
    descLabel.textContent = 'Description';
    const descInput = el('textarea', 'upload-modal__input upload-modal__textarea', {
      id: 'upload-modal-desc',
      placeholder: 'Short description',
      rows: '3'
    });
    descField.appendChild(descLabel);
    descField.appendChild(descInput);

    // --- Author ---
    const authorField = el('div', 'upload-modal__field');
    const authorLabel = el('label', 'upload-modal__label', { for: 'upload-modal-author' });
    authorLabel.textContent = 'Author';
    const authorInput = el('input', 'upload-modal__input', {
      type: 'text',
      id: 'upload-modal-author',
      placeholder: 'Your name',
      autocomplete: 'off'
    });
    authorField.appendChild(authorLabel);
    authorField.appendChild(authorInput);

    // --- Tags ---
    const tagsField = el('div', 'upload-modal__field');
    const tagsLabel = el('label', 'upload-modal__label', { for: 'upload-modal-tags' });
    tagsLabel.textContent = 'Tags (comma-separated)';
    const tagsInput = el('input', 'upload-modal__input', {
      type: 'text',
      id: 'upload-modal-tags',
      placeholder: 'action, puzzle, multiplayer',
      autocomplete: 'off'
    });
    tagsField.appendChild(tagsLabel);
    tagsField.appendChild(tagsInput);

    // --- Co-authors ---
    const coauthorsField = el('div', 'upload-modal__field upload-modal__coauthors');
    const coauthorsLabel = el('label', 'upload-modal__coauthors-label');
    coauthorsLabel.textContent = '\uACF5\uB3D9 \uAC1C\uBC1C\uC790';
    coauthorsField.appendChild(coauthorsLabel);

    var coauthorCheckboxes = [];

    fetch('/api/members', { credentials: 'include' })
      .then(function (res) { return res.ok ? res.json() : []; })
      .then(function (members) {
        var currentAuthor = authorInput.value.trim();
        members.forEach(function (member) {
          var name = member.name || '';
          if (!name) return;

          var option = el('label', 'upload-modal__coauthor-option');
          var checkbox = el('input', null, { type: 'checkbox', value: name });
          var text = document.createTextNode(' ' + name);
          option.appendChild(checkbox);
          option.appendChild(text);
          coauthorsField.appendChild(option);
          coauthorCheckboxes.push({ checkbox: checkbox, name: name });
        });

        // Hide checkboxes matching the current author
        authorInput.addEventListener('input', function () {
          var author = authorInput.value.trim();
          coauthorCheckboxes.forEach(function (item) {
            var hidden = item.name === author;
            item.checkbox.parentNode.style.display = hidden ? 'none' : '';
            if (hidden) item.checkbox.checked = false;
          });
        });
      })
      .catch(function () { /* ignore */ });

    // --- Dev Note ---
    const devNoteField = el('div', 'upload-modal__field');
    const devNoteLabel = el('label', 'upload-modal__label', { for: 'upload-modal-devnote' });
    devNoteLabel.textContent = '\uAC1C\uBC1C \uD6C4\uAE30 (\uB9C8\uD06C\uB2E4\uC6B4 \uC9C0\uC6D0)';
    const devNoteInput = el('textarea', 'upload-modal__input upload-modal__textarea upload-modal__devnote', {
      id: 'upload-modal-devnote',
      placeholder: '\uAC8C\uC784 \uAC1C\uBC1C \uACFC\uC815\uC774\uB098 \uD6C4\uAE30\uB97C \uC791\uC131\uD574\uBCF4\uC138\uC694...',
      rows: '4',
      maxLength: '5000'
    });
    devNoteField.appendChild(devNoteLabel);
    devNoteField.appendChild(devNoteInput);

    // --- Progress bar ---
    const progressWrap = el('div', 'upload-modal__progress-wrap');
    const progressBar = el('div', 'upload-modal__progress-bar');
    const progressFill = el('div', 'upload-modal__progress-fill');
    const progressText = el('div', 'upload-modal__progress-text');
    progressText.textContent = '0%';
    progressBar.appendChild(progressFill);
    progressWrap.appendChild(progressBar);
    progressWrap.appendChild(progressText);

    // --- Submit button ---
    const submitBtn = el('button', 'upload-modal__submit', { type: 'button' });
    submitBtn.textContent = 'Upload';

    // Assemble dialog
    dialog.appendChild(closeBtn);
    dialog.appendChild(title);
    dialog.appendChild(errorBox);
    dialog.appendChild(gameField);
    dialog.appendChild(thumbField);
    dialog.appendChild(titleField);
    dialog.appendChild(descField);
    dialog.appendChild(authorField);
    dialog.appendChild(tagsField);
    dialog.appendChild(coauthorsField);
    dialog.appendChild(devNoteField);
    dialog.appendChild(progressWrap);
    dialog.appendChild(submitBtn);

    overlay.appendChild(dialog);

    // --- Events ---

    // Click overlay to close
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });

    // ESC to close
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeModal();
        return;
      }
      // Focus trap
      if (e.key === 'Tab') {
        trapFocus(e, dialog);
      }
    });

    // Submit
    submitBtn.addEventListener('click', function () {
      // Validate
      if (!gameFile) {
        showError(errorBox, 'Game file is required.');
        return;
      }
      if (!titleInput.value.trim()) {
        showError(errorBox, 'Title is required.');
        return;
      }

      hideError(errorBox);
      submitBtn.disabled = true;
      progressWrap.classList.add('upload-modal__progress-wrap--visible');

      const formData = new FormData();
      formData.append('gameFile', gameFile);
      if (thumbnailFile) formData.append('thumbnail', thumbnailFile);
      formData.append('title', titleInput.value.trim());
      formData.append('description', descInput.value.trim());
      formData.append('author', authorInput.value.trim());
      formData.append('tags', tagsInput.value.trim());

      var selectedCoAuthors = [];
      coauthorCheckboxes.forEach(function (item) {
        if (item.checkbox.checked) {
          selectedCoAuthors.push(item.name);
        }
      });
      if (selectedCoAuthors.length > 0) {
        formData.append('coAuthors', JSON.stringify(selectedCoAuthors));
      }

      formData.append('devNote', devNoteInput.value.trim());

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', function (ev) {
        if (ev.lengthComputable) {
          const pct = Math.round((ev.loaded / ev.total) * 100);
          progressFill.style.width = pct + '%';
          progressText.textContent = pct + '%';
        }
      });

      xhr.addEventListener('load', function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          closeModal();
          window.location.reload();
          return;
        }
        submitBtn.disabled = false;
        progressWrap.classList.remove('upload-modal__progress-wrap--visible');
        progressFill.style.width = '0%';
        progressText.textContent = '0%';

        if (xhr.status === 401) {
          showError(errorBox, '\ub85c\uadf8\uc778 \ud544\uc694');
        } else if (xhr.status === 403) {
          showError(errorBox, 'Security check failed. Refresh and try again.');
        } else if (xhr.status === 413) {
          showError(errorBox, '\ud30c\uc77c \ud06c\uae30 \ucd08\uacfc');
        } else {
          let msg = 'Upload failed.';
          try {
            const body = JSON.parse(xhr.responseText);
            if (body && body.error) msg = body.error;
          } catch (_) { /* use default */ }
          showError(errorBox, msg);
        }
      });

      xhr.addEventListener('error', function () {
        submitBtn.disabled = false;
        progressWrap.classList.remove('upload-modal__progress-wrap--visible');
        progressFill.style.width = '0%';
        progressText.textContent = '0%';
        showError(errorBox, 'Network error. Please try again.');
      });

      xhr.open('POST', '/api/games');
      xhr.withCredentials = true;
      xhr.setRequestHeader('X-CSRF-Token', getCsrfToken());
      xhr.send(formData);
    });

    return overlay;
  }

  // ---------------------------------------------------------------------------
  // Dropzone factory
  // ---------------------------------------------------------------------------
  function createDropzone(inputId, accept, onFile, placeholderText) {
    const zone = el('div', 'upload-modal__dropzone', {
      tabindex: '0',
      role: 'button'
    });

    const icon = el('div', 'upload-modal__dropzone-icon');
    icon.textContent = '\u2191';

    const text = el('div', 'upload-modal__dropzone-text');
    text.textContent = placeholderText;

    const filenameDisplay = el('div', 'upload-modal__dropzone-filename');

    const hiddenInput = el('input', null, {
      type: 'file',
      id: inputId,
      accept: accept
    });
    hiddenInput.style.display = 'none';

    zone.appendChild(icon);
    zone.appendChild(text);
    zone.appendChild(filenameDisplay);
    zone.appendChild(hiddenInput);

    // Click to select
    zone.addEventListener('click', function () {
      hiddenInput.click();
    });

    // Keyboard activation
    zone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        hiddenInput.click();
      }
    });

    hiddenInput.addEventListener('change', function () {
      if (hiddenInput.files && hiddenInput.files[0]) {
        const file = hiddenInput.files[0];
        onFile(file);
        filenameDisplay.textContent = file.name;
      }
    });

    // Drag events
    zone.addEventListener('dragover', function (e) {
      e.preventDefault();
      zone.classList.add('upload-modal__dropzone--dragover');
    });

    zone.addEventListener('dragleave', function () {
      zone.classList.remove('upload-modal__dropzone--dragover');
    });

    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('upload-modal__dropzone--dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        onFile(file);
        filenameDisplay.textContent = file.name;
      }
    });

    return { zone: zone };
  }

  // ---------------------------------------------------------------------------
  // Error helpers
  // ---------------------------------------------------------------------------
  function showError(box, message) {
    box.textContent = message;
    box.classList.add('upload-modal__error--visible');
  }

  function hideError(box) {
    box.textContent = '';
    box.classList.remove('upload-modal__error--visible');
  }

  // ---------------------------------------------------------------------------
  // Focus trap
  // ---------------------------------------------------------------------------
  function trapFocus(e, container) {
    const focusable = container.querySelectorAll(
      'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Open / Close
  // ---------------------------------------------------------------------------
  function openModal() {
    if (overlay) return; // already open

    previouslyFocused = document.activeElement;
    gameFile = null;
    thumbnailFile = null;

    const node = buildModal();
    document.body.appendChild(node);

    // Trigger transition
    requestAnimationFrame(function () {
      overlay.classList.add('upload-modal__overlay--visible');
    });

    // Focus first focusable element (close button)
    const closeBtn = node.querySelector('.upload-modal__close');
    if (closeBtn) closeBtn.focus();
  }

  function closeModal() {
    if (!overlay) return;

    overlay.classList.remove('upload-modal__overlay--visible');

    overlay.addEventListener('transitionend', function handler() {
      overlay.removeEventListener('transitionend', handler);
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      overlay = null;
      gameFile = null;
      thumbnailFile = null;

      if (previouslyFocused && previouslyFocused.focus) {
        previouslyFocused.focus();
      }
      previouslyFocused = null;
    });
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  window.openUploadModal = openModal;
})();
