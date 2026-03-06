(function () {
  'use strict';

  const membersGrid = document.getElementById('about-members');
  const gameCountEl = document.getElementById('about-game-count');
  const memberCountEl = document.getElementById('about-member-count');

  if (!membersGrid) return;

  function getInitials(name) {
    return name ? name.charAt(0) : '?';
  }

  function renderMemberCard(member) {
    const card = document.createElement('a');
    card.className = 'about__member-card';
    card.href = 'portfolio.html?name=' + encodeURIComponent(member.name);

    // Avatar
    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'about__member-avatar';
    if (member.avatar) {
      const img = document.createElement('img');
      img.className = 'about__member-avatar-img';
      img.src = member.avatar;
      img.alt = member.name;
      avatarWrap.appendChild(img);
    } else {
      const initials = document.createElement('span');
      initials.className = 'about__member-avatar-initials';
      initials.textContent = getInitials(member.name);
      avatarWrap.appendChild(initials);
    }
    card.appendChild(avatarWrap);

    // Name
    const nameEl = document.createElement('h3');
    nameEl.className = 'about__member-name';
    nameEl.textContent = member.name;
    card.appendChild(nameEl);

    // Role
    if (member.role) {
      const roleEl = document.createElement('span');
      roleEl.className = 'about__member-role';
      roleEl.textContent = member.role;
      card.appendChild(roleEl);
    }

    // Bio
    if (member.bio) {
      const bioEl = document.createElement('p');
      bioEl.className = 'about__member-bio';
      bioEl.textContent = member.bio;
      card.appendChild(bioEl);
    }

    // Link text
    const linkEl = document.createElement('span');
    linkEl.className = 'about__member-link';
    linkEl.textContent = '포트폴리오 보기 →';
    card.appendChild(linkEl);

    return card;
  }

  async function init() {
    try {
      const [membersRes, gamesRes] = await Promise.all([
        fetch('/api/members'),
        fetch('/api/games')
      ]);

      const membersData = await membersRes.json();
      const members = membersData.members || [];

      let gameCount = 0;
      try {
        const gamesData = await gamesRes.json();
        gameCount = Array.isArray(gamesData) ? gamesData.length : 0;
      } catch (_) {
        gameCount = 0;
      }

      memberCountEl.textContent = members.length;
      gameCountEl.textContent = gameCount;

      members.forEach(function (member) {
        membersGrid.appendChild(renderMemberCard(member));
      });
    } catch (err) {
      membersGrid.innerHTML = '<p class="error-message">팀원 정보를 불러올 수 없습니다.</p>';
    }
  }

  init();
})();
