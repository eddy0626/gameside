(function () {
  'use strict';

  var isIndex = !!document.getElementById('game-container');
  var isAbout = !!document.getElementById('about');
  if (!isIndex && !isAbout) return;

  var ICONS = {
    game_uploaded: { text: '\u2B06', cls: 'activity-feed__icon--upload' },
    rating_added: { text: '\u2605', cls: 'activity-feed__icon--rating' },
    comment_added: { text: '\uD83D\uDCAC', cls: 'activity-feed__icon--comment' },
    gamejam_created: { text: '\uD83C\uDFC6', cls: 'activity-feed__icon--gamejam' },
    gamejam_entry: { text: '\uD83C\uDFC6', cls: 'activity-feed__icon--gamejam' }
  };

  function formatActivity(activity) {
    switch (activity.type) {
      case 'game_uploaded':
        return activity.actor.name + '\uB2D8\uC774 "' + activity.details.gameTitle + '" \uAC8C\uC784\uC744 \uC5C5\uB85C\uB4DC\uD588\uC2B5\uB2C8\uB2E4';
      case 'rating_added':
        return activity.actor.name + '\uB2D8\uC774 "' + activity.details.gameTitle + '"\uC5D0 ' + activity.details.rating + '\uC810\uC744 \uB0A8\uACBC\uC2B5\uB2C8\uB2E4';
      case 'comment_added':
        return activity.actor.name + '\uB2D8\uC774 "' + activity.details.gameTitle + '"\uC5D0 \uB313\uAE00\uC744 \uB0A8\uACBC\uC2B5\uB2C8\uB2E4';
      case 'gamejam_created':
        return activity.actor.name + '\uB2D8\uC774 "' + activity.details.jamTitle + '" \uAC8C\uC784\uC7BC\uC744 \uB9CC\uB4E4\uC5C8\uC2B5\uB2C8\uB2E4';
      case 'gamejam_entry':
        return activity.actor.name + '\uB2D8\uC774 "' + activity.details.jamTitle + '"\uC5D0 "' + activity.details.gameTitle + '"\uB85C \uCC38\uAC00\uD588\uC2B5\uB2C8\uB2E4';
      default:
        return activity.actor.name + '\uB2D8\uC758 \uD65C\uB3D9';
    }
  }

  function relativeTime(timestamp) {
    var now = Date.now();
    var diff = now - new Date(timestamp).getTime();
    var seconds = Math.floor(diff / 1000);
    if (seconds < 60) return '\uBC29\uAE08';
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + '\uBD84 \uC804';
    var hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + '\uC2DC\uAC04 \uC804';
    var days = Math.floor(hours / 24);
    if (days < 30) return days + '\uC77C \uC804';
    var months = Math.floor(days / 30);
    return months + '\uAC1C\uC6D4 \uC804';
  }

  function createItem(activity) {
    var item = document.createElement('div');
    item.className = 'activity-feed__item';

    var iconInfo = ICONS[activity.type] || ICONS.game_uploaded;
    var icon = document.createElement('div');
    icon.className = 'activity-feed__icon ' + iconInfo.cls;
    icon.textContent = iconInfo.text;

    var text = document.createElement('div');
    text.className = 'activity-feed__text';
    text.textContent = formatActivity(activity);

    var time = document.createElement('div');
    time.className = 'activity-feed__time';
    time.textContent = relativeTime(activity.timestamp);

    item.appendChild(icon);
    item.appendChild(text);
    item.appendChild(time);
    return item;
  }

  function renderFeed(activities, container) {
    var section = document.createElement('section');
    section.className = 'activity-feed';
    section.id = 'activity-feed';

    var title = document.createElement('h3');
    title.className = 'activity-feed__title';
    title.textContent = '\uCD5C\uADFC \uD65C\uB3D9';
    section.appendChild(title);

    var list = document.createElement('div');
    list.className = 'activity-feed__list';

    if (activities.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'activity-feed__empty';
      empty.textContent = '\uC544\uC9C1 \uD65C\uB3D9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4';
      list.appendChild(empty);
    } else {
      for (var i = 0; i < activities.length; i++) {
        list.appendChild(createItem(activities[i]));
      }
    }

    section.appendChild(list);
    container.appendChild(section);
  }

  function init() {
    fetch('/api/activity?limit=10')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var activities = data.activities || [];

        if (isIndex) {
          var main = document.querySelector('main');
          if (main) {
            var gameContainer = document.getElementById('game-container');
            if (gameContainer && gameContainer.nextSibling) {
              var wrapper = document.createElement('div');
              renderFeed(activities, wrapper);
              main.insertBefore(wrapper.firstChild, gameContainer.nextSibling);
            } else if (main) {
              renderFeed(activities, main);
            }
          }
        }

        if (isAbout) {
          var aboutSection = document.getElementById('about');
          if (aboutSection) {
            renderFeed(activities, aboutSection);
          }
        }
      })
      .catch(function (err) {
        console.error('Failed to load activity feed:', err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
