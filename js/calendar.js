'use strict';

/**
 * calendar.js — Calendar/timeline view
 */

var Calendar = (function() {
  var viewMode = 'month'; // 'week' or 'month'
  var currentDate = new Date();

  function render() {
    var container = document.getElementById('calendar-tab');
    if (!container) return;
    container.innerHTML = '';

    // Controls
    var controls = Utils.el('div', { className: 'cal-controls' });
    var prevBtn = Utils.el('button', { className: 'btn btn-secondary btn-sm', onClick: function() { navigate(-1); } }, '◀');
    var nextBtn = Utils.el('button', { className: 'btn btn-secondary btn-sm', onClick: function() { navigate(1); } }, '▶');
    var todayBtn = Utils.el('button', { className: 'btn btn-secondary btn-sm', onClick: function() { currentDate = new Date(); render(); } }, 'Today');

    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var titleText = viewMode === 'month'
      ? months[currentDate.getMonth()] + ' ' + currentDate.getFullYear()
      : 'Week of ' + Utils.formatDate(Utils.getWeekStart(currentDate).toISOString());
    var title = Utils.el('h2', { className: 'cal-title' }, titleText);

    var viewToggle = Utils.el('div', { className: 'cal-view-toggle' },
      Utils.el('button', { className: 'btn btn-sm ' + (viewMode === 'week' ? 'btn-primary' : 'btn-secondary'),
        onClick: function() { viewMode = 'week'; render(); } }, 'Week'),
      Utils.el('button', { className: 'btn btn-sm ' + (viewMode === 'month' ? 'btn-primary' : 'btn-secondary'),
        onClick: function() { viewMode = 'month'; render(); } }, 'Month')
    );

    controls.appendChild(prevBtn);
    controls.appendChild(todayBtn);
    controls.appendChild(title);
    controls.appendChild(viewToggle);
    controls.appendChild(nextBtn);
    container.appendChild(controls);

    if (viewMode === 'month') {
      renderMonth(container);
    } else {
      renderWeek(container);
    }

    // Legend
    var legend = Utils.el('div', { className: 'cal-legend' },
      Utils.el('span', { className: 'cal-legend-item' },
        Utils.el('span', { className: 'cal-dot', style: { background: '#f44336' } }), ' Overdue'),
      Utils.el('span', { className: 'cal-legend-item' },
        Utils.el('span', { className: 'cal-dot', style: { background: '#ff9800' } }), ' Due Today'),
      Utils.el('span', { className: 'cal-legend-item' },
        Utils.el('span', { className: 'cal-dot', style: { background: '#2196f3' } }), ' Upcoming'),
      Utils.el('span', { className: 'cal-legend-item' },
        Utils.el('span', { className: 'cal-dot', style: { background: '#4caf50' } }), ' Completed')
    );
    container.appendChild(legend);

    // Tasks without due dates
    var noDueTasks = DataStore.getTasks().filter(function(t) { return !t.dueDate && t.status !== 'done'; });
    if (noDueTasks.length > 0) {
      var noDateSection = Utils.el('div', { className: 'cal-no-date' });
      noDateSection.appendChild(Utils.el('h3', null, '📋 Tasks Without Due Dates (' + noDueTasks.length + ')'));
      var list = Utils.el('div', { className: 'cal-no-date-list' });
      noDueTasks.slice(0, 10).forEach(function(t) {
        var proj = DataStore.getProject(t.projectId);
        var assignee = Utils.getAssignee(t.assignee);
        list.appendChild(Utils.el('div', { className: 'cal-no-date-item' },
          Utils.el('span', { className: 'prio-dot', style: { background: Utils.priorityColor(t.priority) } }),
          Utils.el('span', null, t.title),
          Utils.el('span', { className: 'cal-task-assignee' }, assignee.emoji),
          proj ? Utils.el('span', { style: { color: proj.color, fontSize: '11px' } }, proj.name) : Utils.el('span')
        ));
      });
      noDateSection.appendChild(list);
      container.appendChild(noDateSection);
    }
  }

  function navigate(dir) {
    if (viewMode === 'month') {
      currentDate.setMonth(currentDate.getMonth() + dir);
    } else {
      currentDate.setDate(currentDate.getDate() + (dir * 7));
    }
    render();
  }

  function getTasksForDate(dateStr) {
    return DataStore.getTasks().filter(function(t) {
      return t.dueDate && t.dueDate.slice(0, 10) === dateStr;
    });
  }

  function renderMonth(container) {
    var year = currentDate.getFullYear();
    var month = currentDate.getMonth();
    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var today = new Date();

    var grid = Utils.el('div', { className: 'cal-month-grid' });

    // Day headers
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(function(d) {
      grid.appendChild(Utils.el('div', { className: 'cal-day-header' }, d));
    });

    // Empty cells before first day
    for (var i = 0; i < firstDay; i++) {
      grid.appendChild(Utils.el('div', { className: 'cal-day empty' }));
    }

    // Days
    for (var d = 1; d <= daysInMonth; d++) {
      var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var dayTasks = getTasksForDate(dateStr);
      var isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
      var cell = Utils.el('div', { className: 'cal-day' + (isToday ? ' today' : '') + (dayTasks.length > 0 ? ' has-tasks' : '') });
      cell.appendChild(Utils.el('div', { className: 'cal-day-num' }, String(d)));

      dayTasks.slice(0, 3).forEach(function(t) {
        var proj = DataStore.getProject(t.projectId);
        var color = t.status === 'done' ? '#4caf50' : (Utils.isOverdue(t.dueDate) ? '#f44336' : (proj ? proj.color : '#2196f3'));
        var taskEl = Utils.el('div', { className: 'cal-task-pill', style: { background: color + '33', borderLeftColor: color } });
        taskEl.appendChild(document.createTextNode(t.title.length > 15 ? t.title.slice(0, 15) + '…' : t.title));
        cell.appendChild(taskEl);
      });
      if (dayTasks.length > 3) {
        cell.appendChild(Utils.el('div', { className: 'cal-more' }, '+' + (dayTasks.length - 3) + ' more'));
      }

      grid.appendChild(cell);
    }

    container.appendChild(grid);
  }

  function renderWeek(container) {
    var weekStart = Utils.getWeekStart(currentDate);
    var grid = Utils.el('div', { className: 'cal-week-grid' });
    var today = new Date();

    for (var i = 0; i < 7; i++) {
      var d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      var dateStr = d.toISOString().slice(0, 10);
      var dayTasks = getTasksForDate(dateStr);
      var isToday = d.toDateString() === today.toDateString();
      var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

      var col = Utils.el('div', { className: 'cal-week-day' + (isToday ? ' today' : '') });
      col.appendChild(Utils.el('div', { className: 'cal-week-header' },
        Utils.el('span', { className: 'cal-week-name' }, dayNames[d.getDay()]),
        Utils.el('span', { className: 'cal-week-num' + (isToday ? ' today-num' : '') }, String(d.getDate()))
      ));

      dayTasks.forEach(function(t) {
        var proj = DataStore.getProject(t.projectId);
        var assignee = Utils.getAssignee(t.assignee);
        var color = t.status === 'done' ? '#4caf50' : (Utils.isOverdue(t.dueDate) ? '#f44336' : (proj ? proj.color : '#2196f3'));
        var taskCard = Utils.el('div', { className: 'cal-week-task', style: { borderLeftColor: color } },
          Utils.el('div', { className: 'cal-week-task-title' }, t.title),
          Utils.el('div', { className: 'cal-week-task-meta' },
            Utils.el('span', null, assignee.emoji),
            proj ? Utils.el('span', { style: { color: proj.color } }, proj.name) : Utils.el('span')
          )
        );
        col.appendChild(taskCard);
      });

      if (dayTasks.length === 0) {
        col.appendChild(Utils.el('div', { className: 'cal-empty-day' }, '—'));
      }

      grid.appendChild(col);
    }

    container.appendChild(grid);
  }

  return { render: render };
})();
