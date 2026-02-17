'use strict';

/**
 * settings.js — Settings, data export/import, clear
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
    themeSection.appendChild(Utils.el('p', { className: 'settings-desc' }, 'Dark theme is currently the only option. More themes coming soon.'));
    var themeBtn = Utils.el('button', { className: 'btn btn-secondary', disabled: true }, '🌙 Dark (Active)');
    themeSection.appendChild(themeBtn);
    container.appendChild(themeSection);

    // Export
    var exportSection = Utils.el('div', { className: 'settings-section' });
    exportSection.appendChild(Utils.el('h3', null, '📤 Export Data'));
    exportSection.appendChild(Utils.el('p', { className: 'settings-desc' }, 'Download all your projects, tasks, and activity as a JSON file.'));
    var exportBtn = Utils.el('button', { className: 'btn btn-primary', onClick: exportData }, '💾 Export JSON Backup');
    exportSection.appendChild(exportBtn);
    container.appendChild(exportSection);

    // Import
    var importSection = Utils.el('div', { className: 'settings-section' });
    importSection.appendChild(Utils.el('h3', null, '📥 Import Data'));
    importSection.appendChild(Utils.el('p', { className: 'settings-desc' }, 'Restore from a previously exported JSON file. This will replace all current data.'));
    var fileInput = Utils.el('input', { type: 'file', id: 'import-file', accept: '.json', style: { display: 'none' } });
    fileInput.addEventListener('change', importData);
    var importBtn = Utils.el('button', { className: 'btn btn-secondary', onClick: function() { fileInput.click(); } }, '📂 Choose File to Import');
    importSection.appendChild(fileInput);
    importSection.appendChild(importBtn);
    container.appendChild(importSection);

    // Data stats
    var statsSection = Utils.el('div', { className: 'settings-section' });
    statsSection.appendChild(Utils.el('h3', null, '📊 Data Summary'));
    var stats = DataStore.getStats();
    var statsGrid = Utils.el('div', { className: 'settings-stats' },
      Utils.el('div', null, 'Projects: ' + stats.totalProjects),
      Utils.el('div', null, 'Tasks: ' + stats.totalTasks),
      Utils.el('div', null, 'Activity entries: ' + DataStore.getActivity(999).length),
      Utils.el('div', null, 'Storage used: ' + getStorageSize())
    );
    statsSection.appendChild(statsGrid);
    container.appendChild(statsSection);

    // Danger zone
    var dangerSection = Utils.el('div', { className: 'settings-section danger-zone' });
    dangerSection.appendChild(Utils.el('h3', null, '⚠️ Danger Zone'));
    dangerSection.appendChild(Utils.el('p', { className: 'settings-desc' }, 'This will permanently delete all projects, tasks, and activity. Export your data first!'));
    var clearBtn = Utils.el('button', { className: 'btn btn-danger', onClick: clearAllData }, '🗑️ Clear All Data');
    dangerSection.appendChild(clearBtn);
    container.appendChild(dangerSection);

    // About
    var aboutSection = Utils.el('div', { className: 'settings-section' });
    aboutSection.appendChild(Utils.el('h3', null, 'ℹ️ About'));
    aboutSection.appendChild(Utils.el('p', { className: 'settings-desc' },
      'AI Agent Command Center v2.0 — Built with zero external dependencies. All data stored locally in your browser.'));
    aboutSection.appendChild(Utils.el('p', { className: 'settings-desc', style: { color: '#666', fontSize: '11px' } },
      'Security: CSP enforced, no external calls, no tracking, localStorage only.'));
    container.appendChild(aboutSection);
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

  function importData(e) {
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
