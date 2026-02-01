# 🎛️ AI Agent Command Center

A visual dashboard for managing AI agent tasks and projects. Built for human-AI collaboration.

## Features

- 📋 **Kanban Board** — Drag-and-drop task management across columns (Blocked, To-Do, On Hold, In Progress, Done)
- 🏗️ **Project Management** — Create, edit, and track multi-task projects
- 🚀 **Push Tasks** — Send specific tasks to AI sub-agents with full project context
- 💾 **Persistent Storage** — Projects saved to localStorage (survives browser refresh)
- 📱 **Mobile Responsive** — Works on desktop and mobile with swipe gestures

## Quick Start

1. Open `index.html` in your browser
2. Create projects in the Projects tab
3. Add tasks to projects
4. Push tasks to your AI agent when ready

## Project Structure

```
AI-Agent-Command-Center/
├── index.html          # Main dashboard
├── projects/           # Project markdown files (synced by AI agent)
│   ├── project-name/
│   │   └── project.md
│   └── ...
└── README.md
```

## How It Works

### For Humans
- Create and manage projects visually
- Track task progress across all projects
- Push specific tasks to AI agents with full context

### For AI Agents
- Read `projects/<name>/project.md` for full project context
- Receive pushed tasks with embedded project information
- Update project files as work progresses

## Architecture

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Vanilla HTML/CSS/JS | Zero dependencies, runs anywhere |
| Storage | localStorage | Immediate persistence |
| Sync | Git + Markdown | Version control, portable |
| Future | Supabase | Cloud hosting, multi-device sync |

## Roadmap

- [ ] Supabase backend integration
- [ ] Real-time sync across devices
- [ ] AI agent webhook notifications
- [ ] Time tracking per task
- [ ] Cost tracking per project

## License

MIT

---

Built with ❤️ by [Kris](https://github.com/elevateson) and [Taylor](https://github.com/elevateson) (AI)
