# 🎯 AI Agent Command Center v2.5

A zero-dependency, offline-first task management system built for AI agent workflows.

## Features (16 total)

### High Impact
1. **Notes/Comments** — Threaded comments on tasks with timestamps and authors
2. **Subtask Checklists** — Add subtasks with progress tracking (auto-updates task %)
3. **File/Link Attachments** — Add links to tasks, shown with 🔗 indicator
4. **Global Search** — Search tasks, projects, comments. Keyboard shortcut: ⌘K
5. **Drag Reorder** — Reorder tasks within columns with visual drop indicators
6. **Due Date Warnings** — 🔴 Overdue, 🟠 Due today, 🟡 This week visual indicators

### Nice to Have
7. **Activity Log** — Global feed tracking all actions with timestamps
8. **Quick Add (N key)** — Press N anywhere to quick-add a task with templates
9. **Task Dependencies** — Block tasks until prerequisites are done
10. **Time Tracking** — Start/stop timer per task, tracks total time
11. **Dashboard Charts** — CSS-only donut chart, bar charts, weekly trend
12. **Print/PDF View** — Clean printable report from Settings

### Polish
13. **Mobile Touch** — Enhanced touch drag, swipe-to-delete, 48px touch targets
14. **Dark/Light Theme** — Toggle in header, saves preference
15. **Custom Project Colors** — 12 preset colors with visual picker
16. **Task Templates** — 3 built-in templates, create custom ones in Settings

## Tech Stack
- **Zero dependencies** — No CDN, no build step, no frameworks
- **Security** — CSP headers, input sanitization, no eval/innerHTML with user data
- **Storage** — localStorage (swap to REST API via DataStore interface)
- **Charts** — CSS-only (conic-gradient donut, flexbox bars)

## Keyboard Shortcuts
| Key | Action |
|-----|--------|
| ⌘/Ctrl+K | Focus search |
| N | Quick add task |
| Esc | Close modal |

## File Structure
```
11_COMMAND_CENTER/
├── index.html          # App shell with all modals
├── css/styles.css      # Complete styles + print + light theme
├── js/
│   ├── utils.js        # Sanitization, formatting, chart helpers
│   ├── datastore.js    # Data layer with all CRUD + search + templates
│   ├── dashboard.js    # Charts, alerts, activity feed
│   ├── board.js        # Kanban with drag-drop, touch, task detail
│   ├── projects.js     # Project management with color picker
│   ├── calendar.js     # Calendar with due date color coding
│   ├── settings.js     # Templates, print, theme, import/export
│   └── app.js          # Routing, search, shortcuts, theme toggle
└── README.md
```

## Usage
Open `index.html` in any modern browser. No server required.

---
*Built with 🦉 by Taylor & the AI Agent Team*
