# Claude Code Vault

A Web UI for browsing, exporting, importing, and restoring file history from Claude Code's local data (`~/.claude` on macOS/Linux or `%USERPROFILE%\.claude` on Windows).

![Claude Code Vault](https://img.shields.io/badge/Claude-Code%20Vault-6366f1?style=for-the-badge)
![Bun](https://img.shields.io/badge/Bun-1.0+-black?style=for-the-badge&logo=bun)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue?style=for-the-badge&logo=typescript)
![Cross Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-green?style=for-the-badge)

## Features

- **Browse Projects** – View all your Claude Code projects with smart path grouping
- **Explore Conversations** – See conversation history with git branch info and modified file counts
- **Restore Checkpoints** – Preview and restore files from any checkpoint
- **Selective Restore** – Choose specific files to restore from a checkpoint
- **Export Data** – Export global backups, projects, conversations, or checkpoints
- **Import Data** – Restore from previously exported archives
- **Single Binary** – Compile to a standalone executable
- **Cross-Platform** – Works on Windows, macOS, and Linux

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.0 or later

### Installation

```bash
# Clone the repository
git clone https://github.com/kream0/cc-vault.git
cd cc-vault

# Install dependencies (none required, Bun handles everything)
# Just run it!
bun run dev
```

### Usage

```bash
# Development (with hot reload)
bun run dev

# Production
bun run start

# Build standalone binary
bun run build
./dist/claude-restore --port 8080

# Run tests
bun test
bun test --coverage
```

Open http://localhost:3000 in your browser.

### CLI Options

| Option          | Description                   | Default     |
|-----------------|-------------------------------|-------------|
| `--port`        | Server port                   | `3000`      |
| `--claude-root` | Path to Claude data directory | `~/.claude` |

## API Endpoints

### Browse

| Method | Endpoint                             | Description                            |
|--------|--------------------------------------|----------------------------------------|
| `GET`  | `/api/projects`                      | List all projects                      |
| `GET`  | `/api/projects/:id/conversations`    | List conversations for a project       |
| `GET`  | `/api/conversations/:id/checkpoints` | List restore points for a conversation |
| `GET`  | `/api/blob`                          | Preview file content                   |

### Restore

| Method | Endpoint       | Description                     |
|--------|----------------|---------------------------------|
| `POST` | `/api/restore` | Restore files from a checkpoint |

### Export

| Method | Endpoint                                                        | Description                    |
|--------|-----------------------------------------------------------------|--------------------------------|
| `GET`  | `/api/export/global`                                            | Export entire ~/.claude folder |
| `GET`  | `/api/export/projects/:id`                                      | Export a project               |
| `GET`  | `/api/export/projects/:projectId/conversations/:conversationId` | Export a conversation          |
| `GET`  | `/api/export/checkpoint`                                        | Export a checkpoint            |

### Import

| Method | Endpoint                                        | Description                 |
|--------|-------------------------------------------------|-----------------------------|
| `POST` | `/api/import/global`                            | Import a global backup      |
| `POST` | `/api/import/projects/:projectId/conversations` | Import a conversation       |
| `POST` | `/api/import/checkpoint`                        | Import/restore a checkpoint |

## Project Structure

```
cc-vault/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # HTTP server
│   ├── config.ts             # Configuration + CLI args
│   ├── routes/               # API endpoints
│   │   ├── blob.ts
│   │   ├── checkpoints.ts
│   │   ├── conversations.ts
│   │   ├── export.ts
│   │   ├── import.ts
│   │   ├── projects.ts
│   │   ├── restore.ts
│   │   └── static.ts
│   ├── utils/                # Utilities
│   │   ├── date-formatter.ts
│   │   ├── jsonl-parser.ts
│   │   ├── paths.ts
│   │   └── project-decoder.ts
│   └── types/                # TypeScript interfaces
├── public/
│   └── index.html            # Frontend (Alpine.js + Tailwind CSS)
├── tests/
│   ├── fixtures/             # Test data
│   ├── unit/                 # Unit tests
│   └── integration/          # Integration tests
└── dist/
    └── claude-restore        # Compiled binary
```

## Tech Stack

- **Runtime**: [Bun](https://bun.sh) – Fast JavaScript runtime with built-in bundler
- **Backend**: TypeScript with Bun's native HTTP server
- **Frontend**: [Alpine.js](https://alpinejs.dev) + [Tailwind CSS](https://tailwindcss.com) (CDN)
- **Testing**: Bun's built-in test runner

## Testing

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Watch mode
bun test --watch
```

Current coverage: **140 tests** with 100% function coverage and 91%+ line coverage.

## Security

- **Path Traversal Protection**: All file paths are validated to prevent directory traversal attacks
- **Write Protection**: The `~/.claude` directory is protected from write operations during restore
- **Validation**: All API inputs are validated with proper error responses

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
