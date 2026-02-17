'use strict';

/**
 * dashboard.js — Dashboard with charts, alerts, activity feed
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

    // Main grid
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
      card.appendChild(Utils.el('div', { className: 'dash-proj-header' },
        Utils.el('span', { className: 'dash-proj-name' }, proj.name),
        Utils.el('span', { className: 'dash-proj-status', style: { background: Utils.projectStatusColor(proj.status) } },
          Utils.projectStatusLabel(proj.status))
      ));
      card.appendChild(Utils.el('div', { className: 'progress-bar' },
        Utils.el('div', { className: 'fill', style: { width: pct + '%', background: proj.color } })
      ));
      card.appendChild(Utils.el('div', { className: 'dash-proj-meta' },
        Utils.el('span', null, done + '/' + total + ' tasks'),
        Utils.el('span', null, pct + '% complete')
      ));
      projCards.appendChild(card);
    });
    projSection.appendChild(projCards);
    left.appendChild(projSection);

    // Charts Section - Status Donut
    var chartSection = Utils.el('div', { className: 'dash-section' });
    chartSection.appendChild(Utils.el('h3', { className: 'dash-section-title' }, '📊 Task Distribution'));

    // Donut chart
    var donutSegments = [
      { value: stats.todo || 0, color: '#ff9800', label: 'To-Do' },
      { value: stats.inProgress || 0, color: '#2196f3', label: 'In Progress' },
      { value: stats.done || 0, color: '#4caf50', label: 'Done' },
      { value: stats.blocked || 0, color: '#f44336', label: 'Blocked' },
      { value: stats.onhold || 0, color: '#9e9e9e', label: 'On Hold' }
    ];
    var donut = Utils.el('div', { className: 'donut-chart', style: { background: Utils.buildConicGradient(donutSegments) } },
      Utils.el('div', { className: 'donut-center' },
        Utils.el('div', { className: 'donut-num' }, String(stats.totalTasks)),
        Utils.el('div', { className: 'donut-label' }, 'TASKS')
      )
    );
    chartSection.appendChild(donut);
    var legend = Utils.el('div', { className: 'chart-legend' });
    donutSegments.forEach(function(s) {
      if (s.value > 0) {
        legend.appendChild(Utils.el('span', { className: 'chart-legend-item' },
          Utils.el('span', { className: 'chart-legend-dot', style: { background: s.color } }),
          Utils.el('span', null, s.label + ' (' + s.value + ')')
        ));
      }
    });
    chartSection.appendChild(legend);

    // Assignee bar chart
    chartSection.appendChild(Utils.el('div', { className: 'chart-title', style: { marginTop: '20px' } }, 'Tasks per Assignee'));
    var barChart = Utils.el('div', { className: 'bar-chart' });
    var maxTasks = 1;
    Object.keys(Utils.teamMembers).forEach(function(id) {
      var c = stats.byAssignee[id] ? stats.byAssignee[id].total : 0;
      if (c > maxTasks) maxTasks = c;
    });
    Object.keys(Utils.teamMembers).forEach(function(id) {
      var m = Utils.teamMembers[id];
      var c = stats.byAssignee[id] ? stats.byAssignee[id].total : 0;
      var pct = maxTasks > 0 ? Math.round((c / maxTasks) * 100) : 0;
      barChart.appendChild(Utils.el('div', { className: 'bar-chart-item' },
        Utils.el('span', { className: 'bar-chart-label' }, m.emoji + ' ' + m.name),
        Utils.el('div', { className: 'bar-chart-bar-wrap' },
          Utils.el('div', { className: 'bar-chart-bar', style: { width: pct + '%', background: m.color } },
            Utils.el('span', { className: 'bar-chart-val' }, String(c))
          )
        )
      ));
    });
    chartSection.appendChild(barChart);

    // Weekly completion trend
    chartSection.appendChild(Utils.el('div', { className: 'chart-title', style: { marginTop: '20px' } }, 'Completed This Week'));
    var weeklyChart = Utils.el('div', { className: 'weekly-chart' });
    var maxWeekly = 1;
    stats.weeklyCompletion.forEach(function(d) { if (d.count > maxWeekly) maxWeekly = d.count; });
    stats.weeklyCompletion.forEach(function(d) {
      var h = maxWeekly > 0 ? Math.max(4, Math.round((d.count / maxWeekly) * 60)) : 4;
      weeklyChart.appendChild(Utils.el('div', { className: 'weekly-bar-wrap' },
        Utils.el('div', { className: 'weekly-bar-val' }, String(d.count)),
        Utils.el('div', { className: 'weekly-bar', style: { height: h + 'px' } }),
        Utils.el('div', { className: 'weekly-bar-label' }, d.day)
      ));
    });
    chartSection.appendChild(weeklyChart);

    left.appendChild(chartSection);

    // This Week's Priorities
    var prioSection = Utils.el('div', { className: 'dash-section' });
    prioSection.appendChild(Utils.el('h3', { className: 'dash-section-title' }, '🎯 This Week\'s Priorities'));
    var urgent = tasks
      .filter(function(t) { return t.status !== 'done'; })
      .sort(function(a, b) {
        // Overdue first, then by priority
        var aOverdue = Utils.isOverdue(a.dueDate) ? 0 : 1;
        var bOverdue = Utils.isOverdue(b.dueDate) ? 0 : 1;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
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
      var item = Utils.el('div', { className: 'dash-prio-item' });
      if (Utils.isOverdue(t.dueDate)) {
        item.style.borderLeft = '3px solid #f44336';
      }
      item.appendChild(Utils.el('span', { className: 'prio-dot', style: { background: Utils.priorityColor(t.priority) } }));
      item.appendChild(Utils.el('span', { className: 'prio-title' }, t.title));
      item.appendChild(Utils.el('span', { className: 'prio-assignee' }, assignee.emoji));
      if (proj) {
        item.appendChild(Utils.el('span', { className: 'prio-project', style: { color: proj.color } }, proj.name));
      }
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
      item.addEventListener('click', function() { App.switchTab('board'); });
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
      teamGrid.appendChild(Utils.el('div', { className: 'dash-team-card' },
        Utils.el('div', { className: 'team-avatar' }, member.emoji),
        Utils.el('div', { className: 'team-name' }, member.name),
        Utils.el('div', { className: 'team-count' }, String(memberStats.total) + ' tasks'),
        Utils.el('div', { className: 'team-breakdown' },
          Utils.el('span', { style: { color: '#2196f3' } }, '▶ ' + (memberStats['in-progress'] || 0)),
          Utils.el('span', { style: { color: '#ff9800' } }, '○ ' + (memberStats.todo || 0)),
          Utils.el('span', { style: { color: '#4caf50' } }, '✓ ' + (memberStats.done || 0))
        )
      ));
    });
    teamSection.appendChild(teamGrid);
    right.appendChild(teamSection);

    // Alerts
    var alertSection = Utils.el('div', { className: 'dash-section' });
    alertSection.appendChild(Utils.el('h3', { className: 'dash-section-title' }, '🔔 Alerts'));
    var alerts = Utils.el('div', { className: 'dash-alerts' });
    var overdue = tasks.filter(function(t) { return t.status !== 'done' && Utils.isOverdue(t.dueDate); });
    var blocked = tasks.filter(function(t) { return t.status === 'blocked'; });
    var krisWaiting = tasks.filter(function(t) { return t.assignee === 'kris' && t.status === 'todo'; });
    var dueToday = tasks.filter(function(t) { return t.status !== 'done' && Utils.isToday(t.dueDate); });
    if (overdue.length > 0) {
      alerts.appendChild(Utils.el('div', { className: 'dash-alert alert-red' },
        '⏰ ' + overdue.length + ' overdue task' + (overdue.length > 1 ? 's' : '') + ': ' + overdue.map(function(t) { return t.title; }).slice(0,3).join(', ')));
    }
    if (dueToday.length > 0) {
      alerts.appendChild(Utils.el('div', { className: 'dash-alert alert-orange' },
        '📅 ' + dueToday.length + ' task' + (dueToday.length > 1 ? 's' : '') + ' due today'));
    }
    if (blocked.length > 0) {
      alerts.appendChild(Utils.el('div', { className: 'dash-alert alert-red' },
        '🚫 ' + blocked.length + ' blocked task' + (blocked.length > 1 ? 's' : '')));
    }
    if (krisWaiting.length > 0) {
      alerts.appendChild(Utils.el('div', { className: 'dash-alert alert-orange' },
        '📋 ' + krisWaiting.length + ' task' + (krisWaiting.length > 1 ? 's' : '') + ' waiting for Kris'));
    }
    if (overdue.length === 0 && blocked.length === 0 && krisWaiting.length === 0 && dueToday.length === 0) {
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
      actList.appendChild(Utils.el('div', { className: 'dash-activity-item' },
        Utils.el('span', { className: 'act-avatar' }, assignee.emoji),
        Utils.el('span', { className: 'act-text' }, a.details || a.action),
        Utils.el('span', { className: 'act-time' }, Utils.timeAgo(a.timestamp))
      ));
    });
    actSection.appendChild(actList);
    right.appendChild(actSection);

    grid.appendChild(left);
    grid.appendChild(right);
    container.appendChild(grid);
  }

  return { render: render };
})();
