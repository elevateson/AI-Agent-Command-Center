# 🎯 AI Agent Command Center v2.0

A full-featured, zero-dependency project management dashboard built for AI agent workflows.

## Features

- **Dashboard** — Overview with project status, priorities, team workload, alerts, activity feed
- **Kanban Board** — 5-column drag-and-drop (Blocked → To-Do → On Hold → In Progress → Done)
- **Project Management** — Create, edit, track projects with milestones, links, and progress breakdowns
- **Calendar/Timeline** — Week/month views with color-coded tasks and due date warnings
- **Team Management** — Filter by assignee (Kris 🧑‍💼, Taylor 🦉, Nyx 🤖)
- **Settings** — Export/import JSON backups, data management

## Architecture

- **DataStore** class — API-ready data layer (localStorage now, designed for REST API swap)
- **Event system** — `DataStore.on('taskUpdated', callback)` for reactive UI updates
- **Consistent schema** — All objects have IDs, timestamps, and typed fields

## Security (10/10)

1. Zero external dependencies (no CDN, no npm)
2. No external API calls
3. No eval(), no innerHTML with user input
4. Content Security Policy enforced
5. All data stays in localStorage
6. Input sanitization on all user inputs
7. No service workers
8. SRI-ready if external resources ever added
9. Frame embedding blocked (X-Frame-Options)
10. JavaScript in separate auditable files

## Usage

Open `index.html` in any browser. No build step required.

## File Structure

```
11_COMMAND_CENTER/
├── index.html          # App shell
├── css/styles.css      # All styles
├── js/
│   ├── utils.js        # Sanitization, formatting, helpers
│   ├── datastore.js    # Data layer (localStorage, API-ready)
│   ├── dashboard.js    # Dashboard home view
│   ├── board.js        # Kanban board + drag-drop
│   ├── projects.js     # Project management + detail views
│   ├── calendar.js     # Calendar/timeline view
│   ├── settings.js     # Settings, import/export
│   └── app.js          # Main init, routing, tabs
└── README.md
```
