'use strict';

/**
 * dashboard.js — Dashboard home view (default landing tab)
 */

var Dashboard = (function() {

  function render() {
    var container = document.getElementById('dashboard-tab');
    if (!container) return;
    container.innerHTML = '';

    var stats = DataStore.getStats();
    var projects = DataStore.getProjects();
    var tasks = DataStore.getTasks();
    var activity = DataStore.getActivity(15);

    // Quick Stats Row
    var statsRow = Utils.el('div', { className: 'dash-stats' });
    var statItems = [
      { num: stats.totalProjects, label: 'Projects', color: '#2196f3', icon: '📁' },
      { num: stats.totalTasks, label: 'Total Tasks', color: '#ff9800', icon: '📋' },
      { num: stats.inProgress, label: 'In Progress', color: '#2196f3', icon: '🔵' },
      { num: stats.completedThisWeek, label: 'Done This Week', color: '#4caf50', icon: '✅' },
      { num: stats.blocked, label: 'Blocked', color: '#f44336', icon: '🔴' },
      { num: stats.overdueTasks, label: 'Overdue', color: '#f44336', icon: '⏰' }
    ];
    statItems.forEach(function(s) {
      var card = Utils.el('div', { className: 'dash-stat-card' },
        Utils.el('div', { className: 'dash-stat-icon' }, s.icon),
        Utils.el('div', { className: 'dash-stat-num', style: { color: s.color } }, String(s.num)),
        Utils.el('div', { className: 'dash-stat-label' }, s.label)
      );
      statsRow.appendChild(card);
    });
    container.appendChild(statsRow);

    // Main grid: left (projects + priorities) | right (my tasks + activity)
    var grid = Utils.el('div', { className: 'dash-grid' });

    // Left column
    var left = Utils.el('div', { className: 'dash-col' });

    // Project Status Cards
    var projSection = Utils.el('div', { className: 'dash-section' });
    projSection.appendChild(Utils.el('h3', { className: 'dash-section-title' }, '📁 Project Status'));
    var projCards = Utils.el('div', { className: 'dash-project-cards' });
    projects.filter(function(p) { return p.status !== 'archived'; }).forEach(function(proj) {
      var projTasks = DataStore.getTasks({ projectId: proj.id });
      var done = projTasks.filter(function(t) { return t.status === 'done'; }).length;
      var total = projTasks.length;
      var pct = total > 0 ? Math.round((done / total) * 100) : 0;

      var card = Utils.el('div', { className: 'dash-project-card', style: { borderLeftColor: proj.color } });
      card.addEventListener('click', function() {
        App.switchTab('projects');
        setTimeout(function() { Projects.showDetail(proj.id); }, 100);
      });
      var header = Utils.el('div', { className: 'dash-proj-header' },
        Utils.el('span', { className: 'dash-proj-name' }, proj.name),
        Utils.el('span', { className: 'dash-proj-status', style: { background: Utils.projectStatusColor(proj.status) } },
          Utils.projectStatusLabel(proj.status))
      );
      var bar = Utils.el('div', { className: 'progress-bar' },
        Utils.el('div', { className: 'fill', style: { width: pct + '%', background: proj.color } })
      );
      var meta = Utils.el('div', { className: 'dash-proj-meta' },
        Utils.el('span', null, done + '/' + total + ' tasks'),
        Utils.el('span', null, pct + '% complete')
      );
      card.appendChild(header);
      card.appendChild(bar);
      card.appendChild(meta);
      projCards.appendChild(card);
    });
    projSection.appendChild(projCards);
    left.appendChild(projSection);

    // This Week's Priorities
    var prioSection = Utils.el('div', { className: 'dash-section' });
    prioSection.appendChild(Utils.el('h3', { className: 'dash-section-title' }, '🎯 This Week\'s Priorities'));
    var urgent = tasks
      .filter(function(t) { return t.status !== 'done'; })
      .sort(function(a, b) {
        var pOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return (pOrder[a.priority] || 3) - (pOrder[b.priority] || 3);
      })
      .slice(0, 8);
    var prioList = Utils.el('div', { className: 'dash-prio-list' });
    if (urgent.length === 0) {
      prioList.appendChild(Utils.el('div', { className: 'empty-state' }, 'All clear! No urgent tasks. 🎉'));
    }
    urgent.forEach(function(t) {
      var proj = DataStore.getProject(t.projectId);
      var assignee = Utils.getAssignee(t.assignee);
      var item = Utils.el('div', { className: 'dash-prio-item' },
        Utils.el('span', { className: 'prio-dot', style: { background: Utils.priorityColor(t.priority) } }),
        Utils.el('span', { className: 'prio-title' }, t.title),
        Utils.el('span', { className: 'prio-assignee' }, assignee.emoji),
        Utils.el('span', { className: 'prio-project', style: { color: proj ? proj.color : '#888' } },
          proj ? proj.name : '')
      );
      prioList.appendChild(item);
    });
    prioSection.appendChild(prioList);
    left.appendChild(prioSection);

    // Right column
    var right = Utils.el('div', { className: 'dash-col' });

    // My Tasks (Kris)
    var mySection = Utils.el('div', { className: 'dash-section' });
    mySection.appendChild(Utils.el('h3', { className: 'dash-section-title' }, '🧑‍💼 My Tasks (Kris)'));
    var krisTasks = tasks.filter(function(t) { return t.assignee === 'kris' && t.status !== 'done'; });
    var myList = Utils.el('div', { className: 'dash-my-tasks' });
    if (krisTasks.length === 0) {
      myList.appendChild(Utils.el('div', { className: 'empty-state' }, 'No active tasks for Kris. 🎉'));
    }
    krisTasks.forEach(function(t) {
      var proj = DataStore.getProject(t.projectId);
      var item = Utils.el('div', { className: 'dash-task-item' });
      item.addEventListener('click', function() {
        App.switchTab('board');
        // Could scroll to task
      });
      item.appendChild(Utils.el('span', { className: 'prio-dot', style: { background: Utils.priorityColor(t.priority) } }));
      item.appendChild(Utils.el('span', { className: 'dash-task-title' }, t.title));
      if (proj) {
        item.appendChild(Utils.el('span', { className: 'dash-task-proj', style: { color: proj.color } }, proj.name));
      }
      item.appendChild(Utils.el('span', { className: 'dash-task-status', style: { color: Utils.statusColor(t.status) } },
        Utils.statusLabel(t.status)));
      myList.appendChild(item);
    });
    mySection.appendChild(myList);
    right.appendChild(mySection);

    // Team Workload
    var teamSection = Utils.el('div', { className: 'dash-section' });
    teamSection.appendChild(Utils.el('h3', { className: 'dash-section-title' }, '👥 Team Workload'));
    var teamGrid = Utils.el('div', { className: 'dash-team-grid' });
    Object.keys(Utils.teamMembers).forEach(function(id) {
      var member = Utils.teamMembers[id];
      var memberStats = stats.byAssignee[id] || { total: 0 };
      var card = Utils.el('div', { className: 'dash-team-card' },
        Utils.el('div', { className: 'team-avatar' }, member.emoji),
        Utils.el('div', { className: 'team-name' }, member.name),
        Utils.el('div', { className: 'team-count' }, String(memberStats.total) + ' tasks'),
        Utils.el('div', { className: 'team-breakdown' },
          Utils.el('span', { style: { color: '#2196f3' } }, '▶ ' + (memberStats['in-progress'] || 0)),
          Utils.el('span', { style: { color: '#ff9800' } }, '○ ' + (memberStats.todo || 0)),
          Utils.el('span', { style: { color: '#4caf50' } }, '✓ ' + (memberStats.done || 0))
        )
      );
      teamGrid.appendChild(card);
    });
    teamSection.appendChild(teamGrid);
    right.appendChild(teamSection);

    // Notifications & Alerts
    var alertSection = Utils.el('div', { className: 'dash-section' });
    alertSection.appendChild(Utils.el('h3', { className: 'dash-section-title' }, '🔔 Alerts'));
    var alerts = Utils.el('div', { className: 'dash-alerts' });
    var overdue = tasks.filter(function(t) { return t.status !== 'done' && Utils.isOverdue(t.dueDate); });
    var blocked = tasks.filter(function(t) { return t.status === 'blocked'; });
    var krisWaiting = tasks.filter(function(t) { return t.assignee === 'kris' && t.status === 'todo'; });
    if (overdue.length > 0) {
      alerts.appendChild(Utils.el('div', { className: 'dash-alert alert-red' },
        '⏰ ' + overdue.length + ' overdue task' + (overdue.length > 1 ? 's' : '')));
    }
    if (blocked.length > 0) {
      alerts.appendChild(Utils.el('div', { className: 'dash-alert alert-red' },
        '🚫 ' + blocked.length + ' blocked task' + (blocked.length > 1 ? 's' : '')));
    }
    if (krisWaiting.length > 0) {
      alerts.appendChild(Utils.el('div', { className: 'dash-alert alert-orange' },
        '📋 ' + krisWaiting.length + ' task' + (krisWaiting.length > 1 ? 's' : '') + ' waiting for Kris'));
    }
    if (overdue.length === 0 && blocked.length === 0 && krisWaiting.length === 0) {
      alerts.appendChild(Utils.el('div', { className: 'dash-alert alert-green' }, '✅ All clear! No alerts.'));
    }
    alertSection.appendChild(alerts);
    right.appendChild(alertSection);

    // Activity Feed
    var actSection = Utils.el('div', { className: 'dash-section' });
    actSection.appendChild(Utils.el('h3', { className: 'dash-section-title' }, '📝 Recent Activity'));
    var actList = Utils.el('div', { className: 'dash-activity' });
    if (activity.length === 0) {
      actList.appendChild(Utils.el('div', { className: 'empty-state' }, 'No activity yet.'));
    }
    activity.forEach(function(a) {
      var assignee = Utils.getAssignee(a.by);
      var item = Utils.el('div', { className: 'dash-activity-item' },
        Utils.el('span', { className: 'act-avatar' }, assignee.emoji),
        Utils.el('span', { className: 'act-text' }, a.action),
        Utils.el('span', { className: 'act-time' }, Utils.timeAgo(a.timestamp))
      );
      actList.appendChild(item);
    });
    actSection.appendChild(actList);
    right.appendChild(actSection);

    grid.appendChild(left);
    grid.appendChild(right);
    container.appendChild(grid);
  }

  return { render: render };
})();
