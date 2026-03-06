(function () {
    'use strict';

    var portfolio = document.getElementById('portfolio');
    if (!portfolio) return;

    var STORAGE_KEY = 'portfolio-theme';
    var THEMES = ['dark-neon', 'light', 'cyberpunk'];
    var LABELS = { 'dark-neon': 'Dark', 'light': 'Light', 'cyberpunk': 'Cyber' };
    var TITLES = { 'dark-neon': '다크 네온', 'light': '라이트', 'cyberpunk': '사이버펑크' };

    function getTheme() {
        var saved = localStorage.getItem(STORAGE_KEY);
        return THEMES.indexOf(saved) !== -1 ? saved : 'dark-neon';
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(STORAGE_KEY, theme);
    }

    function updateButtons(container, active) {
        var buttons = container.querySelectorAll('.portfolio-theme__btn');
        for (var i = 0; i < buttons.length; i++) {
            var btn = buttons[i];
            if (btn.getAttribute('data-theme') === active) {
                btn.classList.add('portfolio-theme__btn--active');
            } else {
                btn.classList.remove('portfolio-theme__btn--active');
            }
        }
    }

    function buildToggle() {
        var wrapper = document.createElement('div');
        wrapper.className = 'portfolio-theme';
        wrapper.id = 'portfolio-theme-toggle';

        THEMES.forEach(function (theme) {
            var btn = document.createElement('button');
            btn.className = 'portfolio-theme__btn';
            btn.setAttribute('data-theme', theme);
            btn.setAttribute('title', TITLES[theme]);
            btn.textContent = LABELS[theme];
            wrapper.appendChild(btn);
        });

        wrapper.addEventListener('click', function (e) {
            var btn = e.target.closest('.portfolio-theme__btn');
            if (!btn) return;
            var theme = btn.getAttribute('data-theme');
            applyTheme(theme);
            updateButtons(wrapper, theme);
        });

        return wrapper;
    }

    var current = getTheme();
    applyTheme(current);

    var toggle = buildToggle();
    updateButtons(toggle, current);

    var header = document.querySelector('.header');
    if (header) {
        header.appendChild(toggle);
    } else {
        portfolio.insertBefore(toggle, portfolio.firstChild);
    }
})();
