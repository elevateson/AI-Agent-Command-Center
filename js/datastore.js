'use strict';

/**
 * DataStore — API-ready data layer with all 16 features
 * localStorage backend. Event system for reactive UI.
 */

var DataStore = (function() {
  var STORAGE_KEY = 'command_center_data';
  var listeners = {};
  var data = null;
  var activeTimerTaskId = null;
  var timerInterval = null;

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
        if (!data.projects) data.projects = [];
        if (!data.tasks) data.tasks = [];
        if (!data.activityLog) data.activityLog = [];
        if (!data.templates) data.templates = [];
        if (!data.notifications) data.notifications = [];
        if (!data.settings) data.settings = getDefaultSettings();
        // Migrate tasks to have new fields
        data.tasks.forEach(function(t) {
          if (!t.comments) t.comments = [];
          if (!t.subtasks) t.subtasks = [];
          if (!t.links) t.links = [];
          if (!t.blockedBy) t.blockedBy = [];
          if (!t.timeEntries) t.timeEntries = [];
          if (t.totalTimeMs === undefined) t.totalTimeMs = 0;
          if (t.order === undefined) t.order = 0;
        });
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
        templates: [],
        notifications: [],
        settings: getDefaultSettings(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      seedDefaultData();
      save();
    }
    // Restore active timer
    data.tasks.forEach(function(t) {
      if (t.timeEntries) {
        t.timeEntries.forEach(function(te) {
          if (te.startTime && !te.endTime) {
            activeTimerTaskId = t.id;
          }
        });
      }
    });
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
    logActivity('project_created', { projectId: project.id, details: 'Created project "' + project.name + '"' }, 'system');
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
    logActivity('project_updated', { projectId: proj.id, details: 'Updated project "' + proj.name + '"' }, 'system');
    save();
    emit('projectUpdated', proj);
    emit('dataChanged');
    return proj;
  }

  function deleteProject(id) {
    var proj = getProject(id);
    if (!proj) return false;
    data.projects = data.projects.filter(function(p) { return p.id !== id; });
    var removed = data.tasks.filter(function(t) { return t.projectId === id; });
    data.tasks = data.tasks.filter(function(t) { return t.projectId !== id; });
    logActivity('project_deleted', { projectId: id, details: 'Deleted project "' + proj.name + '" and ' + removed.length + ' tasks' }, 'system');
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
      comments: task.comments || [],
      subtasks: task.subtasks || [],
      links: task.links || [],
      blockedBy: task.blockedBy || [],
      timeEntries: task.timeEntries || [],
      totalTimeMs: task.totalTimeMs || 0,
      order: task.order || 0,
      activityLog: [{ timestamp: now, action: 'Task created', by: task.assignee || 'system' }],
      createdAt: task.createdAt || now,
      updatedAt: now
    };
    data.tasks.push(t);
    logActivity('task_created', { taskId: t.id, projectId: t.projectId, details: 'Created task "' + t.title + '"' }, t.assignee || 'system');
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
      'estimatedCost','actualCost','model','progress','subtasks','projectId','comments',
      'links','blockedBy','timeEntries','totalTimeMs','order'];
    safeFields.forEach(function(f) {
      if (updates[f] !== undefined) task[f] = updates[f];
    });
    task.updatedAt = new Date().toISOString();
    if (updates.status && updates.status !== oldStatus) {
      if (!task.activityLog) task.activityLog = [];
      task.activityLog.push({ timestamp: task.updatedAt, action: 'Status: ' + oldStatus + ' → ' + updates.status, by: task.assignee || 'system' });
      logActivity('task_moved', { taskId: task.id, projectId: task.projectId, details: 'Moved "' + task.title + '" to ' + Utils.statusLabel(updates.status) }, task.assignee || 'system');
      if (updates.status === 'done') {
        task.progress = 100;
        logActivity('task_completed', { taskId: task.id, projectId: task.projectId, details: 'Completed "' + task.title + '"' }, task.assignee || 'system');
      }
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
    logActivity('task_deleted', { taskId: id, details: 'Deleted task "' + task.title + '"' }, 'system');
    save();
    emit('taskDeleted', { id: id, title: task.title });
    emit('dataChanged');
    return true;
  }

  // ==================== COMMENTS ====================

  function addComment(taskId, text, by) {
    var task = getTask(taskId);
    if (!task) return null;
    if (!task.comments) task.comments = [];
    var comment = {
      id: Utils.generateId('cmt'),
      text: text,
      by: by || 'system',
      timestamp: new Date().toISOString()
    };
    task.comments.push(comment);
    if (!task.activityLog) task.activityLog = [];
    task.activityLog.push({ timestamp: comment.timestamp, action: 'Comment added by ' + (Utils.getAssignee(by).name), by: by });
    logActivity('comment_added', { taskId: taskId, details: Utils.getAssignee(by).name + ' commented on "' + task.title + '"' }, by);
    task.updatedAt = comment.timestamp;
    // Parse @mentions and create notifications
    var mentions = Utils.parseMentions(text);
    if (mentions.length > 0) {
      mentions.forEach(function(userId) {
        addNotification({
          type: 'mention',
          taskId: taskId,
          taskTitle: task.title,
          from: by,
          to: userId,
          text: text,
          timestamp: comment.timestamp
        });
      });
      logActivity('mention', { taskId: taskId, details: Utils.getAssignee(by).name + ' tagged ' + mentions.map(function(m) { return '@' + Utils.getAssignee(m).name; }).join(', ') + ' in "' + task.title + '"' }, by);
    }
    save();
    emit('taskUpdated', task);
    emit('dataChanged');
    return comment;
  }

  // ==================== SUBTASKS ====================

  function toggleSubtask(taskId, subtaskId) {
    var task = getTask(taskId);
    if (!task || !task.subtasks) return null;
    var st = task.subtasks.find(function(s) { return s.id === subtaskId; });
    if (!st) return null;
    st.completed = !st.completed;
    // Update task progress based on subtasks
    var total = task.subtasks.length;
    var done = task.subtasks.filter(function(s) { return s.completed; }).length;
    task.progress = total > 0 ? Math.round((done / total) * 100) : task.progress;
    task.updatedAt = new Date().toISOString();
    save();
    emit('taskUpdated', task);
    emit('dataChanged');
    return st;
  }

  function addSubtask(taskId, text) {
    var task = getTask(taskId);
    if (!task) return null;
    if (!task.subtasks) task.subtasks = [];
    var st = { id: Utils.generateId('st'), text: text, completed: false };
    task.subtasks.push(st);
    task.updatedAt = new Date().toISOString();
    save();
    emit('taskUpdated', task);
    return st;
  }

  function removeSubtask(taskId, subtaskId) {
    var task = getTask(taskId);
    if (!task || !task.subtasks) return;
    task.subtasks = task.subtasks.filter(function(s) { return s.id !== subtaskId; });
    var total = task.subtasks.length;
    var done = task.subtasks.filter(function(s) { return s.completed; }).length;
    task.progress = total > 0 ? Math.round((done / total) * 100) : task.progress;
    task.updatedAt = new Date().toISOString();
    save();
    emit('taskUpdated', task);
  }

  // ==================== LINKS ====================

  function addLink(taskId, label, url) {
    var task = getTask(taskId);
    if (!task) return null;
    if (!task.links) task.links = [];
    var link = { id: Utils.generateId('lnk'), label: label, url: url };
    task.links.push(link);
    task.updatedAt = new Date().toISOString();
    save();
    emit('taskUpdated', task);
    return link;
  }

  function removeLink(taskId, linkId) {
    var task = getTask(taskId);
    if (!task || !task.links) return;
    task.links = task.links.filter(function(l) { return l.id !== linkId; });
    task.updatedAt = new Date().toISOString();
    save();
    emit('taskUpdated', task);
  }

  // ==================== ACTIVITY LOG ====================

  function logActivity(action, details, by) {
    if (!data.activityLog) data.activityLog = [];
    data.activityLog.unshift({
      id: Utils.generateId('act'),
      action: action,
      taskId: details.taskId || null,
      projectId: details.projectId || null,
      details: details.details || action,
      by: by || 'system',
      timestamp: new Date().toISOString()
    });
    if (data.activityLog.length > 500) data.activityLog = data.activityLog.slice(0, 500);
  }

  // Legacy compat
  function addActivity(action, by) {
    logActivity(action, { details: action }, by);
  }

  function getActivity(limit) {
    return (data.activityLog || []).slice(0, limit || 50);
  }

  function getActivityForTask(taskId) {
    return (data.activityLog || []).filter(function(a) { return a.taskId === taskId; });
  }

  function getActivityForProject(projectId) {
    return (data.activityLog || []).filter(function(a) { return a.projectId === projectId; });
  }

  // ==================== NOTIFICATIONS / @MENTIONS ====================

  function addNotification(notif) {
    if (!data.notifications) data.notifications = [];
    data.notifications.unshift({
      id: Utils.generateId('ntf'),
      type: notif.type || 'mention',
      taskId: notif.taskId || null,
      taskTitle: notif.taskTitle || '',
      from: notif.from || 'system',
      to: notif.to || '',
      text: notif.text || '',
      read: false,
      timestamp: notif.timestamp || new Date().toISOString()
    });
    if (data.notifications.length > 200) data.notifications = data.notifications.slice(0, 200);
    save();
    emit('notificationAdded', data.notifications[0]);
    emit('dataChanged');
  }

  function getNotifications(userId, unreadOnly) {
    if (!data.notifications) data.notifications = [];
    var notifs = data.notifications.filter(function(n) { return n.to === userId; });
    if (unreadOnly) notifs = notifs.filter(function(n) { return !n.read; });
    return notifs;
  }

  function markNotificationRead(notifId) {
    if (!data.notifications) return;
    var n = data.notifications.find(function(x) { return x.id === notifId; });
    if (n) { n.read = true; save(); emit('dataChanged'); }
  }

  function markAllNotificationsRead(userId) {
    if (!data.notifications) return;
    data.notifications.forEach(function(n) {
      if (n.to === userId) n.read = true;
    });
    save();
    emit('dataChanged');
  }

  function getUnreadCount(userId) {
    if (!data.notifications) return 0;
    return data.notifications.filter(function(n) { return n.to === userId && !n.read; }).length;
  }

  // ==================== TIME TRACKING ====================

  function startTimer(taskId, by) {
    // Stop any running timer first
    if (activeTimerTaskId) {
      stopTimer(activeTimerTaskId);
    }
    var task = getTask(taskId);
    if (!task) return null;
    if (!task.timeEntries) task.timeEntries = [];
    var entry = {
      id: Utils.generateId('te'),
      startTime: new Date().toISOString(),
      endTime: null,
      by: by || 'system'
    };
    task.timeEntries.push(entry);
    activeTimerTaskId = taskId;
    task.updatedAt = entry.startTime;
    save();
    emit('timerStarted', { taskId: taskId });
    emit('dataChanged');
    return entry;
  }

  function stopTimer(taskId) {
    var task = getTask(taskId || activeTimerTaskId);
    if (!task || !task.timeEntries) return null;
    var running = task.timeEntries.find(function(te) { return te.startTime && !te.endTime; });
    if (!running) return null;
    running.endTime = new Date().toISOString();
    var elapsed = new Date(running.endTime).getTime() - new Date(running.startTime).getTime();
    task.totalTimeMs = (task.totalTimeMs || 0) + elapsed;
    if (taskId === activeTimerTaskId || !taskId) activeTimerTaskId = null;
    task.updatedAt = running.endTime;
    save();
    emit('timerStopped', { taskId: task.id });
    emit('dataChanged');
    return running;
  }

  function getActiveTimer() {
    return activeTimerTaskId;
  }

  function getRunningTimerElapsed() {
    if (!activeTimerTaskId) return 0;
    var task = getTask(activeTimerTaskId);
    if (!task || !task.timeEntries) return 0;
    var running = task.timeEntries.find(function(te) { return te.startTime && !te.endTime; });
    if (!running) return 0;
    return Date.now() - new Date(running.startTime).getTime();
  }

  // ==================== DEPENDENCIES ====================

  function addBlocker(taskId, blockerTaskId) {
    var task = getTask(taskId);
    if (!task) return;
    if (!task.blockedBy) task.blockedBy = [];
    if (task.blockedBy.indexOf(blockerTaskId) === -1) {
      task.blockedBy.push(blockerTaskId);
      task.updatedAt = new Date().toISOString();
      save();
      emit('taskUpdated', task);
    }
  }

  function removeBlocker(taskId, blockerTaskId) {
    var task = getTask(taskId);
    if (!task || !task.blockedBy) return;
    task.blockedBy = task.blockedBy.filter(function(b) { return b !== blockerTaskId; });
    task.updatedAt = new Date().toISOString();
    save();
    emit('taskUpdated', task);
  }

  function hasUnresolvedBlockers(taskId) {
    var task = getTask(taskId);
    if (!task || !task.blockedBy || task.blockedBy.length === 0) return false;
    return task.blockedBy.some(function(bid) {
      var blocker = getTask(bid);
      return blocker && blocker.status !== 'done';
    });
  }

  // ==================== TEMPLATES ====================

  function getTemplates() {
    return (data.templates || []).slice();
  }

  function createTemplate(tmpl) {
    if (!data.templates) data.templates = [];
    var template = {
      id: tmpl.id || Utils.generateId('tmpl'),
      name: tmpl.name || 'Untitled Template',
      projectId: tmpl.projectId || '',
      assignee: tmpl.assignee || '',
      priority: tmpl.priority || 'medium',
      tags: tmpl.tags || [],
      description: tmpl.description || ''
    };
    data.templates.push(template);
    save();
    return template;
  }

  function deleteTemplate(id) {
    if (!data.templates) return;
    data.templates = data.templates.filter(function(t) { return t.id !== id; });
    save();
  }

  function createFromTemplate(templateId) {
    var tmpl = (data.templates || []).find(function(t) { return t.id === templateId; });
    if (!tmpl) return null;
    return createTask({
      title: '',
      projectId: tmpl.projectId,
      assignee: tmpl.assignee,
      priority: tmpl.priority,
      tags: tmpl.tags.slice(),
      description: tmpl.description,
      status: 'todo'
    });
  }

  // ==================== SEARCH ====================

  function searchAll(query) {
    if (!query || query.length < 2) return [];
    var q = query.toLowerCase();
    var results = [];

    // Search tasks
    (data.tasks || []).forEach(function(t) {
      var match = false;
      if (t.title.toLowerCase().indexOf(q) >= 0) match = true;
      if (t.description && t.description.toLowerCase().indexOf(q) >= 0) match = true;
      if (t.comments) {
        t.comments.forEach(function(c) {
          if (c.text.toLowerCase().indexOf(q) >= 0) match = true;
        });
      }
      if (t.tags) {
        t.tags.forEach(function(tag) {
          if (tag.toLowerCase().indexOf(q) >= 0) match = true;
        });
      }
      if (match) results.push({ type: 'task', item: t });
    });

    // Search projects
    (data.projects || []).forEach(function(p) {
      if (p.name.toLowerCase().indexOf(q) >= 0 || (p.description && p.description.toLowerCase().indexOf(q) >= 0)) {
        results.push({ type: 'project', item: p });
      }
    });

    return results.slice(0, 20);
  }

  // ==================== REORDER ====================

  function reorderTask(taskId, newIndex, status) {
    var tasks = getTasks({ status: status });
    tasks.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
    var task = tasks.find(function(t) { return t.id === taskId; });
    if (!task) return;
    tasks = tasks.filter(function(t) { return t.id !== taskId; });
    tasks.splice(newIndex, 0, task);
    tasks.forEach(function(t, i) {
      var orig = getTask(t.id);
      if (orig) orig.order = i;
    });
    save();
    emit('dataChanged');
  }

  // ==================== SETTINGS ====================

  function getSettings() {
    return data.settings || getDefaultSettings();
  }

  function updateSettings(updates) {
    if (!data.settings) data.settings = getDefaultSettings();
    for (var key in updates) {
      if (updates.hasOwnProperty(key)) data.settings[key] = updates[key];
    }
    save();
    emit('settingsChanged', data.settings);
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

    // Weekly completion data (per day)
    var weeklyCompletion = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      var dayStr = d.toDateString();
      var count = tasks.filter(function(t) {
        return t.status === 'done' && t.updatedAt && new Date(t.updatedAt).toDateString() === dayStr;
      }).length;
      var days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      weeklyCompletion.push({ day: days[i], count: count });
    }

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
      overdueTasks: tasks.filter(function(t) { return t.status !== 'done' && Utils.isOverdue(t.dueDate); }).length,
      weeklyCompletion: weeklyCompletion
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
      templates: [],
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
    createProject({
      id: 'proj_spidersweb',
      name: 'SpidersWeb.ai',
      description: 'Construction Financial Management SaaS. Phase 1 complete, Phase 1 Polish in progress.',
      status: 'active',
      priority: 'high',
      assignees: ['nyx', 'kris'],
      color: '#9c27b0',
      milestones: [
        { name: 'Phase 1 Launch', date: '2026-01-15', completed: true },
        { name: 'Phase 1 Polish', date: '2026-02-28', completed: false },
        { name: 'Stripe Integration', date: '2026-03-15', completed: false }
      ]
    });

    createProject({
      id: 'proj_lod',
      name: 'LOD Website & GEO',
      description: 'Migrate lodconstruction.com from Wix to Vercel. Full GEO optimization for AI visibility.',
      status: 'active',
      priority: 'high',
      assignees: ['taylor', 'kris'],
      color: '#2196f3',
      milestones: [
        { name: 'V2 Design Complete', date: '2026-02-20', completed: false },
        { name: 'DNS Migration', date: '2026-03-01', completed: false },
        { name: 'GEO Optimization', date: '2026-03-15', completed: false }
      ]
    });

    createProject({
      id: 'proj_research',
      name: 'AI Market Research',
      description: 'Automated market intel using Grok API Live Search.',
      status: 'planning',
      priority: 'medium',
      assignees: ['taylor'],
      color: '#ff9800'
    });

    createProject({
      id: 'proj_realestate',
      name: 'Real Estate Growth',
      description: 'Expand real estate practice.',
      status: 'planning',
      priority: 'low',
      assignees: ['kris'],
      color: '#4caf50'
    });

    // LOD Tasks with enhanced fields
    var lodTasks = [
      { title: 'Fix mobile responsiveness on V2', assignee: 'taylor', priority: 'high', status: 'todo', dueDate: '2026-02-19',
        subtasks: [
          { id: 'st_1', text: 'Fix header overflow on iPhone', completed: true },
          { id: 'st_2', text: 'Fix footer layout on tablet', completed: false },
          { id: 'st_3', text: 'Test on Safari mobile', completed: false }
        ],
        comments: [
          { id: 'cmt_1', text: 'The header is overflowing on iPhone 14. Needs immediate fix.', by: 'kris', timestamp: '2026-02-16T10:30:00Z' },
          { id: 'cmt_2', text: 'Fixed the header issue, still working on footer.', by: 'taylor', timestamp: '2026-02-16T14:15:00Z' }
        ]
      },
      { title: 'Review V2 website design', assignee: 'kris', priority: 'high', status: 'todo', dueDate: '2026-02-18' },
      { title: 'Verify email routing (info@lodconstruction.com)', assignee: 'kris', priority: 'high', status: 'todo' },
      { title: 'Identify domain registrar', assignee: 'kris', priority: 'high', status: 'todo' },
      { title: 'Replace placeholders with real photos', assignee: 'kris', priority: 'medium', status: 'todo',
        links: [
          { id: 'lnk_1', label: 'Photo Drive Folder', url: 'https://drive.google.com/example' }
        ]
      },
      { title: 'Point DNS to Vercel', assignee: 'taylor', priority: 'high', status: 'todo', dueDate: '2026-03-01' },
      { title: 'Set up Google Search Console', assignee: 'taylor', priority: 'medium', status: 'todo' },
      { title: 'Submit to B2B directories', assignee: 'taylor', priority: 'medium', status: 'todo' },
      { title: 'Write first 4 blog posts', assignee: 'taylor', priority: 'low', status: 'todo',
        subtasks: [
          { id: 'st_4', text: 'Research competitor blogs', completed: true },
          { id: 'st_5', text: 'Write post 1: Why GEO matters', completed: true },
          { id: 'st_6', text: 'Write post 2: Construction tech trends', completed: false },
          { id: 'st_7', text: 'Write post 3: LOD services overview', completed: false },
          { id: 'st_8', text: 'Write post 4: Case study', completed: false }
        ]
      },
      { title: 'Add schema markup', assignee: 'taylor', priority: 'high', status: 'done', progress: 100 }
    ];
    lodTasks.forEach(function(t) {
      t.projectId = 'proj_lod';
      t.tags = ['website', 'geo'];
      createTask(t);
    });

    // SpidersWeb Tasks
    var swTasks = [
      { title: 'Phase 1 Polish — inline account modal', assignee: 'nyx', priority: 'high', status: 'in-progress', progress: 40, dueDate: '2026-02-25',
        comments: [
          { id: 'cmt_3', text: 'Started on the modal. Using the new component pattern.', by: 'nyx', timestamp: '2026-02-15T09:00:00Z' }
        ]
      },
      { title: 'Dashboard verification testing', assignee: 'nyx', priority: 'high', status: 'todo', dueDate: '2026-02-22' },
      { title: 'Test all CRUD flows', assignee: 'nyx', priority: 'high', status: 'todo' },
      { title: 'Wire up Sentry', assignee: 'nyx', priority: 'medium', status: 'todo',
        links: [
          { id: 'lnk_2', label: 'Sentry Docs', url: 'https://docs.sentry.io' }
        ]
      },
      { title: 'Set up Dependabot', assignee: 'nyx', priority: 'medium', status: 'todo' },
      { title: 'Fund Bucket management UI', assignee: 'nyx', priority: 'high', status: 'todo', dueDate: '2026-03-10' },
      { title: 'Stripe subscription integration', assignee: 'nyx', priority: 'high', status: 'todo', dueDate: '2026-03-15',
        blockedBy: [] // Will add dependency after creation
      }
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

    // Default templates
    data.templates = [
      {
        id: 'tmpl_lod',
        name: 'LOD Website Task',
        projectId: 'proj_lod',
        assignee: 'taylor',
        priority: 'medium',
        tags: ['website', 'geo'],
        description: ''
      },
      {
        id: 'tmpl_sw',
        name: 'SpidersWeb Dev Task',
        projectId: 'proj_spidersweb',
        assignee: 'nyx',
        priority: 'medium',
        tags: ['saas', 'fintech'],
        description: ''
      },
      {
        id: 'tmpl_review',
        name: 'Kris Review Task',
        projectId: '',
        assignee: 'kris',
        priority: 'high',
        tags: ['review'],
        description: 'Needs review and approval from Kris.'
      }
    ];

    // Seed activity log with some realistic entries
    var now = new Date();
    data.activityLog = [
      { id: 'act_s1', action: 'task_completed', taskId: null, projectId: 'proj_lod', details: '🦉 Taylor completed "Add schema markup"', by: 'taylor', timestamp: new Date(now - 3600000 * 2).toISOString() },
      { id: 'act_s2', action: 'comment_added', taskId: null, projectId: 'proj_lod', details: '🦉 Taylor commented on "Fix mobile responsiveness"', by: 'taylor', timestamp: new Date(now - 3600000 * 4).toISOString() },
      { id: 'act_s3', action: 'task_created', taskId: null, projectId: 'proj_spidersweb', details: '🤖 Nyx created "Stripe subscription integration"', by: 'nyx', timestamp: new Date(now - 3600000 * 6).toISOString() },
      { id: 'act_s4', action: 'task_moved', taskId: null, projectId: 'proj_spidersweb', details: '🤖 Nyx moved "Phase 1 Polish" to In Progress', by: 'nyx', timestamp: new Date(now - 3600000 * 8).toISOString() },
      { id: 'act_s5', action: 'project_created', taskId: null, projectId: 'proj_realestate', details: '🧑‍💼 Kris created project "Real Estate Growth"', by: 'kris', timestamp: new Date(now - 3600000 * 24).toISOString() },
      { id: 'act_s6', action: 'task_created', taskId: null, projectId: 'proj_lod', details: 'Command Center initialized with default data', by: 'system', timestamp: new Date(now - 3600000 * 48).toISOString() }
    ];

    // Seed notifications
    data.notifications = [
      { id: 'ntf_s1', type: 'mention', taskId: null, taskTitle: 'Review V2 website design', from: 'taylor', to: 'kris', text: '@kris V2 is live on Vercel — need your review and approval before we switch DNS', read: false, timestamp: new Date(now - 3600000 * 1).toISOString() },
      { id: 'ntf_s2', type: 'mention', taskId: null, taskTitle: 'Verify email routing', from: 'taylor', to: 'kris', text: '@kris critical — need to know if info@lodconstruction.com routes through Wix before we migrate', read: false, timestamp: new Date(now - 3600000 * 3).toISOString() }
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
    // Comments
    addComment: addComment,
    // Subtasks
    toggleSubtask: toggleSubtask,
    addSubtask: addSubtask,
    removeSubtask: removeSubtask,
    // Links
    addLink: addLink,
    removeLink: removeLink,
    // Dependencies
    addBlocker: addBlocker,
    removeBlocker: removeBlocker,
    hasUnresolvedBlockers: hasUnresolvedBlockers,
    // Activity
    getActivity: getActivity,
    getActivityForTask: getActivityForTask,
    getActivityForProject: getActivityForProject,
    addActivity: addActivity,
    logActivity: logActivity,
    // Time tracking
    startTimer: startTimer,
    stopTimer: stopTimer,
    getActiveTimer: getActiveTimer,
    getRunningTimerElapsed: getRunningTimerElapsed,
    // Templates
    getTemplates: getTemplates,
    createTemplate: createTemplate,
    deleteTemplate: deleteTemplate,
    createFromTemplate: createFromTemplate,
    // Notifications / @Mentions
    addNotification: addNotification,
    getNotifications: getNotifications,
    markNotificationRead: markNotificationRead,
    markAllNotificationsRead: markAllNotificationsRead,
    getUnreadCount: getUnreadCount,
    // Search
    searchAll: searchAll,
    // Reorder
    reorderTask: reorderTask,
    // Settings
    getSettings: getSettings,
    updateSettings: updateSettings,
    // Stats
    getStats: getStats,
    // Import/Export
    exportData: exportData,
    importData: importData,
    clearAll: clearAll
  };
})();
