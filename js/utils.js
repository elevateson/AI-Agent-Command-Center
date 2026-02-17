'use strict';

/**
 * utils.js — Sanitization, formatting, helpers
 * Zero external dependencies. All pure functions.
 */

const Utils = {
  /**
   * Sanitize string for safe DOM insertion (prevent XSS)
   */
  sanitize(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Generate a unique ID with prefix
   */
  generateId(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  /**
   * Format ISO date to human-readable
   */
  formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  },

  /**
   * Format ISO date to relative time (e.g., "2 hours ago")
   */
  timeAgo(iso) {
    if (!iso) return '';
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    const days = Math.floor(hrs / 24);
    if (days < 7) return days + 'd ago';
    return Utils.formatDate(iso);
  },

  /**
   * Format date for calendar display
   */
  formatShortDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return `${d.getMonth()+1}/${d.getDate()}`;
  },

  /**
   * Get start of week (Monday)
   */
  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0,0,0,0);
    return d;
  },

  /**
   * Get start of month
   */
  getMonthStart(date) {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0,0,0,0);
    return d;
  },

  /**
   * Check if date is today
   */
  isToday(iso) {
    if (!iso) return false;
    const d = new Date(iso);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  },

  /**
   * Check if date is overdue
   */
  isOverdue(iso) {
    if (!iso) return false;
    const d = new Date(iso);
    const now = new Date();
    now.setHours(0,0,0,0);
    return d < now;
  },

  /**
   * Check if date is within this week
   */
  isThisWeek(iso) {
    if (!iso) return false;
    const d = new Date(iso);
    const now = new Date();
    const weekStart = Utils.getWeekStart(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return d >= weekStart && d < weekEnd;
  },

  /**
   * Priority emoji map
   */
  priorityEmoji(priority) {
    const map = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
    return map[priority] || '⚪';
  },

  /**
   * Priority color map
   */
  priorityColor(priority) {
    const map = { critical: '#f44336', high: '#ff9800', medium: '#ffeb3b', low: '#4caf50' };
    return map[priority] || '#9e9e9e';
  },

  /**
   * Status display name
   */
  statusLabel(status) {
    const map = { blocked: '🔴 Blocked', todo: '🟡 To-Do', onhold: '⏸️ On Hold', 'in-progress': '🔵 In Progress', done: '✅ Done' };
    return map[status] || status;
  },

  /**
   * Status color
   */
  statusColor(status) {
    const map = { blocked: '#f44336', todo: '#ff9800', onhold: '#9e9e9e', 'in-progress': '#2196f3', done: '#4caf50' };
    return map[status] || '#666';
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
  getAssignee(id) {
    return Utils.teamMembers[id] || { name: id || 'Unassigned', emoji: '❓', color: '#666' };
  },

  /**
   * Project status display
   */
  projectStatusLabel(status) {
    const map = { active: 'Active', planning: 'Planning', 'on-hold': 'On Hold', completed: 'Completed', archived: 'Archived' };
    return map[status] || status;
  },

  projectStatusColor(status) {
    const map = { active: '#4caf50', planning: '#ff9800', 'on-hold': '#9e9e9e', completed: '#2196f3', archived: '#666' };
    return map[status] || '#666';
  },

  /**
   * Create a DOM element with attributes and children
   */
  el(tag, attrs, ...children) {
    const element = document.createElement(tag);
    if (attrs) {
      for (const [key, val] of Object.entries(attrs)) {
        if (key === 'className') element.className = val;
        else if (key === 'style' && typeof val === 'object') Object.assign(element.style, val);
        else if (key.startsWith('on')) element.addEventListener(key.slice(2).toLowerCase(), val);
        else if (key === 'dataset') Object.assign(element.dataset, val);
        else element.setAttribute(key, val);
      }
    }
    for (const child of children) {
      if (typeof child === 'string') element.appendChild(document.createTextNode(child));
      else if (child instanceof Node) element.appendChild(child);
      else if (Array.isArray(child)) child.forEach(c => { if (c instanceof Node) element.appendChild(c); });
    }
    return element;
  },

  /**
   * Show toast notification
   */
  toast(message, type) {
    type = type || 'info';
    const container = document.getElementById('toast-container');
    if (!container) return;
    const colors = { success: '#4caf50', error: '#f44336', warning: '#ff9800', info: '#2196f3' };
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = Utils.el('div', {
      className: 'toast toast-' + type,
      style: { background: colors[type] || colors.info }
    }, icons[type] + ' ' + message);
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
  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  },

  /**
   * Close a modal by ID
   */
  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  },

  /**
   * Debounce function
   */
  debounce(fn, ms) {
    let timer;
    return function() {
      clearTimeout(timer);
      const args = arguments;
      const ctx = this;
      timer = setTimeout(function() { fn.apply(ctx, args); }, ms);
    };
  }
};
