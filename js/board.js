'use strict';

/**
 * board.js — Kanban board with drag-and-drop, reorder, touch, task detail modal
 */

var Board = (function() {
  var draggedTaskId = null;
  var currentFilter = { assignee: 'all' };
  var editingTaskId = null; // track which task is being edited in the modal
  var timerDisplayInterval = null;

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
    filterBar.appendChild(Utils.el('span', { className: 'filter-label' }, 'Filter: '));
    filterBar.appendChild(Utils.el('button', {
      className: 'filter-btn' + (currentFilter.assignee === 'all' ? ' active' : ''),
      onClick: function() { currentFilter.assignee = 'all'; render(); }
    }, '👥 All'));
    Object.keys(Utils.teamMembers).forEach(function(id) {
      var m = Utils.teamMembers[id];
      filterBar.appendChild(Utils.el('button', {
        className: 'filter-btn' + (currentFilter.assignee === id ? ' active' : ''),
        onClick: function() { currentFilter.assignee = id; render(); }
      }, m.emoji + ' ' + m.name));
    });

    // New from template button
    var templates = DataStore.getTemplates();
    if (templates.length > 0) {
      filterBar.appendChild(Utils.el('span', { style: { flex: '1' } }));
      filterBar.appendChild(Utils.el('button', {
        className: 'btn btn-secondary btn-sm',
        onClick: function() { App.openQuickAdd(); }
      }, '⚡ Quick Add'));
    }
    container.appendChild(filterBar);

    // Stats bar
    var stats = DataStore.getStats();
    var statsBar = Utils.el('div', { className: 'stats' });
    [
      { num: stats.blocked, label: 'Blocked', color: '#f44336' },
      { num: stats.todo, label: 'To-Do', color: '#ff9800' },
      { num: stats.onhold, label: 'On Hold', color: '#9e9e9e' },
      { num: stats.inProgress, label: 'In Progress', color: '#2196f3' },
      { num: stats.done, label: 'Done', color: '#4caf50' }
    ].forEach(function(s) {
      statsBar.appendChild(Utils.el('div', { className: 'stat' },
        Utils.el('div', { className: 'num', style: { color: s.color } }, String(s.num)),
        Utils.el('div', { className: 'label' }, s.label)
      ));
    });
    container.appendChild(statsBar);

    // Mobile column selector
    var mobileSelector = Utils.el('div', { className: 'mobile-column-selector' });
    columns.forEach(function(col, i) {
      mobileSelector.appendChild(Utils.el('button', {
        className: 'mobile-column-btn ' + col.cls + (i === 3 ? ' active' : ''),
        dataset: { col: col.cls },
        onClick: function() {
          document.querySelectorAll('.mobile-column-btn').forEach(function(b) { b.classList.remove('active'); });
          this.classList.add('active');
          document.querySelectorAll('.column').forEach(function(c) { c.classList.remove('mobile-active'); });
          document.querySelector('.column.' + col.cls).classList.add('mobile-active');
        }
      }, col.label.split(' ').slice(0,2).join(' ')));
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
      header.appendChild(Utils.el('button', { className: 'add-task-btn', onClick: function() { openAddTaskModal(col.status); } }, '+'));
      header.appendChild(Utils.el('span', null, col.label));
      header.appendChild(Utils.el('span', { style: { width: '24px' } }));
      column.appendChild(header);

      var tasksContainer = Utils.el('div', { className: 'tasks-container', dataset: { status: col.status } });

      var tasks = DataStore.getTasks({ status: col.status });
      if (currentFilter.assignee !== 'all') {
        tasks = tasks.filter(function(t) { return t.assignee === currentFilter.assignee; });
      }

      // Sort: overdue first, then by order, then by priority
      tasks.sort(function(a, b) {
        var aOverdue = (a.status !== 'done' && Utils.isOverdue(a.dueDate)) ? 0 : 1;
        var bOverdue = (b.status !== 'done' && Utils.isOverdue(b.dueDate)) ? 0 : 1;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        if ((a.order || 0) !== (b.order || 0)) return (a.order || 0) - (b.order || 0);
        var pOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return (pOrder[a.priority] || 3) - (pOrder[b.priority] || 3);
      });

      if (tasks.length === 0) {
        tasksContainer.appendChild(Utils.el('div', { className: 'empty' }, 'No tasks'));
      } else {
        tasks.forEach(function(task, idx) {
          // Drop indicator before each card
          var indicator = Utils.el('div', { className: 'drop-indicator', dataset: { dropIndex: String(idx) } });
          tasksContainer.appendChild(indicator);
          tasksContainer.appendChild(renderTaskCard(task));
        });
        // Final drop indicator
        tasksContainer.appendChild(Utils.el('div', { className: 'drop-indicator', dataset: { dropIndex: String(tasks.length) } }));
      }

      // Drag and drop on column
      column.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        // Show nearest drop indicator
        var rect = tasksContainer.getBoundingClientRect();
        var y = e.clientY - rect.top;
        var indicators = tasksContainer.querySelectorAll('.drop-indicator');
        indicators.forEach(function(ind) { ind.classList.remove('visible'); });
        var closest = null;
        var closestDist = Infinity;
        indicators.forEach(function(ind) {
          var indRect = ind.getBoundingClientRect();
          var dist = Math.abs(e.clientY - indRect.top);
          if (dist < closestDist) { closestDist = dist; closest = ind; }
        });
        if (closest) closest.classList.add('visible');
      });
      column.addEventListener('dragenter', function(e) { e.preventDefault(); column.classList.add('drag-over'); });
      column.addEventListener('dragleave', function(e) {
        if (!column.contains(e.relatedTarget)) {
          column.classList.remove('drag-over');
          tasksContainer.querySelectorAll('.drop-indicator').forEach(function(ind) { ind.classList.remove('visible'); });
        }
      });
      column.addEventListener('drop', function(e) {
        e.preventDefault();
        column.classList.remove('drag-over');
        tasksContainer.querySelectorAll('.drop-indicator').forEach(function(ind) { ind.classList.remove('visible'); });
        if (!draggedTaskId) return;

        // Check dependencies if moving to done
        if (col.status === 'done' && DataStore.hasUnresolvedBlockers(draggedTaskId)) {
          Utils.toast('Cannot move to Done — task has unresolved blockers!', 'warning');
          draggedTaskId = null;
          return;
        }

        // Find drop index
        var dropIdx = 0;
        var visibleInd = tasksContainer.querySelector('.drop-indicator.visible');
        if (visibleInd) dropIdx = parseInt(visibleInd.dataset.dropIndex) || 0;

        var task = DataStore.getTask(draggedTaskId);
        if (task && task.status === col.status) {
          // Reorder within same column
          DataStore.reorderTask(draggedTaskId, dropIdx, col.status);
        } else {
          DataStore.updateTask(draggedTaskId, { status: col.status });
          DataStore.reorderTask(draggedTaskId, dropIdx, col.status);
        }
        draggedTaskId = null;
        render();
      });

      column.appendChild(tasksContainer);
      board.appendChild(column);
    });

    container.appendChild(board);
    setupMobileSwipe();
    startTimerDisplay();
  }

  function renderTaskCard(task) {
    var proj = DataStore.getProject(task.projectId);
    var assignee = Utils.getAssignee(task.assignee);
    var urgency = Utils.getDueUrgency(task.dueDate, task.status);
    var urgencyClass = '';
    if (urgency === 'overdue') urgencyClass = ' overdue-glow';
    else if (urgency === 'today') urgencyClass = ' due-today-glow';
    else if (urgency === 'this-week') urgencyClass = ' due-week-glow';

    var card = Utils.el('div', {
      className: 'task' + urgencyClass,
      draggable: 'true',
      dataset: { taskId: task.id },
      style: { borderLeftColor: proj ? proj.color : Utils.statusColor(task.status) }
    });

    // Desktop drag
    card.addEventListener('dragstart', function(e) {
      draggedTaskId = task.id;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(function() { card.classList.add('drag-ghost'); }, 0);
    });
    card.addEventListener('dragend', function() {
      card.classList.remove('dragging', 'drag-ghost');
      document.querySelectorAll('.column').forEach(function(c) { c.classList.remove('drag-over'); });
      document.querySelectorAll('.drop-indicator').forEach(function(d) { d.classList.remove('visible'); });
      draggedTaskId = null;
    });

    // Touch support for mobile
    var touchStartX = 0, touchStartY = 0, touchMoved = false;
    card.addEventListener('touchstart', function(e) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchMoved = false;
    }, { passive: true });
    card.addEventListener('touchmove', function(e) {
      var dx = e.touches[0].clientX - touchStartX;
      var dy = e.touches[0].clientY - touchStartY;
      if (Math.abs(dx) > 15 || Math.abs(dy) > 15) touchMoved = true;
    }, { passive: true });
    card.addEventListener('touchend', function(e) {
      if (!touchMoved) {
        openEditTaskModal(task.id);
      }
      // Swipe left detection
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (dx < -80) {
        // Quick delete confirmation
        if (confirm('Delete "' + task.title + '"?')) {
          DataStore.deleteTask(task.id);
          render();
        }
      }
    }, { passive: true });

    card.addEventListener('click', function(e) {
      if (e.target.closest('.timer-btn')) return; // Don't open modal when clicking timer
      openEditTaskModal(task.id);
    });

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
      card.appendChild(Utils.el('p', { className: 'task-desc' }, task.description.length > 80 ? task.description.slice(0, 80) + '…' : task.description));
    }

    // Tags
    if (task.tags && task.tags.length > 0) {
      var tagsDiv = Utils.el('div', { className: 'tags' });
      task.tags.forEach(function(tag) {
        tagsDiv.appendChild(Utils.el('span', { className: 'tag' }, '#' + tag));
      });
      card.appendChild(tagsDiv);
    }

    // Indicators row (subtasks, comments, links, dependencies, timer)
    var indicators = Utils.el('div', { className: 'task-indicators' });
    var hasIndicators = false;

    if (task.subtasks && task.subtasks.length > 0) {
      var done = task.subtasks.filter(function(s) { return s.completed; }).length;
      indicators.appendChild(Utils.el('span', { className: 'task-indicator subtask-indicator' }, '☑ ' + done + '/' + task.subtasks.length));
      hasIndicators = true;
    }
    if (task.comments && task.comments.length > 0) {
      indicators.appendChild(Utils.el('span', { className: 'task-indicator comment-indicator' }, '💬 ' + task.comments.length));
      hasIndicators = true;
    }
    if (task.links && task.links.length > 0) {
      indicators.appendChild(Utils.el('span', { className: 'task-indicator link-indicator' }, '🔗 ' + task.links.length));
      hasIndicators = true;
    }
    if (task.blockedBy && task.blockedBy.length > 0) {
      var unresolvedCount = task.blockedBy.filter(function(bid) {
        var b = DataStore.getTask(bid);
        return b && b.status !== 'done';
      }).length;
      if (unresolvedCount > 0) {
        indicators.appendChild(Utils.el('span', { className: 'task-indicator blocked-indicator' }, '🚫 ' + unresolvedCount + ' blocker' + (unresolvedCount > 1 ? 's' : '')));
        hasIndicators = true;
      }
    }
    if (task.totalTimeMs > 0) {
      indicators.appendChild(Utils.el('span', { className: 'task-indicator' }, '⏱ ' + Utils.formatDuration(task.totalTimeMs)));
      hasIndicators = true;
    }

    // Timer button
    var activeTimer = DataStore.getActiveTimer();
    var isRunning = activeTimer === task.id;
    var timerBtn = Utils.el('button', {
      className: 'timer-btn' + (isRunning ? ' running' : ''),
      onClick: function(e) {
        e.stopPropagation();
        if (isRunning) {
          DataStore.stopTimer(task.id);
        } else {
          DataStore.startTimer(task.id, task.assignee || 'system');
        }
        render();
      }
    }, isRunning ? '⏹' : '▶');
    if (isRunning) {
      timerBtn.dataset.timerTask = task.id;
    }
    indicators.appendChild(timerBtn);
    hasIndicators = true;

    if (hasIndicators) card.appendChild(indicators);

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
      card.appendChild(Utils.el('div', { className: 'progress-mini' },
        Utils.el('div', { className: 'fill', style: { width: task.progress + '%' } })
      ));
    }

    // Due date
    if (task.dueDate && task.status !== 'done') {
      var dueCls = 'task-due ';
      if (urgency === 'overdue') dueCls += 'overdue';
      else if (urgency === 'today') dueCls += 'today';
      else if (urgency === 'this-week') dueCls += 'this-week';
      else dueCls += 'upcoming';
      var prefix = urgency === 'overdue' ? '🔴 ' : urgency === 'today' ? '🟠 ' : urgency === 'this-week' ? '🟡 ' : '📅 ';
      card.appendChild(Utils.el('div', { className: dueCls }, prefix + Utils.formatDate(task.dueDate)));
    }

    return card;
  }

  function startTimerDisplay() {
    if (timerDisplayInterval) clearInterval(timerDisplayInterval);
    timerDisplayInterval = setInterval(function() {
      var activeTimer = DataStore.getActiveTimer();
      if (!activeTimer) return;
      var elapsed = DataStore.getRunningTimerElapsed();
      var btn = document.querySelector('.timer-btn[data-timer-task="' + activeTimer + '"]');
      if (btn) {
        btn.textContent = '⏹ ' + Utils.formatDuration(elapsed);
      }
    }, 1000);
  }

  function populateProjectDropdown(selectId, selectedId) {
    var select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '';
    select.appendChild(Utils.el('option', { value: '' }, '— No Project —'));
    DataStore.getProjects().forEach(function(p) {
      var opt = Utils.el('option', { value: p.id }, p.name);
      if (p.id === selectedId) opt.selected = true;
      select.appendChild(opt);
    });
  }

  function openAddTaskModal(status) {
    editingTaskId = null;
    var modal = document.getElementById('task-modal');
    modal.dataset.mode = 'add';
    modal.dataset.taskId = '';
    populateProjectDropdown('task-project', '');
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
    // Reset modal tabs to details
    switchModalTab('details');
    // Clear subtabs
    document.getElementById('subtask-list').innerHTML = '';
    document.getElementById('comments-list').innerHTML = '';
    document.getElementById('links-list').innerHTML = '';
    document.getElementById('dependency-list').innerHTML = '';
    document.getElementById('task-activity-list').innerHTML = '';
    Utils.openModal('task-modal');
  }

  function openEditTaskModal(taskId) {
    var task = DataStore.getTask(taskId);
    if (!task) return;
    editingTaskId = taskId;
    var modal = document.getElementById('task-modal');
    modal.dataset.mode = 'edit';
    modal.dataset.taskId = taskId;
    populateProjectDropdown('task-project', task.projectId);
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

    switchModalTab('details');
    renderSubtasks(task);
    renderComments(task);
    renderLinks(task);
    renderDependencies(task);
    renderTaskActivity(task);

    Utils.openModal('task-modal');
  }

  function switchModalTab(tabName) {
    document.querySelectorAll('.modal-tab-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.modalTab === tabName);
    });
    document.querySelectorAll('.modal-tab-content').forEach(function(panel) {
      panel.classList.toggle('active', panel.dataset.modalPanel === tabName);
    });
  }

  function renderSubtasks(task) {
    var list = document.getElementById('subtask-list');
    list.innerHTML = '';
    if (!task.subtasks) return;
    task.subtasks.forEach(function(st) {
      var item = Utils.el('div', { className: 'subtask-item' });
      var cb = Utils.el('input', { type: 'checkbox' });
      cb.checked = st.completed;
      cb.addEventListener('change', function() {
        DataStore.toggleSubtask(task.id, st.id);
        renderSubtasks(DataStore.getTask(task.id));
        // Update progress display
        var t = DataStore.getTask(task.id);
        if (t) {
          document.getElementById('task-progress').value = t.progress;
          document.getElementById('task-progress-val').textContent = t.progress + '%';
        }
      });
      item.appendChild(cb);
      item.appendChild(Utils.el('span', { className: 'subtask-text' + (st.completed ? ' completed' : '') }, st.text));
      var removeBtn = Utils.el('button', { className: 'subtask-remove', onClick: function() {
        DataStore.removeSubtask(task.id, st.id);
        renderSubtasks(DataStore.getTask(task.id));
      }}, '×');
      item.appendChild(removeBtn);
      list.appendChild(item);
    });
  }

  function renderComments(task) {
    var list = document.getElementById('comments-list');
    list.innerHTML = '';
    if (!task.comments) return;
    task.comments.forEach(function(c) {
      var assignee = Utils.getAssignee(c.by);
      list.appendChild(Utils.el('div', { className: 'comment-item' },
        Utils.el('div', { className: 'comment-header' },
          Utils.el('span', { className: 'comment-author' }, assignee.emoji + ' ' + assignee.name),
          Utils.el('span', { className: 'comment-time' }, Utils.timeAgo(c.timestamp))
        ),
        Utils.el('div', { className: 'comment-text' }, c.text)
      ));
    });
    list.scrollTop = list.scrollHeight;
  }

  function renderLinks(task) {
    var list = document.getElementById('links-list');
    list.innerHTML = '';
    if (!task.links) return;
    task.links.forEach(function(lnk) {
      var item = Utils.el('div', { className: 'link-item' },
        Utils.el('span', null, '🔗'),
        Utils.el('a', { href: Utils.sanitizeUrl(lnk.url), target: '_blank', rel: 'noopener noreferrer' }, lnk.label || lnk.url),
        Utils.el('button', { className: 'link-remove', onClick: function() {
          DataStore.removeLink(task.id, lnk.id);
          renderLinks(DataStore.getTask(task.id));
        }}, '×')
      );
      list.appendChild(item);
    });
  }

  function renderDependencies(task) {
    var list = document.getElementById('dependency-list');
    list.innerHTML = '';
    var select = document.getElementById('dependency-select');
    select.innerHTML = '';
    select.appendChild(Utils.el('option', { value: '' }, '— Select a task —'));

    // Show current blockers
    if (task.blockedBy) {
      task.blockedBy.forEach(function(bid) {
        var blocker = DataStore.getTask(bid);
        if (!blocker) return;
        var isDone = blocker.status === 'done';
        list.appendChild(Utils.el('div', { className: 'dependency-item' },
          Utils.el('span', { className: 'dep-status' }, isDone ? '✅' : '🔴'),
          Utils.el('span', { className: 'dep-name' }, blocker.title),
          Utils.el('button', { className: 'dep-remove', onClick: function() {
            DataStore.removeBlocker(task.id, bid);
            renderDependencies(DataStore.getTask(task.id));
          }}, '×')
        ));
      });
    }
    if (!task.blockedBy || task.blockedBy.length === 0) {
      list.appendChild(Utils.el('div', { className: 'empty-state', style: { padding: '10px' } }, 'No blockers'));
    }

    // Populate dropdown with other tasks
    DataStore.getTasks().forEach(function(t) {
      if (t.id === task.id) return;
      if (task.blockedBy && task.blockedBy.indexOf(t.id) >= 0) return;
      select.appendChild(Utils.el('option', { value: t.id }, t.title));
    });
  }

  function renderTaskActivity(task) {
    var list = document.getElementById('task-activity-list');
    list.innerHTML = '';
    var activities = (task.activityLog || []).slice().reverse();
    if (activities.length === 0) {
      list.appendChild(Utils.el('div', { className: 'empty-state' }, 'No activity'));
      return;
    }
    activities.forEach(function(a) {
      var assignee = Utils.getAssignee(a.by);
      list.appendChild(Utils.el('div', { className: 'task-activity-item' },
        Utils.el('span', null, assignee.emoji),
        Utils.el('span', null, a.action),
        Utils.el('span', { className: 'act-time' }, Utils.timeAgo(a.timestamp))
      ));
    });
  }

  function saveTask() {
    var modal = document.getElementById('task-modal');
    var mode = modal.dataset.mode;
    var taskId = modal.dataset.taskId;
    var title = document.getElementById('task-title').value.trim();
    if (!title) { Utils.toast('Title is required', 'warning'); return; }

    var tagsRaw = document.getElementById('task-tags').value.trim();
    var tags = tagsRaw ? tagsRaw.split(',').map(function(t) { return t.trim().replace(/^#/, ''); }).filter(Boolean) : [];

    var newStatus = document.getElementById('task-status').value;

    // Check dependencies when moving to done
    if (mode === 'edit' && newStatus === 'done' && taskId && DataStore.hasUnresolvedBlockers(taskId)) {
      Utils.toast('Cannot mark as Done — has unresolved blockers!', 'warning');
      return;
    }

    var taskData = {
      title: title,
      description: document.getElementById('task-desc').value.trim(),
      status: newStatus,
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
    editingTaskId = null;
    Utils.closeModal('task-modal');
    render();
  }

  function deleteCurrentTask() {
    var modal = document.getElementById('task-modal');
    var taskId = modal.dataset.taskId;
    if (!taskId) return;
    if (confirm('Delete this task? This cannot be undone.')) {
      DataStore.deleteTask(taskId);
      editingTaskId = null;
      Utils.closeModal('task-modal');
      Utils.toast('Task deleted', 'info');
      render();
    }
  }

  function setupMobileSwipe() {
    // Column swipe for mobile
    var touchStartX = 0;
    var colOrder = ['blocked', 'todo', 'onhold', 'progress', 'done'];
    var boardTab = document.getElementById('board-tab');
    if (!boardTab) return;

    boardTab.addEventListener('touchstart', function(e) {
      if (e.target.closest('.task')) return; // Don't swipe from task cards
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    boardTab.addEventListener('touchend', function(e) {
      if (e.target.closest('.task')) return;
      if (!boardTab.classList.contains('active')) return;
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
    // Save/delete
    document.getElementById('task-save-btn').addEventListener('click', saveTask);
    document.getElementById('task-delete-btn').addEventListener('click', deleteCurrentTask);

    // Progress slider
    var slider = document.getElementById('task-progress');
    if (slider) {
      slider.addEventListener('input', function() {
        document.getElementById('task-progress-val').textContent = this.value + '%';
      });
    }

    // Modal tab switching
    document.querySelectorAll('.modal-tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        switchModalTab(this.dataset.modalTab);
      });
    });

    // Add subtask
    document.getElementById('subtask-add-btn').addEventListener('click', function() {
      var input = document.getElementById('subtask-input');
      var text = input.value.trim();
      if (!text || !editingTaskId) {
        if (!editingTaskId) Utils.toast('Save the task first before adding subtasks', 'warning');
        return;
      }
      DataStore.addSubtask(editingTaskId, text);
      input.value = '';
      renderSubtasks(DataStore.getTask(editingTaskId));
    });
    document.getElementById('subtask-input').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') document.getElementById('subtask-add-btn').click();
    });

    // Add comment
    document.getElementById('comment-add-btn').addEventListener('click', function() {
      var input = document.getElementById('comment-input');
      var text = input.value.trim();
      if (!text || !editingTaskId) return;
      var by = document.getElementById('comment-author').value;
      DataStore.addComment(editingTaskId, text, by);
      input.value = '';
      renderComments(DataStore.getTask(editingTaskId));
    });
    document.getElementById('comment-input').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') document.getElementById('comment-add-btn').click();
    });

    // Add link
    document.getElementById('link-add-btn').addEventListener('click', function() {
      var label = document.getElementById('link-label').value.trim();
      var url = document.getElementById('link-url').value.trim();
      if (!url || !editingTaskId) return;
      var safeUrl = Utils.sanitizeUrl(url);
      if (!safeUrl) { Utils.toast('Invalid URL', 'warning'); return; }
      DataStore.addLink(editingTaskId, label || safeUrl, safeUrl);
      document.getElementById('link-label').value = '';
      document.getElementById('link-url').value = '';
      renderLinks(DataStore.getTask(editingTaskId));
    });

    // Add dependency
    document.getElementById('dependency-add-btn').addEventListener('click', function() {
      var select = document.getElementById('dependency-select');
      var blockerId = select.value;
      if (!blockerId || !editingTaskId) return;
      DataStore.addBlocker(editingTaskId, blockerId);
      renderDependencies(DataStore.getTask(editingTaskId));
    });

    // Data change listener
    DataStore.on('dataChanged', function() {
      if (document.getElementById('board-tab').classList.contains('active')) {
        render();
      }
    });
  }

  return { render: render, init: init, openAddTaskModal: openAddTaskModal };
})();
