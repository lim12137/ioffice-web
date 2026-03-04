# AionUi - Project Guide for Claude

## Project Overview

**AionUi** is a unified AI agent graphical interface that transforms command-line AI agents into a modern, efficient chat interface. It supports multiple CLI AI tools including Gemini CLI, Claude Code, CodeX, Qwen Code, and more.

- **Version**: 1.7.8
- **License**: Apache-2.0
- **Platform**: Cross-platform (macOS, Windows, Linux)

## Tech Stack

### Core

- **Electron 37.x** - Desktop application framework
- **React 19.x** - UI framework
- **TypeScript 5.8.x** - Programming language
- **Express 5.x** - Web server (for WebUI remote access)

### Build Tools

- **Webpack 6.x** - Module bundler (via @electron-forge/plugin-webpack)
- **Electron Forge 7.8.x** - Build tooling
- **Electron Builder 26.x** - Application packaging

### UI & Styling

- **Arco Design 2.x** - Enterprise UI component library
- **UnoCSS 66.x** - Atomic CSS engine
- **Monaco Editor 4.x** - Code editor

### AI Integration

- **Anthropic SDK** - Claude API
- **Google GenAI** - Gemini API
- **OpenAI SDK** - OpenAI API
- **MCP SDK** - Model Context Protocol

### Data & Storage

- **Better SQLite3** - Local database
- **Zod** - Data validation

## Project Structure

```
src/
├── index.ts                 # Main process entry
├── preload.ts               # Electron preload (IPC bridge)
├── renderer/                # UI application
│   ├── pages/               # Page components
│   │   ├── conversation/    # Chat interface (main feature)
│   │   ├── settings/        # Settings management
│   │   ├── cron/            # Scheduled tasks
│   │   └── login/           # Authentication
│   ├── components/          # Reusable UI components
│   ├── hooks/               # React hooks
│   ├── context/             # Global state (React Context)
│   ├── services/            # Client-side services
│   ├── i18n/                # Internationalization
│   └── utils/               # Utility functions
├── process/                 # Main process services
│   ├── database/            # SQLite operations
│   ├── bridge/              # IPC communication
│   └── services/            # Backend services
│       ├── mcpServices/     # MCP protocol (multi-agent)
│       └── cron/            # Task scheduling
├── webserver/               # Web server for remote access
│   ├── routes/              # HTTP routes
│   ├── websocket/           # Real-time communication
│   └── auth/                # Authentication
├── worker/                  # Background task workers
├── channels/                # Agent communication system
├── common/                  # Shared utilities & types
└── agent/                   # AI agent implementations
```

## Development Commands

```bash
# Development
npm start              # Start dev environment
npm run webui          # Start WebUI server

# Code Quality
npm run lint           # Run ESLint
npm run lint:fix       # Auto-fix lint issues
npm run format         # Format with Prettier

# Testing
npm test               # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report

# Building
npm run build          # Full build (macOS arm64 + x64)
npm run dist:mac       # macOS build
npm run dist:win       # Windows build
npm run dist:linux     # Linux build
```

## Code Conventions

### Naming

- **Components**: PascalCase (`Button.tsx`, `Modal.tsx`)
- **Utilities**: camelCase (`formatDate.ts`)
- **Constants**: UPPER_SNAKE_CASE
- **Unused params**: prefix with `_`

### TypeScript

- Strict mode enabled
- Use path aliases: `@/*`, `@process/*`, `@renderer/*`, `@worker/*`
- Prefer `type` over `interface` (per ESLint config)

### React

- Functional components only
- Hooks: `use*` prefix
- Event handlers: `on*` prefix
- Props interface: `${ComponentName}Props`

### Styling

- UnoCSS atomic classes preferred
- CSS modules for component-specific styles: `*.module.css`
- Use Arco Design semantic colors

### Comments

- English for code comments
- JSDoc for function documentation

## Git Conventions

### Commit Messages

- **Language**: English
- **Format**: `<type>(<scope>): <subject>`
- **Types**: feat, fix, refactor, chore, docs, test, style, perf

Examples:

```
feat(cron): implement scheduled task system
fix(webui): correct modal z-index issue
chore: remove debug console.log statements
```

### No AI Signature (MANDATORY)

**NEVER add any AI-related signatures to commits.** This includes but is not limited to:

- `Co-Authored-By: Claude` or any Claude-related attribution
- `Co-Authored-By: <any AI assistant>`
- `🤖 Generated with Claude` or similar markers
- Any other AI tool signatures or attributions

This is a strict rule. Violating this will pollute the git history.

