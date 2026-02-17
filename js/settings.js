'use strict';

/**
 * settings.js — Settings, templates, print, theme, data management
 */

var Settings = (function() {

  function render() {
    var container = document.getElementById('settings-tab');
    if (!container) return;
    container.innerHTML = '';

    container.appendChild(Utils.el('h2', { style: { marginBottom: '24px' } }, '⚙️ Settings'));

    // Theme section
    var themeSection = Utils.el('div', { className: 'settings-section' });
    themeSection.appendChild(Utils.el('h3', null, '🎨 Theme'));
    themeSection.appendChild(Utils.el('p', { className: 'settings-desc' }, 'Switch between dark and light themes.'));
    var currentTheme = DataStore.getSettings().theme || 'dark';
    var themeRow = Utils.el('div', { style: { display: 'flex', gap: '8px' } });
    themeRow.appendChild(Utils.el('button', {
      className: 'btn ' + (currentTheme === 'dark' ? 'btn-primary' : 'btn-secondary'),
      onClick: function() { App.setTheme('dark'); render(); }
    }, '🌙 Dark'));
    themeRow.appendChild(Utils.el('button', {
      className: 'btn ' + (currentTheme === 'light' ? 'btn-primary' : 'btn-secondary'),
      onClick: function() { App.setTheme('light'); render(); }
    }, '☀️ Light'));
    themeSection.appendChild(themeRow);
    container.appendChild(themeSection);

    // Templates section
    var tmplSection = Utils.el('div', { className: 'settings-section' });
    tmplSection.appendChild(Utils.el('h3', null, '📝 Task Templates'));
    tmplSection.appendChild(Utils.el('p', { className: 'settings-desc' }, 'Pre-defined templates for quick task creation. Press "N" anywhere to quick-add.'));

    var templates = DataStore.getTemplates();
    var tmplList = Utils.el('div', { className: 'template-list' });
    if (templates.length === 0) {
      tmplList.appendChild(Utils.el('div', { className: 'empty-state' }, 'No templates yet.'));
    }
    templates.forEach(function(tmpl) {
      var proj = DataStore.getProject(tmpl.projectId);
      var assignee = Utils.getAssignee(tmpl.assignee);
      var item = Utils.el('div', { className: 'template-item', style: { borderLeftColor: proj ? proj.color : '#666' } },
        Utils.el('span', { className: 'template-name' }, tmpl.name),
        Utils.el('span', { className: 'template-meta' },
          assignee.emoji + ' ' + assignee.name +
          (proj ? ' • ' + proj.name : '') +
          ' • ' + Utils.priorityEmoji(tmpl.priority) + ' ' + tmpl.priority
        ),
        Utils.el('div', { className: 'template-actions' },
          Utils.el('button', { className: 'btn btn-danger btn-sm', onClick: function() {
            if (confirm('Delete template "' + tmpl.name + '"?')) {
              DataStore.deleteTemplate(tmpl.id);
              render();
            }
          }}, '×')
        )
      );
      tmplList.appendChild(item);
    });
    tmplSection.appendChild(tmplList);

    // Add template form
    tmplSection.appendChild(Utils.el('h3', { style: { marginTop: '16px' } }, 'Add Template'));
    var addForm = Utils.el('div');
    addForm.appendChild(Utils.el('div', { className: 'form-group' },
      Utils.el('label', null, 'Template Name'),
      Utils.el('input', { type: 'text', id: 'tmpl-name', placeholder: 'e.g. "Bug Fix Task"' })
    ));
    var row1 = Utils.el('div', { className: 'form-row' });
    var projGroup = Utils.el('div', { className: 'form-group' });
    projGroup.appendChild(Utils.el('label', null, 'Project'));
    var projSelect = Utils.el('select', { id: 'tmpl-project' });
    projSelect.appendChild(Utils.el('option', { value: '' }, '— None —'));
    DataStore.getProjects().forEach(function(p) {
      projSelect.appendChild(Utils.el('option', { value: p.id }, p.name));
    });
    projGroup.appendChild(projSelect);
    row1.appendChild(projGroup);

    var assGroup = Utils.el('div', { className: 'form-group' });
    assGroup.appendChild(Utils.el('label', null, 'Assignee'));
    var assSelect = Utils.el('select', { id: 'tmpl-assignee' });
    assSelect.appendChild(Utils.el('option', { value: '' }, 'Unassigned'));
    Object.keys(Utils.teamMembers).forEach(function(id) {
      var m = Utils.teamMembers[id];
      assSelect.appendChild(Utils.el('option', { value: id }, m.emoji + ' ' + m.name));
    });
    assGroup.appendChild(assSelect);
    row1.appendChild(assGroup);
    addForm.appendChild(row1);

    var row2 = Utils.el('div', { className: 'form-row' });
    var prioGroup = Utils.el('div', { className: 'form-group' });
    prioGroup.appendChild(Utils.el('label', null, 'Priority'));
    var prioSelect = Utils.el('select', { id: 'tmpl-priority' });
    ['critical','high','medium','low'].forEach(function(p) {
      prioSelect.appendChild(Utils.el('option', { value: p }, Utils.priorityEmoji(p) + ' ' + p));
    });
    prioSelect.value = 'medium';
    prioGroup.appendChild(prioSelect);
    row2.appendChild(prioGroup);

    var tagGroup = Utils.el('div', { className: 'form-group' });
    tagGroup.appendChild(Utils.el('label', null, 'Tags'));
    tagGroup.appendChild(Utils.el('input', { type: 'text', id: 'tmpl-tags', placeholder: 'comma-separated' }));
    row2.appendChild(tagGroup);
    addForm.appendChild(row2);

    addForm.appendChild(Utils.el('div', { className: 'form-group' },
      Utils.el('label', null, 'Description'),
      Utils.el('textarea', { id: 'tmpl-desc', placeholder: 'Template description...' })
    ));

    addForm.appendChild(Utils.el('button', { className: 'btn btn-primary', onClick: function() {
      var name = document.getElementById('tmpl-name').value.trim();
      if (!name) { Utils.toast('Template name required', 'warning'); return; }
      var tagsRaw = document.getElementById('tmpl-tags').value.trim();
      var tags = tagsRaw ? tagsRaw.split(',').map(function(t) { return t.trim(); }).filter(Boolean) : [];
      DataStore.createTemplate({
        name: name,
        projectId: document.getElementById('tmpl-project').value,
        assignee: document.getElementById('tmpl-assignee').value,
        priority: document.getElementById('tmpl-priority').value,
        tags: tags,
        description: document.getElementById('tmpl-desc').value.trim()
      });
      Utils.toast('Template created', 'success');
      render();
    }}, '+ Create Template'));
    tmplSection.appendChild(addForm);
    container.appendChild(tmplSection);

    // Print section
    var printSection = Utils.el('div', { className: 'settings-section' });
    printSection.appendChild(Utils.el('h3', null, '🖨️ Print Report'));
    printSection.appendChild(Utils.el('p', { className: 'settings-desc' }, 'Generate a clean printable report with project summaries and task lists.'));
    printSection.appendChild(Utils.el('button', { className: 'btn btn-primary', onClick: printReport }, '🖨️ Print Report'));
    container.appendChild(printSection);

    // Export
    var exportSection = Utils.el('div', { className: 'settings-section' });
    exportSection.appendChild(Utils.el('h3', null, '📤 Export Data'));
    exportSection.appendChild(Utils.el('p', { className: 'settings-desc' }, 'Download all your projects, tasks, and activity as a JSON file.'));
    exportSection.appendChild(Utils.el('button', { className: 'btn btn-primary', onClick: exportData }, '💾 Export JSON Backup'));
    container.appendChild(exportSection);

    // Import
    var importSection = Utils.el('div', { className: 'settings-section' });
    importSection.appendChild(Utils.el('h3', null, '📥 Import Data'));
    importSection.appendChild(Utils.el('p', { className: 'settings-desc' }, 'Restore from a previously exported JSON file. This will replace all current data.'));
    var fileInput = Utils.el('input', { type: 'file', id: 'import-file', accept: '.json', style: { display: 'none' } });
    fileInput.addEventListener('change', importDataHandler);
    importSection.appendChild(fileInput);
    importSection.appendChild(Utils.el('button', { className: 'btn btn-secondary', onClick: function() { fileInput.click(); } }, '📂 Choose File to Import'));
    container.appendChild(importSection);

    // Data stats
    var statsSection = Utils.el('div', { className: 'settings-section' });
    statsSection.appendChild(Utils.el('h3', null, '📊 Data Summary'));
    var stats = DataStore.getStats();
    statsSection.appendChild(Utils.el('div', { className: 'settings-stats' },
      Utils.el('div', null, 'Projects: ' + stats.totalProjects),
      Utils.el('div', null, 'Tasks: ' + stats.totalTasks),
      Utils.el('div', null, 'Templates: ' + DataStore.getTemplates().length),
      Utils.el('div', null, 'Activity entries: ' + DataStore.getActivity(999).length),
      Utils.el('div', null, 'Storage used: ' + getStorageSize())
    ));
    container.appendChild(statsSection);

    // Keyboard shortcuts
    var kbSection = Utils.el('div', { className: 'settings-section' });
    kbSection.appendChild(Utils.el('h3', null, '⌨️ Keyboard Shortcuts'));
    var shortcuts = [
      ['⌘/Ctrl + K', 'Focus search'],
      ['N', 'Quick add task'],
      ['Esc', 'Close modal']
    ];
    shortcuts.forEach(function(s) {
      kbSection.appendChild(Utils.el('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px' } },
        Utils.el('span', { style: { fontFamily: 'monospace', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '4px' } }, s[0]),
        Utils.el('span', { style: { color: 'var(--text-muted)' } }, s[1])
      ));
    });
    container.appendChild(kbSection);

    // Danger zone
    var dangerSection = Utils.el('div', { className: 'settings-section danger-zone' });
    dangerSection.appendChild(Utils.el('h3', null, '⚠️ Danger Zone'));
    dangerSection.appendChild(Utils.el('p', { className: 'settings-desc' }, 'This will permanently delete all projects, tasks, and activity. Export your data first!'));
    dangerSection.appendChild(Utils.el('button', { className: 'btn btn-danger', onClick: clearAllData }, '🗑️ Clear All Data'));
    container.appendChild(dangerSection);

    // About
    var aboutSection = Utils.el('div', { className: 'settings-section' });
    aboutSection.appendChild(Utils.el('h3', null, 'ℹ️ About'));
    aboutSection.appendChild(Utils.el('p', { className: 'settings-desc' },
      'AI Agent Command Center v2.5 — Built with zero external dependencies. All data stored locally in your browser. All 16 features enabled.'));
    aboutSection.appendChild(Utils.el('p', { className: 'settings-desc', style: { color: 'var(--text-faint)', fontSize: '11px' } },
      'Security: CSP enforced, no external calls, no tracking, localStorage only. Links open with noopener noreferrer.'));
    container.appendChild(aboutSection);
  }

  function printReport() {
    // Build a print-friendly div
    var container = document.getElementById('settings-tab');
    var printDiv = Utils.el('div', { className: 'print-report', style: { display: 'block' } });
    printDiv.appendChild(Utils.el('h1', null, '🎯 Command Center Report'));
    printDiv.appendChild(Utils.el('p', null, 'Generated: ' + new Date().toLocaleString()));

    // Stats
    var stats = DataStore.getStats();
    var statSection = Utils.el('div', { className: 'print-section' });
    statSection.appendChild(Utils.el('h2', null, 'Overview'));
    var table = Utils.el('table');
    table.appendChild(Utils.el('tr', null,
      Utils.el('th', null, 'Metric'), Utils.el('th', null, 'Value')
    ));
    [
      ['Total Projects', stats.totalProjects],
      ['Total Tasks', stats.totalTasks],
      ['In Progress', stats.inProgress],
      ['Completed This Week', stats.completedThisWeek],
      ['Blocked', stats.blocked],
      ['Overdue', stats.overdueTasks]
    ].forEach(function(r) {
      table.appendChild(Utils.el('tr', null,
        Utils.el('td', null, r[0]), Utils.el('td', null, String(r[1]))
      ));
    });
    statSection.appendChild(table);
    printDiv.appendChild(statSection);

    // Projects
    DataStore.getProjects().forEach(function(proj) {
      var section = Utils.el('div', { className: 'print-section' });
      section.appendChild(Utils.el('h2', null, proj.name + ' (' + Utils.projectStatusLabel(proj.status) + ')'));
      if (proj.description) section.appendChild(Utils.el('p', null, proj.description));

      var tasks = DataStore.getTasks({ projectId: proj.id });
      if (tasks.length > 0) {
        var tbl = Utils.el('table');
        tbl.appendChild(Utils.el('tr', null,
          Utils.el('th', null, 'Task'), Utils.el('th', null, 'Status'),
          Utils.el('th', null, 'Priority'), Utils.el('th', null, 'Assignee'),
          Utils.el('th', null, 'Due Date')
        ));
        tasks.forEach(function(t) {
          var assignee = Utils.getAssignee(t.assignee);
          tbl.appendChild(Utils.el('tr', null,
            Utils.el('td', null, t.title),
            Utils.el('td', null, Utils.statusLabel(t.status)),
            Utils.el('td', null, t.priority),
            Utils.el('td', null, assignee.name),
            Utils.el('td', null, t.dueDate ? Utils.formatDate(t.dueDate) : '—')
          ));
        });
        section.appendChild(tbl);
      }
      printDiv.appendChild(section);
    });

    // Team Workload
    var teamSection = Utils.el('div', { className: 'print-section' });
    teamSection.appendChild(Utils.el('h2', null, 'Team Workload'));
    var teamTbl = Utils.el('table');
    teamTbl.appendChild(Utils.el('tr', null,
      Utils.el('th', null, 'Member'), Utils.el('th', null, 'Total'),
      Utils.el('th', null, 'In Progress'), Utils.el('th', null, 'To-Do'), Utils.el('th', null, 'Done')
    ));
    Object.keys(Utils.teamMembers).forEach(function(id) {
      var m = Utils.teamMembers[id];
      var s = stats.byAssignee[id] || {};
      teamTbl.appendChild(Utils.el('tr', null,
        Utils.el('td', null, m.name),
        Utils.el('td', null, String(s.total || 0)),
        Utils.el('td', null, String(s['in-progress'] || 0)),
        Utils.el('td', null, String(s.todo || 0)),
        Utils.el('td', null, String(s.done || 0))
      ));
    });
    teamSection.appendChild(teamTbl);
    printDiv.appendChild(teamSection);

    // Temporarily add to DOM for printing
    container.appendChild(printDiv);

    // Add print class to settings tab
    document.querySelectorAll('.tab-content').forEach(function(tc) {
      tc.classList.remove('print-active');
    });
    document.getElementById('settings-tab').classList.add('print-active');

    window.print();

    // Clean up
    printDiv.remove();
    document.getElementById('settings-tab').classList.remove('print-active');
  }

  function exportData() {
    var json = DataStore.exportData();
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'command-center-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    Utils.toast('Data exported successfully', 'success');
  }

  function importDataHandler(e) {
    var file = e.target.files[0];
    if (!file) return;
    if (!confirm('This will replace ALL current data. Are you sure?')) {
      e.target.value = '';
      return;
    }
    var reader = new FileReader();
    reader.onload = function(ev) {
      var success = DataStore.importData(ev.target.result);
      if (success) {
        Utils.toast('Data imported successfully! Reloading...', 'success');
        setTimeout(function() { location.reload(); }, 1000);
      } else {
        Utils.toast('Import failed — invalid file format', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function clearAllData() {
    if (!confirm('⚠️ Delete ALL data? This cannot be undone!')) return;
    if (!confirm('Are you really sure? All projects and tasks will be lost.')) return;
    DataStore.clearAll();
    Utils.toast('All data cleared. Reloading...', 'info');
    setTimeout(function() { location.reload(); }, 1000);
  }

  function getStorageSize() {
    try {
      var data = localStorage.getItem('command_center_data') || '';
      var bytes = new Blob([data]).size;
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1048576).toFixed(1) + ' MB';
    } catch(e) { return 'Unknown'; }
  }

  return { render: render };
})();
