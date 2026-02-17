'use strict';

/**
 * utils.js — Sanitization, formatting, helpers, chart renderers
 * Zero external dependencies. All pure functions.
 */

var Utils = {
  /**
   * Sanitize string for safe DOM insertion (prevent XSS)
   */
  sanitize: function(str) {
    if (typeof str !== 'string') return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Sanitize URL - only allow http/https
   */
  sanitizeUrl: function(url) {
    if (typeof url !== 'string') return '';
    url = url.trim();
    if (url.match(/^https?:\/\//i)) return url;
    if (url.match(/^[a-zA-Z0-9]/)) return 'https://' + url;
    return '';
  },

  /**
   * Generate a unique ID with prefix
   */
  generateId: function(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  /**
   * Format ISO date to human-readable
   */
  formatDate: function(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  },

  /**
   * Format ISO date to relative time (e.g., "2 hours ago")
   */
  timeAgo: function(iso) {
    if (!iso) return '';
    var now = Date.now();
    var then = new Date(iso).getTime();
    var diff = now - then;
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    var days = Math.floor(hrs / 24);
    if (days < 7) return days + 'd ago';
    return Utils.formatDate(iso);
  },

  /**
   * Format milliseconds to human-readable duration
   */
  formatDuration: function(ms) {
    if (!ms || ms <= 0) return '0m';
    var secs = Math.floor(ms / 1000);
    var mins = Math.floor(secs / 60);
    var hrs = Math.floor(mins / 60);
    mins = mins % 60;
    secs = secs % 60;
    if (hrs > 0) return hrs + 'h ' + mins + 'm';
    if (mins > 0) return mins + 'm ' + secs + 's';
    return secs + 's';
  },

  /**
   * Format date for calendar display
   */
  formatShortDate: function(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return (d.getMonth()+1) + '/' + d.getDate();
  },

  /**
   * Get start of week (Monday)
   */
  getWeekStart: function(date) {
    var d = new Date(date);
    var day = d.getDay();
    var diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0,0,0,0);
    return d;
  },

  /**
   * Get start of month
   */
  getMonthStart: function(date) {
    var d = new Date(date);
    d.setDate(1);
    d.setHours(0,0,0,0);
    return d;
  },

  /**
   * Check if date is today
   */
  isToday: function(iso) {
    if (!iso) return false;
    var d = new Date(iso);
    var now = new Date();
    return d.toDateString() === now.toDateString();
  },

  /**
   * Check if date is overdue
   */
  isOverdue: function(iso) {
    if (!iso) return false;
    var d = new Date(iso);
    var now = new Date();
    now.setHours(0,0,0,0);
    return d < now;
  },

  /**
   * Check if date is within this week
   */
  isThisWeek: function(iso) {
    if (!iso) return false;
    var d = new Date(iso);
    var now = new Date();
    var weekStart = Utils.getWeekStart(now);
    var weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return d >= weekStart && d < weekEnd;
  },

  /**
   * Get due date urgency class
   */
  getDueUrgency: function(iso, status) {
    if (!iso || status === 'done') return 'normal';
    if (Utils.isOverdue(iso)) return 'overdue';
    if (Utils.isToday(iso)) return 'today';
    if (Utils.isThisWeek(iso)) return 'this-week';
    return 'normal';
  },

  /**
   * Priority emoji map
   */
  priorityEmoji: function(priority) {
    var map = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
    return map[priority] || '⚪';
  },

  /**
   * Priority color map
   */
  priorityColor: function(priority) {
    var map = { critical: '#f44336', high: '#ff9800', medium: '#ffeb3b', low: '#4caf50' };
    return map[priority] || '#9e9e9e';
  },

  /**
   * Status display name
   */
  statusLabel: function(status) {
    var map = { blocked: '🔴 Blocked', todo: '🟡 To-Do', onhold: '⏸️ On Hold', 'in-progress': '🔵 In Progress', done: '✅ Done' };
    return map[status] || status;
  },

  /**
   * Status color
   */
  statusColor: function(status) {
    var map = { blocked: '#f44336', todo: '#ff9800', onhold: '#9e9e9e', 'in-progress': '#2196f3', done: '#4caf50' };
    return map[status] || '#666';
  },

  /**
   * Parse @mentions in text and return array of mentioned user IDs
   */
  parseMentions: function(text) {
    if (typeof text !== 'string') return [];
    var mentions = [];
    var regex = /@(kris|taylor|nyx)\b/gi;
    var match;
    while ((match = regex.exec(text)) !== null) {
      var id = match[1].toLowerCase();
      if (mentions.indexOf(id) === -1) mentions.push(id);
    }
    return mentions;
  },

  /**
   * Render text with @mentions highlighted (returns safe HTML)
   */
  renderMentions: function(text) {
    if (typeof text !== 'string') return '';
    var safe = Utils.sanitize(text);
    return safe.replace(/@(kris|taylor|nyx)/gi, function(match, name) {
      var id = name.toLowerCase();
      var member = Utils.teamMembers[id];
      if (!member) return match;
      return '<span class="mention" data-user="' + id + '" style="background:' + member.color + '22;color:' + member.color + ';padding:1px 4px;border-radius:3px;font-weight:600;cursor:pointer;">' + member.emoji + ' @' + member.name + '</span>';
    });
  },

  /**
   * Team member info
   */
  teamMembers: {
    kris: { name: 'Kris', emoji: '🧑‍💼', color: '#e91e63' },
    taylor: { name: 'Taylor', emoji: '🦉', color: '#2196f3' },
    nyx: { name: 'Nyx', emoji: '🤖', color: '#9c27b0' }
  },

  /**
   * Get team member display
   */
  getAssignee: function(id) {
    return Utils.teamMembers[id] || { name: id || 'Unassigned', emoji: '❓', color: '#666' };
  },

  /**
   * Project status display
   */
  projectStatusLabel: function(status) {
    var map = { active: 'Active', planning: 'Planning', 'on-hold': 'On Hold', completed: 'Completed', archived: 'Archived' };
    return map[status] || status;
  },

  projectStatusColor: function(status) {
    var map = { active: '#4caf50', planning: '#ff9800', 'on-hold': '#9e9e9e', completed: '#2196f3', archived: '#666' };
    return map[status] || '#666';
  },

  /**
   * Preset colors for project color picker
   */
  presetColors: [
    '#2196f3', '#1976d2', '#9c27b0', '#e91e63',
    '#f44336', '#ff9800', '#ff5722', '#ffc107',
    '#4caf50', '#009688', '#00bcd4', '#607d8b'
  ],

  /**
   * Create a DOM element with attributes and children
   */
  el: function(tag, attrs) {
    var element = document.createElement(tag);
    if (attrs) {
      for (var key in attrs) {
        if (!attrs.hasOwnProperty(key)) continue;
        var val = attrs[key];
        if (key === 'className') element.className = val;
        else if (key === 'style' && typeof val === 'object') Object.assign(element.style, val);
        else if (key.startsWith('on')) element.addEventListener(key.slice(2).toLowerCase(), val);
        else if (key === 'dataset') Object.assign(element.dataset, val);
        else element.setAttribute(key, val);
      }
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (typeof child === 'string') element.appendChild(document.createTextNode(child));
      else if (child instanceof Node) element.appendChild(child);
      else if (Array.isArray(child)) child.forEach(function(c) { if (c instanceof Node) element.appendChild(c); });
    }
    return element;
  },

  /**
   * Show toast notification
   */
  toast: function(message, type) {
    type = type || 'info';
    var container = document.getElementById('toast-container');
    if (!container) return;
    var colors = { success: '#4caf50', error: '#f44336', warning: '#ff9800', info: '#2196f3' };
    var icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    var toast = Utils.el('div', {
      className: 'toast toast-' + type,
      style: { background: colors[type] || colors.info }
    }, (icons[type] || '') + ' ' + message);
    container.appendChild(toast);
    requestAnimationFrame(function() { toast.classList.add('show'); });
    setTimeout(function() {
      toast.classList.remove('show');
      setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
  },

  /**
   * Open a modal by ID
   */
  openModal: function(id) {
    var modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  },

  /**
   * Close a modal by ID
   */
  closeModal: function(id) {
    var modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  },

  /**
   * Debounce function
   */
  debounce: function(fn, ms) {
    var timer;
    return function() {
      clearTimeout(timer);
      var args = arguments;
      var ctx = this;
      timer = setTimeout(function() { fn.apply(ctx, args); }, ms);
    };
  },

  /**
   * Build a CSS conic-gradient for donut chart
   * segments: [{value, color}]
   */
  buildConicGradient: function(segments) {
    var total = 0;
    segments.forEach(function(s) { total += s.value; });
    if (total === 0) return 'conic-gradient(#333 0deg 360deg)';
    var parts = [];
    var cumDeg = 0;
    segments.forEach(function(s) {
      var deg = (s.value / total) * 360;
      parts.push(s.color + ' ' + cumDeg + 'deg ' + (cumDeg + deg) + 'deg');
      cumDeg += deg;
    });
    return 'conic-gradient(' + parts.join(', ') + ')';
  }
};
