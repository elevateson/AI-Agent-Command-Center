'use strict';

/**
 * app.js — Main app initialization, routing, tabs
 */

var App = (function() {
  var currentTab = 'dashboard';
  var tabs = ['dashboard', 'board', 'projects', 'calendar', 'settings'];

  function init() {
    DataStore.init();
    Board.init();
    Projects.init();

    // Tab navigation (desktop)
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        switchTab(this.dataset.tab);
      });
    });

    // Mobile bottom nav
    document.querySelectorAll('.mobile-nav-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        switchTab(this.dataset.tab);
      });
    });

    // Modal close buttons
    document.querySelectorAll('[data-close]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        Utils.closeModal(this.dataset.close);
      });
    });

    // Close modals on backdrop click
    document.querySelectorAll('.modal').forEach(function(modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) Utils.closeModal(modal.id);
      });
    });

    // Escape key closes modals
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal.open').forEach(function(m) {
          Utils.closeModal(m.id);
        });
      }
    });

    // Render initial tab
    switchTab('dashboard');
  }

  function switchTab(tab) {
    if (tabs.indexOf(tab) < 0) return;
    currentTab = tab;

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.mobile-nav-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Show/hide tab content
    document.querySelectorAll('.tab-content').forEach(function(tc) {
      tc.classList.toggle('active', tc.id === tab + '-tab');
    });

    // Render the active tab
    switch(tab) {
      case 'dashboard': Dashboard.render(); break;
      case 'board': Board.render(); break;
      case 'projects': Projects.render(); break;
      case 'calendar': Calendar.render(); break;
      case 'settings': Settings.render(); break;
    }
  }

  return { init: init, switchTab: switchTab };
})();

// Boot
document.addEventListener('DOMContentLoaded', App.init);
