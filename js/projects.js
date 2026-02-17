'use strict';

/**
 * projects.js — Project management with color picker, detail views, activity
 */

var Projects = (function() {
  var detailProjectId = null;

  function render() {
    var container = document.getElementById('projects-tab');
    if (!container) return;
    container.innerHTML = '';

    if (detailProjectId) {
      renderDetail(container);
      return;
    }

    var header = Utils.el('div', { className: 'projects-header' },
      Utils.el('h2', null, '📁 Projects'),
      Utils.el('button', { className: 'btn btn-primary', onClick: function() { openProjectModal(); } }, '+ New Project')
    );
    container.appendChild(header);

    var projects = DataStore.getProjects();
    var grid = Utils.el('div', { className: 'projects-grid' });

    projects.forEach(function(proj) {
      var tasks = DataStore.getTasks({ projectId: proj.id });
      var done = tasks.filter(function(t) { return t.status === 'done'; }).length;
      var total = tasks.length;
      var pct = total > 0 ? Math.round((done / total) * 100) : 0;
      var inProg = tasks.filter(function(t) { return t.status === 'in-progress'; }).length;
      var blocked = tasks.filter(function(t) { return t.status === 'blocked'; }).length;

      var card = Utils.el('div', { className: 'project-card', style: { borderLeftColor: proj.color, borderLeftWidth: '4px' } });
      card.addEventListener('click', function() { showDetail(proj.id); });

      card.appendChild(Utils.el('div', { className: 'project-header' },
        Utils.el('h2', null, proj.name),
        Utils.el('span', { className: 'status-badge', style: { background: Utils.projectStatusColor(proj.status) } },
          Utils.projectStatusLabel(proj.status))
      ));
      if (proj.description) {
        card.appendChild(Utils.el('p', { className: 'project-desc' }, proj.description));
      }
      card.appendChild(Utils.el('div', { className: 'progress-bar' },
        Utils.el('div', { className: 'fill', style: { width: pct + '%', background: proj.color } })
      ));
      var meta = Utils.el('div', { className: 'project-meta' },
        Utils.el('span', null, Utils.priorityEmoji(proj.priority) + ' ' + proj.priority),
        Utils.el('span', null, '📋 ' + total + ' tasks'),
        Utils.el('span', null, '▶ ' + inProg + ' active'),
        Utils.el('span', null, '✅ ' + done + ' done')
      );
      if (blocked > 0) {
        meta.appendChild(Utils.el('span', { style: { color: '#f44336' } }, '🔴 ' + blocked + ' blocked'));
      }
      card.appendChild(meta);

      if (proj.assignees && proj.assignees.length > 0) {
        var assigneesDiv = Utils.el('div', { className: 'project-assignees' });
        proj.assignees.forEach(function(a) {
          var m = Utils.getAssignee(a);
          assigneesDiv.appendChild(Utils.el('span', { className: 'assignee-chip', title: m.name }, m.emoji));
        });
        card.appendChild(assigneesDiv);
      }
      grid.appendChild(card);
    });

    if (projects.length === 0) {
      grid.appendChild(Utils.el('div', { className: 'empty-state' }, 'No projects yet. Create one!'));
    }
    container.appendChild(grid);
  }

  function showDetail(projectId) {
    detailProjectId = projectId;
    render();
  }

  function hideDetail() {
    detailProjectId = null;
    render();
  }

  function renderDetail(container) {
    var proj = DataStore.getProject(detailProjectId);
    if (!proj) { hideDetail(); return; }

    var tasks = DataStore.getTasks({ projectId: proj.id });
    var done = tasks.filter(function(t) { return t.status === 'done'; }).length;
    var total = tasks.length;
    var pct = total > 0 ? Math.round((done / total) * 100) : 0;

    container.appendChild(Utils.el('button', { className: 'btn btn-secondary', onClick: hideDetail,
      style: { marginBottom: '20px' } }, '← Back to Projects'));

    // Header
    container.appendChild(Utils.el('div', { className: 'proj-detail-header', style: { borderLeftColor: proj.color } },
      Utils.el('div', { className: 'proj-detail-title-row' },
        Utils.el('h2', null, proj.name),
        Utils.el('span', { className: 'status-badge', style: { background: Utils.projectStatusColor(proj.status) } },
          Utils.projectStatusLabel(proj.status)),
        Utils.el('button', { className: 'btn btn-secondary btn-sm', onClick: function() { openProjectModal(proj.id); } }, '✏️ Edit')
      ),
      Utils.el('p', { className: 'proj-detail-desc' }, proj.description || 'No description'),
      Utils.el('div', { className: 'proj-detail-meta' },
        Utils.el('span', null, Utils.priorityEmoji(proj.priority) + ' Priority: ' + proj.priority),
        Utils.el('span', null, '📋 ' + total + ' tasks, ' + pct + '% complete')
      )
    ));

    // Progress breakdown
    var breakdown = Utils.el('div', { className: 'proj-section' });
    breakdown.appendChild(Utils.el('h3', null, '📊 Progress Breakdown'));
    var statusCounts = {};
    tasks.forEach(function(t) { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1; });
    var breakdownGrid = Utils.el('div', { className: 'breakdown-grid' });
    ['blocked','todo','onhold','in-progress','done'].forEach(function(s) {
      var count = statusCounts[s] || 0;
      var sPct = total > 0 ? Math.round((count / total) * 100) : 0;
      breakdownGrid.appendChild(Utils.el('div', { className: 'breakdown-item' },
        Utils.el('div', { className: 'breakdown-bar-wrap' },
          Utils.el('div', { className: 'breakdown-bar-fill', style: { width: sPct + '%', background: Utils.statusColor(s) } })
        ),
        Utils.el('span', { style: { color: Utils.statusColor(s) } }, Utils.statusLabel(s) + ' (' + count + ')')
      ));
    });
    breakdown.appendChild(breakdownGrid);
    container.appendChild(breakdown);

    // Links
    if (proj.links && proj.links.length > 0) {
      var linksSection = Utils.el('div', { className: 'proj-section' });
      linksSection.appendChild(Utils.el('h3', null, '🔗 Links'));
      proj.links.forEach(function(link) {
        linksSection.appendChild(Utils.el('a', { href: Utils.sanitizeUrl(link.url), target: '_blank', rel: 'noopener noreferrer', className: 'proj-link' }, link.label));
      });
      container.appendChild(linksSection);
    }

    // Milestones
    if (proj.milestones && proj.milestones.length > 0) {
      var msSection = Utils.el('div', { className: 'proj-section' });
      msSection.appendChild(Utils.el('h3', null, '🏁 Milestones'));
      proj.milestones.forEach(function(ms) {
        msSection.appendChild(Utils.el('div', { className: 'milestone-item ' + (ms.completed ? 'completed' : '') },
          Utils.el('span', { className: 'ms-check' }, ms.completed ? '✅' : '⬜'),
          Utils.el('span', { className: 'ms-name' }, ms.name),
          Utils.el('span', { className: 'ms-date' }, Utils.formatDate(ms.date))
        ));
      });
      container.appendChild(msSection);
    }

    // Tasks list
    var tasksSection = Utils.el('div', { className: 'proj-section' });
    tasksSection.appendChild(Utils.el('h3', null, '📋 Tasks'));
    if (tasks.length === 0) {
      tasksSection.appendChild(Utils.el('div', { className: 'empty-state' }, 'No tasks for this project.'));
    }
    tasks.forEach(function(t) {
      var assignee = Utils.getAssignee(t.assignee);
      var item = Utils.el('div', { className: 'proj-task-item' },
        Utils.el('span', { className: 'prio-dot', style: { background: Utils.priorityColor(t.priority) } }),
        Utils.el('span', { className: 'proj-task-status', style: { color: Utils.statusColor(t.status) } },
          t.status === 'done' ? '✅' : '○'),
        Utils.el('span', { className: 'proj-task-title' + (t.status === 'done' ? ' done' : '') }, t.title),
        Utils.el('span', { className: 'proj-task-assignee' }, assignee.emoji)
      );
      if (t.dueDate && t.status !== 'done') {
        var urgency = Utils.getDueUrgency(t.dueDate, t.status);
        if (urgency === 'overdue') {
          item.style.borderLeft = '3px solid #f44336';
        }
      }
      tasksSection.appendChild(item);
    });
    container.appendChild(tasksSection);

    // Project Activity (from global activity log)
    var actSection = Utils.el('div', { className: 'proj-section' });
    actSection.appendChild(Utils.el('h3', null, '📝 Activity'));
    var projActivity = DataStore.getActivityForProject(proj.id);
    // Also include task-level activity
    var allActivity = projActivity.slice();
    tasks.forEach(function(t) {
      if (t.activityLog) {
        t.activityLog.forEach(function(a) {
          allActivity.push({ timestamp: a.timestamp, details: t.title + ': ' + a.action, by: a.by });
        });
      }
    });
    allActivity.sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
    allActivity.slice(0, 15).forEach(function(a) {
      var assignee = Utils.getAssignee(a.by);
      actSection.appendChild(Utils.el('div', { className: 'proj-activity-item' },
        Utils.el('span', null, assignee.emoji),
        Utils.el('span', null, a.details || a.action),
        Utils.el('span', { className: 'act-time' }, Utils.timeAgo(a.timestamp))
      ));
    });
    if (allActivity.length === 0) {
      actSection.appendChild(Utils.el('div', { className: 'empty-state' }, 'No activity yet.'));
    }
    container.appendChild(actSection);
  }

  function openProjectModal(projectId) {
    var modal = document.getElementById('project-modal');
    var proj = projectId ? DataStore.getProject(projectId) : null;
    modal.dataset.mode = proj ? 'edit' : 'add';
    modal.dataset.projectId = projectId || '';
    document.getElementById('proj-modal-title').textContent = proj ? 'Edit Project' : 'New Project';
    document.getElementById('proj-name').value = proj ? proj.name : '';
    document.getElementById('proj-desc').value = proj ? (proj.description || '') : '';
    document.getElementById('proj-status').value = proj ? proj.status : 'planning';
    document.getElementById('proj-priority').value = proj ? proj.priority : 'medium';

    // Color picker grid
    var colorGrid = document.getElementById('proj-color-grid');
    colorGrid.innerHTML = '';
    var selectedColor = proj ? proj.color : '#2196f3';
    document.getElementById('proj-color').value = selectedColor;

    Utils.presetColors.forEach(function(c) {
      var swatch = Utils.el('div', {
        className: 'color-picker-swatch' + (c === selectedColor ? ' selected' : ''),
        style: { background: c },
        onClick: function() {
          document.getElementById('proj-color').value = c;
          colorGrid.querySelectorAll('.color-picker-swatch').forEach(function(s) { s.classList.remove('selected'); });
          swatch.classList.add('selected');
        }
      });
      colorGrid.appendChild(swatch);
    });

    document.querySelectorAll('.proj-assignee-cb').forEach(function(cb) {
      cb.checked = proj ? (proj.assignees || []).indexOf(cb.value) >= 0 : false;
    });

    document.getElementById('proj-delete-btn').style.display = proj ? 'inline-block' : 'none';
    Utils.openModal('project-modal');
  }

  function saveProject() {
    var modal = document.getElementById('project-modal');
    var mode = modal.dataset.mode;
    var projectId = modal.dataset.projectId;
    var name = document.getElementById('proj-name').value.trim();
    if (!name) { Utils.toast('Project name is required', 'warning'); return; }

    var assignees = [];
    document.querySelectorAll('.proj-assignee-cb:checked').forEach(function(cb) { assignees.push(cb.value); });

    var projData = {
      name: name,
      description: document.getElementById('proj-desc').value.trim(),
      status: document.getElementById('proj-status').value,
      priority: document.getElementById('proj-priority').value,
      color: document.getElementById('proj-color').value,
      assignees: assignees
    };

    if (mode === 'add') {
      DataStore.createProject(projData);
      Utils.toast('Project created', 'success');
    } else {
      DataStore.updateProject(projectId, projData);
      Utils.toast('Project updated', 'success');
    }
    Utils.closeModal('project-modal');
    render();
  }

  function deleteCurrentProject() {
    var modal = document.getElementById('project-modal');
    var projectId = modal.dataset.projectId;
    if (!projectId) return;
    if (confirm('Delete this project and all its tasks? This cannot be undone.')) {
      DataStore.deleteProject(projectId);
      Utils.closeModal('project-modal');
      detailProjectId = null;
      Utils.toast('Project deleted', 'info');
      render();
    }
  }

  function init() {
    document.getElementById('proj-save-btn').addEventListener('click', saveProject);
    document.getElementById('proj-delete-btn').addEventListener('click', deleteCurrentProject);

    DataStore.on('dataChanged', function() {
      if (document.getElementById('projects-tab').classList.contains('active')) {
        render();
      }
    });
  }

  return { render: render, init: init, showDetail: showDetail };
})();
