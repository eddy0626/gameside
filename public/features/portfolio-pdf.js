/* portfolio-pdf.js – PDF export for portfolio page */
(function () {
  'use strict';

  var portfolio = document.getElementById('portfolio');
  if (!portfolio) return;

  /* ── Dynamic script loader ─────────────────────── */
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (window.html2pdf) { resolve(); return; }
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  /* ── Create PDF button ─────────────────────────── */
  var pdfBtn = document.createElement('button');
  pdfBtn.className = 'portfolio-pdf__btn';
  pdfBtn.textContent = 'PDF \uc800\uc7a5';
  pdfBtn.type = 'button';

  var profileSection = document.querySelector('.portfolio__profile');
  if (profileSection) {
    profileSection.appendChild(pdfBtn);
  }

  /* ── PDF generation ────────────────────────────── */
  pdfBtn.addEventListener('click', async function () {
    pdfBtn.disabled = true;
    pdfBtn.textContent = '\uc0dd\uc131 \uc911...';

    try {
      await loadScript(
        'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js'
      );

      var element = document.getElementById('portfolio');

      /* Hide non-printable elements */
      var hideSelectors = [
        '.portfolio__edit-btn',
        '.portfolio-theme',
        '.cmdk-overlay',
        '.header__back-link',
        '.footer',
        '.portfolio-pdf__btn',
        '.portfolio__edit-form'
      ];
      var hiddenEls = [];
      hideSelectors.forEach(function (sel) {
        document.querySelectorAll(sel).forEach(function (el) {
          hiddenEls.push({ el: el, display: el.style.display });
          el.style.display = 'none';
        });
      });

      /* Add print-optimized class */
      element.classList.add('portfolio--print');

      /* Derive filename from member name */
      var nameEl = document.getElementById('portfolio-name');
      var memberName = nameEl ? nameEl.textContent.trim() : 'portfolio';

      var bgColor =
        getComputedStyle(document.documentElement)
          .getPropertyValue('--bg-primary')
          .trim() || '#0a0a0f';

      var opt = {
        margin: [10, 10, 10, 10],
        filename: memberName + '-portfolio.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: bgColor },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();

      /* Restore hidden elements */
      element.classList.remove('portfolio--print');
      hiddenEls.forEach(function (item) {
        item.el.style.display = item.display;
      });
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('PDF \uc0dd\uc131\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.');
    }

    pdfBtn.disabled = false;
    pdfBtn.textContent = 'PDF \uc800\uc7a5';
  });
})();
