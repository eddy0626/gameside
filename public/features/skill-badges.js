/**
 * skill-badges.js
 * Enhances .portfolio__skill-tag elements with icons and colors.
 * Does NOT modify portfolio-page.js — uses MutationObserver to detect tags.
 */
(function () {
  'use strict';

  function svgIcon(inner) {
    return `<svg class="skill-badge__icon" viewBox="0 0 14 14" width="14" height="14" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  }

  function textIcon(letters, bg, fg) {
    return svgIcon(
      `<rect width="14" height="14" rx="3" fill="${bg}"/>` +
      `<text x="7" y="10.5" text-anchor="middle" font-size="7.5" font-weight="700" fill="${fg}" font-family="Inter,system-ui,sans-serif">${letters}</text>`
    );
  }

  const SKILL_MAP = {
    unity:       { label: 'Unity',      color: '#7c3aed', textColor: '#fff', icon: textIcon('U', '#7c3aed', '#fff') },
    unreal:      { label: 'Unreal',     color: '#0e1128', textColor: '#fff', icon: textIcon('UE', '#0e1128', '#fff') },
    godot:       { label: 'Godot',      color: '#478cbf', textColor: '#fff', icon: textIcon('G', '#478cbf', '#fff') },
    'c#':        { label: 'C#',         color: '#68217a', textColor: '#fff', icon: textIcon('C#', '#68217a', '#fff') },
    csharp:      { label: 'C#',         color: '#68217a', textColor: '#fff', icon: textIcon('C#', '#68217a', '#fff') },
    python:      { label: 'Python',     color: '#3776ab', textColor: '#fff', icon: textIcon('Py', '#3776ab', '#fff') },
    javascript:  { label: 'JavaScript', color: '#f7df1e', textColor: '#1a1a2e', icon: textIcon('JS', '#f7df1e', '#1a1a2e') },
    js:          { label: 'JS',         color: '#f7df1e', textColor: '#1a1a2e', icon: textIcon('JS', '#f7df1e', '#1a1a2e') },
    typescript:  { label: 'TypeScript', color: '#3178c6', textColor: '#fff', icon: textIcon('TS', '#3178c6', '#fff') },
    ts:          { label: 'TS',         color: '#3178c6', textColor: '#fff', icon: textIcon('TS', '#3178c6', '#fff') },
    react:       { label: 'React',      color: '#61dafb', textColor: '#1a1a2e', icon: textIcon('Re', '#61dafb', '#1a1a2e') },
    blender:     { label: 'Blender',    color: '#e87d0d', textColor: '#fff', icon: textIcon('Bl', '#e87d0d', '#fff') },
    photoshop:   { label: 'Photoshop',  color: '#31a8ff', textColor: '#fff', icon: textIcon('Ps', '#31a8ff', '#fff') },
    figma:       { label: 'Figma',      color: '#a259ff', textColor: '#fff', icon: textIcon('Fi', '#a259ff', '#fff') },
    git:         { label: 'Git',        color: '#f05032', textColor: '#fff', icon: textIcon('Gt', '#f05032', '#fff') },
    html:        { label: 'HTML',       color: '#e34f26', textColor: '#fff', icon: textIcon('H', '#e34f26', '#fff') },
    css:         { label: 'CSS',        color: '#1572b6', textColor: '#fff', icon: textIcon('C', '#1572b6', '#fff') },
    'c++':       { label: 'C++',        color: '#00599c', textColor: '#fff', icon: textIcon('C+', '#00599c', '#fff') },
    cpp:         { label: 'C++',        color: '#00599c', textColor: '#fff', icon: textIcon('C+', '#00599c', '#fff') },
    java:        { label: 'Java',       color: '#007396', textColor: '#fff', icon: textIcon('Ja', '#007396', '#fff') },
  };

  function enhanceTag(el) {
    if (el.classList.contains('skill-badge--enhanced')) return;

    var raw = el.textContent.trim().toLowerCase();
    var skill = SKILL_MAP[raw];
    if (!skill) return;

    el.classList.add('skill-badge--enhanced');
    el.innerHTML = skill.icon + '<span>' + el.textContent.trim() + '</span>';
    el.style.borderColor = skill.color;
    el.style.color = skill.textColor;
    el.style.setProperty('--badge-glow-color', skill.color);
  }

  function enhanceAll(root) {
    var tags = root.querySelectorAll('.portfolio__skill-tag');
    tags.forEach(enhanceTag);
  }

  var container = document.getElementById('portfolio-skills');
  if (!container) return;

  // Enhance any tags already present
  enhanceAll(container);

  // Watch for dynamically added tags
  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      m.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        if (node.classList && node.classList.contains('portfolio__skill-tag')) {
          enhanceTag(node);
        }
        if (node.querySelectorAll) {
          enhanceAll(node);
        }
      });
    });
  });

  observer.observe(container, { childList: true, subtree: true });
})();