## Architecture Notes

### Multi-Process Model

- **Main Process**: Application logic, database, IPC handling
- **Renderer Process**: React UI
- **Worker Processes**: Background AI tasks (gemini, codex, acp workers)

### IPC Communication

- Secure contextBridge isolation
- Type-safe message system in `src/renderer/messages/`

### WebUI Server

- Express + WebSocket
- JWT authentication
- Supports remote network access

### Cron System

- Based on `croner` library
- `CronService`: Task scheduling engine
- `CronBusyGuard`: Prevents concurrent execution

## Supported AI Agents

- Claude (via MCP)
- Gemini (Google AI)
- Codex (OpenAI)
- Qwen Code
- Iflow
- Custom agents via MCP protocol

## Internationalization

Supported languages: English (en-US), Chinese Simplified (zh-CN), Chinese Traditional (zh-TW), Japanese (ja-JP), Korean (ko-KR)

Translation files: `src/renderer/i18n/locales/*.json`

---

## Skills Index

Detailed rules and guidelines are organized into Skills for better modularity:

| Skill    | Purpose                                                              | Triggers                                               |
| -------- | -------------------------------------------------------------------- | ------------------------------------------------------ |
| **i18n** | Key naming, sync checking, hardcoded detection, translation workflow | Adding user-facing text, creating components with text |

> Skills are located in `.claude/skills/` and loaded automatically when relevant.

## Key Configuration Files

| File               | Purpose                     |
| ------------------ | --------------------------- |
| `tsconfig.json`    | TypeScript compiler options |
| `forge.config.ts`  | Electron Forge build config |
| `uno.config.ts`    | UnoCSS styling config       |
| `.eslintrc.json`   | Linting rules               |
| `.prettierrc.json` | Code formatting             |
| `jest.config.js`   | Test configuration          |

## Testing

- **Framework**: Jest + ts-jest
- **Structure**: `tests/unit/`, `tests/integration/`, `tests/contract/`
- Run with `npm test`

## Native Modules

The following require special handling during build:

- `better-sqlite3` - Database
- `node-pty` - Terminal emulation
- `tree-sitter` - Code parsing

These are configured as externals in Webpack.

<!-- gitnexus:start -->
# GitNexus MCP

This project is indexed by GitNexus as **ioffice-web-feat-global-online-limit-queue** (4952 symbols, 13351 relationships, 300 execution flows).

GitNexus provides a knowledge graph over this codebase — call chains, blast radius, execution flows, and semantic search.

## Always Start Here

For any task involving code understanding, debugging, impact analysis, or refactoring, you must:

1. **Read `gitnexus://repo/{name}/context`** — codebase overview + check index freshness
2. **Match your task to a skill below** and **read that skill file**
3. **Follow the skill's workflow and checklist**

> If step 1 warns the index is stale, run `npx gitnexus analyze` in the terminal first.

## Skills

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/refactoring/SKILL.md` |

## Tools Reference

| Tool | What it gives you |
|------|-------------------|
| `query` | Process-grouped code intelligence — execution flows related to a concept |
| `context` | 360-degree symbol view — categorized refs, processes it participates in |
| `impact` | Symbol blast radius — what breaks at depth 1/2/3 with confidence |
| `detect_changes` | Git-diff impact — what do your current changes affect |
| `rename` | Multi-file coordinated rename with confidence-tagged edits |
| `cypher` | Raw graph queries (read `gitnexus://repo/{name}/schema` first) |
| `list_repos` | Discover indexed repos |

## Resources Reference

Lightweight reads (~100-500 tokens) for navigation:

| Resource | Content |
|----------|---------|
| `gitnexus://repo/{name}/context` | Stats, staleness check |
| `gitnexus://repo/{name}/clusters` | All functional areas with cohesion scores |
| `gitnexus://repo/{name}/cluster/{clusterName}` | Area members |
| `gitnexus://repo/{name}/processes` | All execution flows |
| `gitnexus://repo/{name}/process/{processName}` | Step-by-step trace |
| `gitnexus://repo/{name}/schema` | Graph schema for Cypher |

## Graph Schema

**Nodes:** File, Function, Class, Interface, Method, Community, Process
**Edges (via CodeRelation.type):** CALLS, IMPORTS, EXTENDS, IMPLEMENTS, DEFINES, MEMBER_OF, STEP_IN_PROCESS

```cypher
MATCH (caller)-[:CodeRelation {type: 'CALLS'}]->(f:Function {name: "myFunc"})
RETURN caller.name, caller.filePath
```

<!-- gitnexus:end -->
