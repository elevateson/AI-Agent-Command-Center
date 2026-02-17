'use strict';

/**
 * board.js — Kanban board with drag-and-drop, filtering, task modals
 */

var Board = (function() {
  var draggedTaskId = null;
  var currentFilter = { assignee: 'all' };

  var columns = [
    { status: 'blocked', label: '🔴 BLOCKED', cls: 'blocked' },
    { status: 'todo', label: '🟡 TO-DO', cls: 'todo' },
    { status: 'onhold', label: '⏸️ ON HOLD', cls: 'onhold' },
    { status: 'in-progress', label: '🔵 IN PROGRESS', cls: 'progress' },
    { status: 'done', label: '🟢 DONE', cls: 'done' }
  ];

  function render() {
    var container = document.getElementById('board-tab');
    if (!container) return;
    container.innerHTML = '';

    // Filter bar
    var filterBar = Utils.el('div', { className: 'board-filter-bar' });
    var filterLabel = Utils.el('span', { className: 'filter-label' }, 'Filter: ');
    filterBar.appendChild(filterLabel);

    var filterAll = Utils.el('button', {
      className: 'filter-btn' + (currentFilter.assignee === 'all' ? ' active' : ''),
      onClick: function() { currentFilter.assignee = 'all'; render(); }
    }, '👥 All');
    filterBar.appendChild(filterAll);

    Object.keys(Utils.teamMembers).forEach(function(id) {
      var m = Utils.teamMembers[id];
      var btn = Utils.el('button', {
        className: 'filter-btn' + (currentFilter.assignee === id ? ' active' : ''),
        onClick: function() { currentFilter.assignee = id; render(); }
      }, m.emoji + ' ' + m.name);
      filterBar.appendChild(btn);
    });
    container.appendChild(filterBar);

    // Stats bar
    var stats = DataStore.getStats();
    var statsBar = Utils.el('div', { className: 'stats' });
    var statItems = [
      { num: stats.blocked, label: 'Blocked', color: '#f44336' },
      { num: stats.todo, label: 'To-Do', color: '#ff9800' },
      { num: stats.onhold, label: 'On Hold', color: '#9e9e9e' },
      { num: stats.inProgress, label: 'In Progress', color: '#2196f3' },
      { num: stats.done, label: 'Done', color: '#4caf50' }
    ];
    statItems.forEach(function(s) {
      var stat = Utils.el('div', { className: 'stat' },
        Utils.el('div', { className: 'num', style: { color: s.color } }, String(s.num)),
        Utils.el('div', { className: 'label' }, s.label)
      );
      statsBar.appendChild(stat);
    });
    container.appendChild(statsBar);

    // Mobile column selector
    var mobileSelector = Utils.el('div', { className: 'mobile-column-selector' });
    columns.forEach(function(col, i) {
      var btn = Utils.el('button', {
        className: 'mobile-column-btn ' + col.cls + (i === 3 ? ' active' : ''),
        dataset: { col: col.cls },
        onClick: function() {
          document.querySelectorAll('.mobile-column-btn').forEach(function(b) { b.classList.remove('active'); });
          this.classList.add('active');
          document.querySelectorAll('.column').forEach(function(c) { c.classList.remove('mobile-active'); });
          document.querySelector('.column.' + col.cls).classList.add('mobile-active');
        }
      }, col.label.split(' ').slice(0,2).join(' '));
      mobileSelector.appendChild(btn);
    });
    container.appendChild(mobileSelector);

    // Board
    var board = Utils.el('div', { className: 'board' });

    columns.forEach(function(col, i) {
      var column = Utils.el('div', {
        className: 'column ' + col.cls + (i === 3 ? ' mobile-active' : ''),
        dataset: { status: col.status }
      });

      var header = Utils.el('div', { className: 'column-header' });
      var addBtn = Utils.el('button', { className: 'add-task-btn', onClick: function() { openAddTaskModal(col.status); } }, '+');
      var span = Utils.el('span', null, col.label);
      var spacer = Utils.el('span', { style: { width: '24px' } });
      header.appendChild(addBtn);
      header.appendChild(span);
      header.appendChild(spacer);
      column.appendChild(header);

      var tasksContainer = Utils.el('div', { className: 'tasks-container' });

      var tasks = DataStore.getTasks({ status: col.status });
      if (currentFilter.assignee !== 'all') {
        tasks = tasks.filter(function(t) { return t.assignee === currentFilter.assignee; });
      }

      if (tasks.length === 0) {
        tasksContainer.appendChild(Utils.el('div', { className: 'empty' }, 'No tasks'));
      } else {
        tasks.forEach(function(task) {
          tasksContainer.appendChild(renderTaskCard(task));
        });
      }

      // Drag and drop on column
      column.addEventListener('dragover', function(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
      column.addEventListener('dragenter', function(e) { e.preventDefault(); column.classList.add('drag-over'); });
      column.addEventListener('dragleave', function(e) {
        if (!column.contains(e.relatedTarget)) column.classList.remove('drag-over');
      });
      column.addEventListener('drop', function(e) {
        e.preventDefault();
        column.classList.remove('drag-over');
        if (!draggedTaskId) return;
        DataStore.updateTask(draggedTaskId, { status: col.status });
        draggedTaskId = null;
        render();
      });

      column.appendChild(tasksContainer);
      board.appendChild(column);
    });

    container.appendChild(board);

    // Setup swipe gestures
    setupSwipe();
  }

  function renderTaskCard(task) {
    var proj = DataStore.getProject(task.projectId);
    var assignee = Utils.getAssignee(task.assignee);
    var card = Utils.el('div', {
      className: 'task',
      draggable: 'true',
      dataset: { taskId: task.id },
      style: { borderLeftColor: proj ? proj.color : Utils.statusColor(task.status) }
    });

    card.addEventListener('dragstart', function(e) {
      draggedTaskId = task.id;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(function() { card.classList.add('drag-ghost'); }, 0);
    });
    card.addEventListener('dragend', function() {
      card.classList.remove('dragging', 'drag-ghost');
      document.querySelectorAll('.column').forEach(function(c) { c.classList.remove('drag-over'); });
      draggedTaskId = null;
    });

    // Touch drag
    var touchStartX, touchStartY;
    card.addEventListener('touchstart', function(e) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    card.addEventListener('touchend', function(e) {
      var dx = e.changedTouches[0].clientX - touchStartX;
      var dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        openEditTaskModal(task.id);
      }
    }, { passive: true });

    card.addEventListener('click', function() { openEditTaskModal(task.id); });

    // Priority + ID row
    var topRow = Utils.el('div', { className: 'task-top-row' },
      Utils.el('span', { className: 'task-id' }, task.id.slice(-8)),
      Utils.el('span', { className: 'task-priority-dot', style: { background: Utils.priorityColor(task.priority) } })
    );
    card.appendChild(topRow);

    // Title
    var title = task.status === 'done' ? '✅ ' + task.title : task.title;
    card.appendChild(Utils.el('h3', null, title));

    // Assignee + project
    var metaRow = Utils.el('div', { className: 'task-meta-row' },
      Utils.el('span', { className: 'task-assignee-badge' }, assignee.emoji + ' ' + assignee.name)
    );
    if (proj) {
      metaRow.appendChild(Utils.el('span', { className: 'task-project-badge', style: { color: proj.color } }, proj.name));
    }
    card.appendChild(metaRow);

    // Description
    if (task.description) {
      card.appendChild(Utils.el('p', { className: 'task-desc' }, task.description));
    }

    // Tags
    if (task.tags && task.tags.length > 0) {
      var tagsDiv = Utils.el('div', { className: 'tags' });
      task.tags.forEach(function(tag) {
        tagsDiv.appendChild(Utils.el('span', { className: 'tag' }, '#' + tag));
      });
      card.appendChild(tagsDiv);
    }

    // Cost
    if (task.estimatedCost || task.actualCost) {
      var costRow = Utils.el('div', { className: 'task-cost-row' });
      if (task.estimatedCost) costRow.appendChild(Utils.el('span', { className: 'task-cost estimate' }, '~$' + task.estimatedCost));
      if (task.actualCost) costRow.appendChild(Utils.el('span', { className: 'task-cost actual' }, '$' + task.actualCost));
      card.appendChild(costRow);
    }

    // Model badge
    if (task.model) {
      var modelCls = 'model-badge';
      if (task.model.includes('opus')) modelCls += ' opus';
      else if (task.model.includes('sonnet')) modelCls += ' sonnet';
      else if (task.model.includes('haiku')) modelCls += ' haiku';
      else if (task.model.includes('grok')) modelCls += ' grok';
      card.appendChild(Utils.el('span', { className: modelCls }, task.model));
    }

    // Progress bar
    if (task.progress > 0 && task.progress < 100) {
      var progBar = Utils.el('div', { className: 'progress-mini' },
        Utils.el('div', { className: 'fill', style: { width: task.progress + '%' } })
      );
      card.appendChild(progBar);
    }

    // Due date warning
    if (task.dueDate && task.status !== 'done') {
      var dueCls = 'task-due ';
      if (Utils.isOverdue(task.dueDate)) dueCls += 'overdue';
      else if (Utils.isToday(task.dueDate)) dueCls += 'today';
      else dueCls += 'upcoming';
      card.appendChild(Utils.el('div', { className: dueCls }, '📅 ' + Utils.formatDate(task.dueDate)));
    }

    return card;
  }

  function populateProjectDropdown(selectedId) {
    var select = document.getElementById('task-project');
    select.innerHTML = '';
    select.appendChild(Utils.el('option', { value: '' }, '— No Project —'));
    DataStore.getProjects().forEach(function(p) {
      var opt = Utils.el('option', { value: p.id }, p.name);
      if (p.id === selectedId) opt.selected = true;
      select.appendChild(opt);
    });
  }

  function openAddTaskModal(status) {
    var modal = document.getElementById('task-modal');
    if (!modal) return;
    modal.dataset.mode = 'add';
    populateProjectDropdown('');
    modal.dataset.taskId = '';
    document.getElementById('modal-title').textContent = 'New Task';
    document.getElementById('task-title').value = '';
    document.getElementById('task-desc').value = '';
    document.getElementById('task-status').value = status || 'todo';
    document.getElementById('task-priority').value = 'medium';
    document.getElementById('task-assignee').value = 'kris';
    document.getElementById('task-project').value = '';
    document.getElementById('task-tags').value = '';
    document.getElementById('task-due-date').value = '';
    document.getElementById('task-est-cost').value = '';
    document.getElementById('task-act-cost').value = '';
    document.getElementById('task-model').value = '';
    document.getElementById('task-progress').value = '0';
    document.getElementById('task-progress-val').textContent = '0%';
    document.getElementById('task-delete-btn').style.display = 'none';
    Utils.openModal('task-modal');
  }

  function openEditTaskModal(taskId) {
    var task = DataStore.getTask(taskId);
    if (!task) return;
    var modal = document.getElementById('task-modal');
    modal.dataset.mode = 'edit';
    modal.dataset.taskId = taskId;
    populateProjectDropdown(task.projectId);
    document.getElementById('modal-title').textContent = 'Edit Task';
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-desc').value = task.description || '';
    document.getElementById('task-status').value = task.status;
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('task-assignee').value = task.assignee || '';
    document.getElementById('task-project').value = task.projectId || '';
    document.getElementById('task-tags').value = (task.tags || []).join(', ');
    document.getElementById('task-due-date').value = task.dueDate ? task.dueDate.slice(0, 10) : '';
    document.getElementById('task-est-cost').value = task.estimatedCost || '';
    document.getElementById('task-act-cost').value = task.actualCost || '';
    document.getElementById('task-model').value = task.model || '';
    document.getElementById('task-progress').value = task.progress || 0;
    document.getElementById('task-progress-val').textContent = (task.progress || 0) + '%';
    document.getElementById('task-delete-btn').style.display = 'inline-block';
    Utils.openModal('task-modal');
  }

  function saveTask() {
    var modal = document.getElementById('task-modal');
    var mode = modal.dataset.mode;
    var taskId = modal.dataset.taskId;
    var title = document.getElementById('task-title').value.trim();
    if (!title) { Utils.toast('Title is required', 'warning'); return; }

    var tagsRaw = document.getElementById('task-tags').value.trim();
    var tags = tagsRaw ? tagsRaw.split(',').map(function(t) { return t.trim().replace(/^#/, ''); }).filter(Boolean) : [];

    var taskData = {
      title: title,
      description: document.getElementById('task-desc').value.trim(),
      status: document.getElementById('task-status').value,
      priority: document.getElementById('task-priority').value,
      assignee: document.getElementById('task-assignee').value,
      projectId: document.getElementById('task-project').value,
      tags: tags,
      dueDate: document.getElementById('task-due-date').value || null,
      estimatedCost: parseFloat(document.getElementById('task-est-cost').value) || null,
      actualCost: parseFloat(document.getElementById('task-act-cost').value) || null,
      model: document.getElementById('task-model').value || null,
      progress: parseInt(document.getElementById('task-progress').value) || 0
    };

    if (mode === 'add') {
      DataStore.createTask(taskData);
      Utils.toast('Task created', 'success');
    } else {
      DataStore.updateTask(taskId, taskData);
      Utils.toast('Task updated', 'success');
    }
    Utils.closeModal('task-modal');
    render();
  }

  function deleteCurrentTask() {
    var modal = document.getElementById('task-modal');
    var taskId = modal.dataset.taskId;
    if (!taskId) return;
    if (confirm('Delete this task? This cannot be undone.')) {
      DataStore.deleteTask(taskId);
      Utils.closeModal('task-modal');
      Utils.toast('Task deleted', 'info');
      render();
    }
  }

  function setupSwipe() {
    var touchStartX = 0;
    var colOrder = ['blocked', 'todo', 'onhold', 'progress', 'done'];
    document.addEventListener('touchstart', function(e) { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
    document.addEventListener('touchend', function(e) {
      if (!document.getElementById('board-tab').classList.contains('active')) return;
      var diff = touchStartX - e.changedTouches[0].screenX;
      if (Math.abs(diff) < 50) return;
      var activeBtn = document.querySelector('.mobile-column-btn.active');
      if (!activeBtn) return;
      var idx = colOrder.indexOf(activeBtn.dataset.col);
      var nextIdx = diff > 0 ? idx + 1 : idx - 1;
      if (nextIdx >= 0 && nextIdx < colOrder.length) {
        var nextBtn = document.querySelector('.mobile-column-btn[data-col="' + colOrder[nextIdx] + '"]');
        if (nextBtn) nextBtn.click();
      }
    }, { passive: true });
  }

  function init() {
    // Save/delete button handlers
    document.getElementById('task-save-btn').addEventListener('click', saveTask);
    document.getElementById('task-delete-btn').addEventListener('click', deleteCurrentTask);

    // Progress slider
    var slider = document.getElementById('task-progress');
    if (slider) {
      slider.addEventListener('input', function() {
        document.getElementById('task-progress-val').textContent = this.value + '%';
      });
    }

    // Listen for data changes
    DataStore.on('dataChanged', function() {
      if (document.getElementById('board-tab').classList.contains('active')) {
        render();
      }
    });
  }

  return { render: render, init: init };
})();
