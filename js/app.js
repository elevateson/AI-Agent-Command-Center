'use strict';

/**
 * app.js — Main app: routing, search, keyboard shortcuts, theme toggle, quick add
 */

var App = (function() {
  var currentTab = 'dashboard';
  var tabs = ['dashboard', 'board', 'projects', 'calendar', 'settings'];

  function init() {
    DataStore.init();
    Board.init();
    Projects.init();

    // Apply saved theme
    var settings = DataStore.getSettings();
    applyTheme(settings.theme || 'dark');

    // Tab navigation (desktop)
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { switchTab(this.dataset.tab); });
    });

    // Mobile bottom nav
    document.querySelectorAll('.mobile-nav-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { switchTab(this.dataset.tab); });
    });

    // Modal close buttons
    document.querySelectorAll('[data-close]').forEach(function(btn) {
      btn.addEventListener('click', function() { Utils.closeModal(this.dataset.close); });
    });

    // Close modals on backdrop click
    document.querySelectorAll('.modal').forEach(function(modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) Utils.closeModal(modal.id);
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
      // Escape closes modals
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal.open').forEach(function(m) {
          Utils.closeModal(m.id);
        });
        closeSearch();
        return;
      }

      // Don't trigger shortcuts when typing in inputs
      var isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT';

      // Cmd/Ctrl+K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        var searchInput = document.getElementById('global-search');
        if (searchInput) searchInput.focus();
        return;
      }

      // N for quick add (only when not in input)
      if (e.key === 'n' && !isInput && !document.querySelector('.modal.open')) {
        e.preventDefault();
        openQuickAdd();
        return;
      }
    });

    // Search functionality
    initSearch();

    // Quick add modal
    initQuickAdd();

    // Theme toggle button
    var themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', function() {
        var current = DataStore.getSettings().theme || 'dark';
        setTheme(current === 'dark' ? 'light' : 'dark');
      });
    }

    // Notification bell
    initNotifications();

    // Listen for new notifications
    DataStore.on('notificationAdded', function() { updateNotifBadge(); });
    DataStore.on('dataChanged', function() { updateNotifBadge(); });

    // Render initial tab
    switchTab('dashboard');
  }

  // ==================== NOTIFICATIONS ====================

  var currentUser = 'kris'; // Default perspective

  function initNotifications() {
    var bell = document.getElementById('notif-bell');
    var panel = document.getElementById('notif-panel');
    var markAll = document.getElementById('notif-mark-all');

    if (bell) {
      bell.addEventListener('click', function(e) {
        e.stopPropagation();
        var isOpen = panel.style.display !== 'none';
        panel.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) renderNotifList();
      });
    }

    if (markAll) {
      markAll.addEventListener('click', function() {
        DataStore.markAllNotificationsRead(currentUser);
        renderNotifList();
        updateNotifBadge();
      });
    }

    // Close panel when clicking outside
    document.addEventListener('click', function(e) {
      if (panel && !panel.contains(e.target) && e.target !== bell) {
        panel.style.display = 'none';
      }
    });

    updateNotifBadge();
  }

  function updateNotifBadge() {
    var badge = document.getElementById('notif-badge');
    if (!badge) return;
    var count = DataStore.getUnreadCount(currentUser);
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  function renderNotifList() {
    var list = document.getElementById('notif-list');
    if (!list) return;
    var notifs = DataStore.getNotifications(currentUser);
    if (notifs.length === 0) {
      list.innerHTML = '';
      var empty = document.createElement('div');
      empty.className = 'notif-empty';
      empty.textContent = 'No notifications yet. Use @kris, @taylor, or @nyx in comments to tag someone.';
      list.appendChild(empty);
      return;
    }
    list.innerHTML = '';
    notifs.slice(0, 30).forEach(function(n) {
      var item = document.createElement('div');
      item.className = 'notif-item' + (n.read ? '' : ' unread');
      
      var from = document.createElement('div');
      from.className = 'notif-from';
      var sender = Utils.getAssignee(n.from);
      from.textContent = sender.emoji + ' ' + sender.name + ' mentioned you';
      item.appendChild(from);

      if (n.taskTitle) {
        var taskName = document.createElement('div');
        taskName.className = 'notif-task-name';
        taskName.textContent = '📋 ' + n.taskTitle;
        item.appendChild(taskName);
      }

      var text = document.createElement('div');
      text.className = 'notif-text';
      text.textContent = n.text.length > 80 ? n.text.substring(0, 80) + '...' : n.text;
      item.appendChild(text);

      var time = document.createElement('div');
      time.className = 'notif-time';
      time.textContent = Utils.timeAgo(n.timestamp);
      item.appendChild(time);

      item.addEventListener('click', function() {
        DataStore.markNotificationRead(n.id);
        updateNotifBadge();
        if (n.taskId) {
          // Switch to board and open task
          switchTab('board');
          setTimeout(function() { Board.openTask(n.taskId); }, 100);
        }
        document.getElementById('notif-panel').style.display = 'none';
      });

      list.appendChild(item);
    });
  }

  // ==================== TAB SWITCHING ====================

  function switchTab(tab) {
    if (tabs.indexOf(tab) < 0) return;
    currentTab = tab;

    document.querySelectorAll('.tab-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.mobile-nav-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.tab-content').forEach(function(tc) {
      tc.classList.toggle('active', tc.id === tab + '-tab');
    });

    switch(tab) {
      case 'dashboard': Dashboard.render(); break;
      case 'board': Board.render(); break;
      case 'projects': Projects.render(); break;
      case 'calendar': Calendar.render(); break;
      case 'settings': Settings.render(); break;
    }
  }

  // ==================== THEME ====================

  function setTheme(theme) {
    applyTheme(theme);
    DataStore.updateSettings({ theme: theme });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
    // Update meta theme-color
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#0f0f1a' : '#f5f5f5');
    }
  }

  // ==================== SEARCH ====================

  function initSearch() {
    var searchInput = document.getElementById('global-search');
    var searchResults = document.getElementById('search-results');
    if (!searchInput || !searchResults) return;

    var doSearch = Utils.debounce(function() {
      var query = searchInput.value.trim();
      if (query.length < 2) {
        closeSearch();
        return;
      }

      var results = DataStore.searchAll(query);
      searchResults.innerHTML = '';

      if (results.length === 0) {
        searchResults.appendChild(Utils.el('div', { className: 'search-no-results' }, 'No results for "' + Utils.sanitize(query) + '"'));
      } else {
        results.forEach(function(r) {
          var item = Utils.el('div', { className: 'search-result-item' });
          if (r.type === 'task') {
            var proj = DataStore.getProject(r.item.projectId);
            item.appendChild(Utils.el('span', { className: 'search-result-type' }, '📋 Task'));
            item.appendChild(Utils.el('span', { className: 'search-result-title' }, r.item.title));
            if (proj) {
              item.appendChild(Utils.el('span', { className: 'search-result-meta', style: { color: proj.color } }, proj.name));
            }
            item.addEventListener('click', function() {
              closeSearch();
              searchInput.value = '';
              switchTab('board');
            });
          } else if (r.type === 'project') {
            item.appendChild(Utils.el('span', { className: 'search-result-type' }, '📁 Project'));
            item.appendChild(Utils.el('span', { className: 'search-result-title' }, r.item.name));
            item.addEventListener('click', function() {
              closeSearch();
              searchInput.value = '';
              switchTab('projects');
              setTimeout(function() { Projects.showDetail(r.item.id); }, 100);
            });
          }
          searchResults.appendChild(item);
        });
      }
      searchResults.classList.add('open');
    }, 200);

    searchInput.addEventListener('input', doSearch);
    searchInput.addEventListener('focus', function() {
      if (searchInput.value.trim().length >= 2) doSearch();
    });

    // Close search on click outside
    document.addEventListener('click', function(e) {
      if (!e.target.closest('#search-wrapper')) {
        closeSearch();
      }
    });
  }

  function closeSearch() {
    var searchResults = document.getElementById('search-results');
    if (searchResults) searchResults.classList.remove('open');
  }

  // ==================== QUICK ADD ====================

  function initQuickAdd() {
    var saveBtn = document.getElementById('qa-save-btn');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', function() {
      var title = document.getElementById('qa-title').value.trim();
      if (!title) { Utils.toast('Title is required', 'warning'); return; }

      DataStore.createTask({
        title: title,
        projectId: document.getElementById('qa-project').value,
        assignee: document.getElementById('qa-assignee').value,
        priority: document.getElementById('qa-priority').value,
        status: document.getElementById('qa-status').value
      });

      Utils.closeModal('quick-add-modal');
      Utils.toast('Task created! ⚡', 'success');

      // Refresh current tab
      switchTab(currentTab);
    });

    // Template selection auto-fills
    var tmplSelect = document.getElementById('qa-template');
    if (tmplSelect) {
      tmplSelect.addEventListener('change', function() {
        var tmplId = this.value;
        if (!tmplId) return;
        var templates = DataStore.getTemplates();
        var tmpl = templates.find(function(t) { return t.id === tmplId; });
        if (!tmpl) return;
        if (tmpl.projectId) document.getElementById('qa-project').value = tmpl.projectId;
        if (tmpl.assignee) document.getElementById('qa-assignee').value = tmpl.assignee;
        if (tmpl.priority) document.getElementById('qa-priority').value = tmpl.priority;
      });
    }

    // Enter key in title field
    var qaTitle = document.getElementById('qa-title');
    if (qaTitle) {
      qaTitle.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') saveBtn.click();
      });
    }
  }

  function openQuickAdd() {
    // Populate project dropdown
    var projSelect = document.getElementById('qa-project');
    if (projSelect) {
      projSelect.innerHTML = '';
      projSelect.appendChild(Utils.el('option', { value: '' }, '— None —'));
      DataStore.getProjects().forEach(function(p) {
        projSelect.appendChild(Utils.el('option', { value: p.id }, p.name));
      });
    }

    // Populate template dropdown
    var tmplSelect = document.getElementById('qa-template');
    if (tmplSelect) {
      tmplSelect.innerHTML = '';
      tmplSelect.appendChild(Utils.el('option', { value: '' }, '— No Template —'));
      DataStore.getTemplates().forEach(function(t) {
        tmplSelect.appendChild(Utils.el('option', { value: t.id }, t.name));
      });
    }

    // Reset form
    document.getElementById('qa-title').value = '';
    document.getElementById('qa-assignee').value = '';
    document.getElementById('qa-priority').value = 'medium';
    document.getElementById('qa-status').value = 'todo';

    Utils.openModal('quick-add-modal');
    setTimeout(function() {
      document.getElementById('qa-title').focus();
    }, 100);
  }

  return {
    init: init,
    switchTab: switchTab,
    setTheme: setTheme,
    openQuickAdd: openQuickAdd
  };
})();

// Boot
document.addEventListener('DOMContentLoaded', App.init);
