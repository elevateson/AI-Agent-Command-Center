'use strict';

/**
 * DataStore — API-ready data layer
 * Currently uses localStorage. Interface designed for easy swap to REST API.
 * Event system for reactive UI updates.
 */

var DataStore = (function() {
  var STORAGE_KEY = 'command_center_data';
  var listeners = {};
  var data = null;

  // ==================== EVENT SYSTEM ====================

  function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
  }

  function off(event, callback) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(function(cb) { return cb !== callback; });
  }

  function emit(event, payload) {
    if (!listeners[event]) return;
    listeners[event].forEach(function(cb) {
      try { cb(payload); } catch(e) { console.error('DataStore event error:', e); }
    });
  }

  // ==================== PERSISTENCE ====================

  function save() {
    data.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch(e) {
      console.error('DataStore save error:', e);
    }
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        data = JSON.parse(raw);
        // Migration: ensure all required fields exist
        if (!data.projects) data.projects = [];
        if (!data.tasks) data.tasks = [];
        if (!data.activityLog) data.activityLog = [];
        if (!data.settings) data.settings = getDefaultSettings();
        return true;
      }
    } catch(e) {
      console.error('DataStore load error:', e);
    }
    return false;
  }

  function getDefaultSettings() {
    return { theme: 'dark', createdAt: new Date().toISOString() };
  }

  // ==================== INITIALIZATION ====================

  function init() {
    if (!load()) {
      data = {
        projects: [],
        tasks: [],
        activityLog: [],
        settings: getDefaultSettings(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      seedDefaultData();
      save();
    }
    emit('initialized', data);
  }

  // ==================== PROJECTS ====================

  function getProjects() {
    return (data.projects || []).slice();
  }

  function getProject(id) {
    return data.projects.find(function(p) { return p.id === id; }) || null;
  }

  function createProject(proj) {
    var now = new Date().toISOString();
    var project = {
      id: proj.id || Utils.generateId('proj'),
      name: proj.name || 'Untitled Project',
      description: proj.description || '',
      status: proj.status || 'planning',
      priority: proj.priority || 'medium',
      assignees: proj.assignees || [],
      links: proj.links || [],
      milestones: proj.milestones || [],
      color: proj.color || '#2196f3',
      createdAt: proj.createdAt || now,
      updatedAt: now
    };
    data.projects.push(project);
    addActivity('Created project "' + project.name + '"', 'system');
    save();
    emit('projectCreated', project);
    emit('dataChanged');
    return project;
  }

  function updateProject(id, updates) {
    var proj = getProject(id);
    if (!proj) return null;
    var safeFields = ['name','description','status','priority','assignees','links','milestones','color'];
    safeFields.forEach(function(f) {
      if (updates[f] !== undefined) proj[f] = updates[f];
    });
    proj.updatedAt = new Date().toISOString();
    addActivity('Updated project "' + proj.name + '"', 'system');
    save();
    emit('projectUpdated', proj);
    emit('dataChanged');
    return proj;
  }

  function deleteProject(id) {
    var proj = getProject(id);
    if (!proj) return false;
    data.projects = data.projects.filter(function(p) { return p.id !== id; });
    // Also delete associated tasks
    var removed = data.tasks.filter(function(t) { return t.projectId === id; });
    data.tasks = data.tasks.filter(function(t) { return t.projectId !== id; });
    addActivity('Deleted project "' + proj.name + '" and ' + removed.length + ' tasks', 'system');
    save();
    emit('projectDeleted', { id: id, name: proj.name });
    emit('dataChanged');
    return true;
  }

  // ==================== TASKS ====================

  function getTasks(filter) {
    var tasks = (data.tasks || []).slice();
    if (!filter) return tasks;
    if (filter.projectId) tasks = tasks.filter(function(t) { return t.projectId === filter.projectId; });
    if (filter.status) tasks = tasks.filter(function(t) { return t.status === filter.status; });
    if (filter.assignee) tasks = tasks.filter(function(t) { return t.assignee === filter.assignee; });
    if (filter.priority) tasks = tasks.filter(function(t) { return t.priority === filter.priority; });
    return tasks;
  }

  function getTask(id) {
    return data.tasks.find(function(t) { return t.id === id; }) || null;
  }

  function createTask(task) {
    var now = new Date().toISOString();
    var t = {
      id: task.id || Utils.generateId('task'),
      projectId: task.projectId || '',
      title: task.title || 'Untitled Task',
      description: task.description || '',
      status: task.status || 'todo',
      priority: task.priority || 'medium',
      assignee: task.assignee || '',
      tags: task.tags || [],
      dueDate: task.dueDate || null,
      estimatedCost: task.estimatedCost || null,
      actualCost: task.actualCost || null,
      model: task.model || null,
      progress: task.progress || 0,
      subtasks: task.subtasks || [],
      activityLog: [{ timestamp: now, action: 'Task created', by: 'system' }],
      createdAt: task.createdAt || now,
      updatedAt: now
    };
    data.tasks.push(t);
    addActivity('Created task "' + t.title + '"', t.assignee || 'system');
    save();
    emit('taskCreated', t);
    emit('dataChanged');
    return t;
  }

  function updateTask(id, updates) {
    var task = getTask(id);
    if (!task) return null;
    var oldStatus = task.status;
    var safeFields = ['title','description','status','priority','assignee','tags','dueDate',
      'estimatedCost','actualCost','model','progress','subtasks','projectId'];
    safeFields.forEach(function(f) {
      if (updates[f] !== undefined) task[f] = updates[f];
    });
    task.updatedAt = new Date().toISOString();
    // Log status change
    if (updates.status && updates.status !== oldStatus) {
      if (!task.activityLog) task.activityLog = [];
      task.activityLog.push({ timestamp: task.updatedAt, action: 'Status: ' + oldStatus + ' → ' + updates.status, by: 'system' });
      addActivity('Task "' + task.title + '" moved to ' + Utils.statusLabel(updates.status), task.assignee || 'system');
      if (updates.status === 'done') {
        task.progress = 100;
      }
    } else {
      addActivity('Updated task "' + task.title + '"', task.assignee || 'system');
    }
    save();
    emit('taskUpdated', task);
    emit('dataChanged');
    return task;
  }

  function deleteTask(id) {
    var task = getTask(id);
    if (!task) return false;
    data.tasks = data.tasks.filter(function(t) { return t.id !== id; });
    addActivity('Deleted task "' + task.title + '"', 'system');
    save();
    emit('taskDeleted', { id: id, title: task.title });
    emit('dataChanged');
    return true;
  }

  // ==================== ACTIVITY LOG ====================

  function addActivity(action, by) {
    if (!data.activityLog) data.activityLog = [];
    data.activityLog.unshift({
      timestamp: new Date().toISOString(),
      action: action,
      by: by || 'system'
    });
    // Keep last 200 entries
    if (data.activityLog.length > 200) data.activityLog = data.activityLog.slice(0, 200);
  }

  function getActivity(limit) {
    return (data.activityLog || []).slice(0, limit || 50);
  }

  // ==================== STATS ====================

  function getStats() {
    var tasks = data.tasks || [];
    var projects = data.projects || [];
    var now = new Date();
    var weekStart = Utils.getWeekStart(now);

    var completedThisWeek = tasks.filter(function(t) {
      return t.status === 'done' && t.updatedAt && new Date(t.updatedAt) >= weekStart;
    }).length;

    var byStatus = {};
    tasks.forEach(function(t) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    });

    var byAssignee = {};
    Object.keys(Utils.teamMembers).forEach(function(id) {
      byAssignee[id] = { total: 0, blocked: 0, todo: 0, onhold: 0, 'in-progress': 0, done: 0 };
    });
    tasks.forEach(function(t) {
      if (byAssignee[t.assignee]) {
        byAssignee[t.assignee].total++;
        byAssignee[t.assignee][t.status] = (byAssignee[t.assignee][t.status] || 0) + 1;
      }
    });

    return {
      totalProjects: projects.length,
      activeProjects: projects.filter(function(p) { return p.status === 'active'; }).length,
      totalTasks: tasks.length,
      byStatus: byStatus,
      completedThisWeek: completedThisWeek,
      blocked: byStatus.blocked || 0,
      inProgress: byStatus['in-progress'] || 0,
      done: byStatus.done || 0,
      todo: byStatus.todo || 0,
      onhold: byStatus.onhold || 0,
      byAssignee: byAssignee,
      overdueTasks: tasks.filter(function(t) { return t.status !== 'done' && Utils.isOverdue(t.dueDate); }).length
    };
  }

  // ==================== EXPORT / IMPORT ====================

  function exportData() {
    return JSON.stringify(data, null, 2);
  }

  function importData(jsonStr) {
    try {
      var imported = JSON.parse(jsonStr);
      if (!imported.projects || !imported.tasks) {
        throw new Error('Invalid data format');
      }
      data = imported;
      save();
      emit('dataImported', data);
      emit('dataChanged');
      return true;
    } catch(e) {
      console.error('Import error:', e);
      return false;
    }
  }

  function clearAll() {
    data = {
      projects: [],
      tasks: [],
      activityLog: [],
      settings: getDefaultSettings(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    save();
    emit('dataCleared');
    emit('dataChanged');
  }

  // ==================== SEED DATA ====================

  function seedDefaultData() {
    // Projects
    var proj1 = createProject({
      id: 'proj_spidersweb',
      name: 'SpidersWeb.ai',
      description: 'Construction Financial Management SaaS. Phase 1 complete, Phase 1 Polish in progress.',
      status: 'active',
      priority: 'high',
      assignees: ['nyx', 'kris'],
      color: '#9c27b0',
      links: [],
      milestones: [
        { name: 'Phase 1 Launch', date: '2026-01-15', completed: true },
        { name: 'Phase 1 Polish', date: '2026-02-28', completed: false },
        { name: 'Stripe Integration', date: '2026-03-15', completed: false }
      ]
    });

    var proj2 = createProject({
      id: 'proj_lod',
      name: 'LOD Website & GEO',
      description: 'Migrate lodconstruction.com from Wix to Vercel. Full GEO optimization for AI visibility.',
      status: 'active',
      priority: 'high',
      assignees: ['taylor', 'kris'],
      color: '#2196f3',
      links: [],
      milestones: [
        { name: 'V2 Design Complete', date: '2026-02-20', completed: false },
        { name: 'DNS Migration', date: '2026-03-01', completed: false },
        { name: 'GEO Optimization', date: '2026-03-15', completed: false }
      ]
    });

    var proj3 = createProject({
      id: 'proj_research',
      name: 'AI Market Research',
      description: 'Automated market intel using Grok API Live Search.',
      status: 'planning',
      priority: 'medium',
      assignees: ['taylor'],
      color: '#ff9800'
    });

    var proj4 = createProject({
      id: 'proj_realestate',
      name: 'Real Estate Growth',
      description: 'Expand real estate practice.',
      status: 'planning',
      priority: 'low',
      assignees: ['kris'],
      color: '#4caf50'
    });

    // LOD Tasks
    var lodTasks = [
      { title: 'Fix mobile responsiveness on V2', assignee: 'taylor', priority: 'high', status: 'todo' },
      { title: 'Review V2 website design', assignee: 'kris', priority: 'high', status: 'todo' },
      { title: 'Verify email routing (info@lodconstruction.com)', assignee: 'kris', priority: 'high', status: 'todo' },
      { title: 'Identify domain registrar', assignee: 'kris', priority: 'high', status: 'todo' },
      { title: 'Replace placeholders with real photos', assignee: 'kris', priority: 'medium', status: 'todo' },
      { title: 'Point DNS to Vercel', assignee: 'taylor', priority: 'high', status: 'todo' },
      { title: 'Set up Google Search Console', assignee: 'taylor', priority: 'medium', status: 'todo' },
      { title: 'Submit to B2B directories', assignee: 'taylor', priority: 'medium', status: 'todo' },
      { title: 'Write first 4 blog posts', assignee: 'taylor', priority: 'low', status: 'todo' },
      { title: 'Add schema markup', assignee: 'taylor', priority: 'high', status: 'done', progress: 100 }
    ];
    lodTasks.forEach(function(t) {
      t.projectId = 'proj_lod';
      t.tags = ['website', 'geo'];
      createTask(t);
    });

    // SpidersWeb Tasks
    var swTasks = [
      { title: 'Phase 1 Polish — inline account modal', assignee: 'nyx', priority: 'high', status: 'in-progress', progress: 40 },
      { title: 'Dashboard verification testing', assignee: 'nyx', priority: 'high', status: 'todo' },
      { title: 'Test all CRUD flows', assignee: 'nyx', priority: 'high', status: 'todo' },
      { title: 'Wire up Sentry', assignee: 'nyx', priority: 'medium', status: 'todo' },
      { title: 'Set up Dependabot', assignee: 'nyx', priority: 'medium', status: 'todo' },
      { title: 'Fund Bucket management UI', assignee: 'nyx', priority: 'high', status: 'todo' },
      { title: 'Stripe subscription integration', assignee: 'nyx', priority: 'high', status: 'todo' }
    ];
    swTasks.forEach(function(t) {
      t.projectId = 'proj_spidersweb';
      t.tags = ['saas', 'fintech'];
      createTask(t);
    });

    // AI Research Tasks
    var resTasks = [
      { title: 'Test Grok API with grok-4 model', assignee: 'taylor', priority: 'medium', status: 'todo' },
      { title: 'Build automated market intel pipeline', assignee: 'taylor', priority: 'low', status: 'todo' }
    ];
    resTasks.forEach(function(t) {
      t.projectId = 'proj_research';
      t.tags = ['research', 'ai'];
      createTask(t);
    });

    // Clear seeding activity noise, keep just a welcome entry
    data.activityLog = [
      { timestamp: new Date().toISOString(), action: 'Command Center initialized with default data', by: 'system' }
    ];
  }

  // ==================== PUBLIC API ====================

  return {
    init: init,
    on: on,
    off: off,
    // Projects
    getProjects: getProjects,
    getProject: getProject,
    createProject: createProject,
    updateProject: updateProject,
    deleteProject: deleteProject,
    // Tasks
    getTasks: getTasks,
    getTask: getTask,
    createTask: createTask,
    updateTask: updateTask,
    deleteTask: deleteTask,
    // Activity
    getActivity: getActivity,
    addActivity: addActivity,
    // Stats
    getStats: getStats,
    // Import/Export
    exportData: exportData,
    importData: importData,
    clearAll: clearAll
  };
})();
