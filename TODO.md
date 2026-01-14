# Claude Code Vault - TODO

This project provides a Web UI to browse, export, import, and restore file history from Claude Code's local data.

## Current Status
- **Backend**: Modular Bun server in `src/` with TypeScript
  - `GET /api/projects`: Lists projects
  - `GET /api/projects/:id/conversations`: Lists conversations (with gitBranch and filesModified)
  - `GET /api/conversations/:id/checkpoints`: Lists restore points
  - `GET /api/blob`: Preview file content before restoring
  - `POST /api/restore`: Restores files (supports selective restore)
  - `GET /api/export/*`: Export global, project, conversation, or checkpoint data
  - `POST /api/import/*`: Import global, conversation, or checkpoint data
- **Frontend**: `public/index.html` (HTML + Alpine.js + Tailwind CSS)
- **Testing**: 140 tests with 100% function coverage, 91%+ line coverage
- **Build**: Single binary via `bun run build`

## Design References
- **Tailwind UI Source**: `/mnt/c/Users/Karim/Documents/work/Libraries/UI/tailwindUI-components_v12--2-2025/v4/html/components/application-ui`
  - Used `application-shells/sidebar/brand_sidebar_with_header.html` as the base layout.

## Completed Features

### 1. Robustness & Error Handling
- [x] **Validation**: Path traversal protection and ~/.claude write blocking in `src/utils/paths.ts`
- [x] **Feedback**: Error responses with structured JSON `{ error: string }`
- [x] **Empty States**: Handle cases where a project has no conversations or no checkpoints

### 2. UI/UX Improvements
- [x] **File Preview**: `GET /api/blob` endpoint + modal to view file content before restoring
- [x] **Selective Restore**: Checkboxes to select specific files from a checkpoint
- [x] **Project Search**: Search bar to filter the project list in sidebar
- [x] **Date Formatting**: Relative time format ("2 hours ago") via `src/utils/date-formatter.ts`

### 3. Deployment & Packaging
- [x] **Single Binary**: `bun run build` creates `dist/claude-restore`
- [x] **CLI Args**: `--port` and `--claude-root` command line arguments

### 4. Code Structure
- [x] **Refactor**: Split into `src/routes/`, `src/utils/`, `src/types/`
- [x] **Types**: TypeScript interfaces for all data structures

### 5. Testing
- [x] **Test Fixtures**: Sample data in `tests/fixtures/` (safe, no real user data)
- [x] **Unit Tests**: All utilities and routes covered in `tests/unit/`
- [x] **Integration Tests**: End-to-end API flow tests in `tests/integration/`
- [x] **Coverage**: 100% function coverage, 91%+ line coverage

## How to Run

```bash
cd claude-restore-ui

# Development
bun run dev

# Production
bun run start

# Testing
bun test
bun test --coverage

# Build single binary
bun run build
./dist/claude-restore --port 8080

# Open http://localhost:3000
```

## Next Steps

### Bug Investigation & Fixes

- [x] **Fix "0 files tracked" issue**: When listing checkpoints for a conversation, many show "0 files tracked". Investigate if this is:
  - A parsing bug in `src/utils/jsonl-parser.ts` (extractCheckpoints function)
  - An issue with how `trackedFileBackups` is being read from the JSONL
  - Or expected behavior (some snapshots genuinely have no files)
  - **Resolution**: Expected behavior - initial snapshots have empty `trackedFileBackups`

- [x] **Investigate "No restore points" conversations**: Many conversations show no restore points at all. Verify this is not a bug by:
  - Checking if `file-history-snapshot` entries exist in the JSONL
  - Ensuring the checkpoint extraction logic is correct
  - Comparing with raw JSONL data in `~/.claude/projects/`
  - **Resolution**: Expected behavior - conversations without `file-history-snapshot` entries have no restore points

### Conversation List Enhancements

- [x] **Show Git Branch**: Display the git branch name in conversation list items when available
  - The `gitBranch` field exists in JSONL user message entries
  - Extract and return it from the `/api/projects/:id/conversations` endpoint
  - Display it as a badge/tag in the conversation list UI

- [x] **Show Modified Files Count**: Display the number of modified files in conversation list items
  - Count total unique files across all checkpoints in the conversation
  - Or show the count from the latest checkpoint
  - Display as a small indicator (e.g., "3 files modified")

### Sidebar UX Improvements

- [x] **Project Tooltips**: Add tooltips to sidebar project items showing the full path on hover

- [x] **Shortened Path Display**: When multiple projects share a common prefix (e.g., `/mnt/c/Users/Karim/Documents/`), display a shortened version:
  - Example: `/mnt/c/Users/Karim/Documents/work/project-a` → `tools/AI/autonoma`
  - Full path shown in tooltip on hover

- [x] **Group Projects by Common Paths**: Group sidebar items by meaningful path aliases
  - Uses longest common prefix detection algorithm
  - Creates meaningful aliases like `@work`, `@home`, `@test` based on path keywords
  - Example structure:
    ```
    @work
      └ tools/AI/autonoma
      └ sandbox/opus
    @home
      └ scripts
      └ sandbox
    @test
      └ cc
      └ plan
    ```
  - Single projects (without matching prefix) shown ungrouped at bottom

### Export/Import Feature

- [x] **Export Global**: Export entire `~/.claude` folder as a downloadable archive
  - `GET /api/export/global` endpoint
  - Returns JSON with all projects and file history
  
- [x] **Export Project**: Export a single project with its conversations and file history
  - `GET /api/export/projects/:id` endpoint
  
- [x] **Export Conversation**: Export a conversation JSONL + associated file history
  - `GET /api/export/projects/:projectId/conversations/:conversationId` endpoint
  
- [x] **Export Checkpoint**: Export files from a specific checkpoint
  - `GET /api/export/checkpoint` endpoint with query params
  
- [x] **Toast Notifications**: Show success/error toasts for all export operations

- [x] **Import Global**: Import a previously exported global archive
  - `POST /api/import/global` endpoint
  - Accept JSON archive and restore to `~/.claude`
  - Merge or replace strategy option
  - UI: "Import" button on home page with file picker

- [x] **Import Conversation**: Import a conversation into a project
  - `POST /api/import/projects/:projectId/conversations` endpoint
  - Accept exported conversation JSON
  - Restore JSONL file and file history
  - UI: "Import Conversation" button on project view

- [x] **Import Checkpoint**: Import/restore files from an exported checkpoint
  - `POST /api/import/checkpoint` endpoint
  - Accept exported checkpoint JSON
  - Restore files to original paths (with confirmation)
  - UI: "Import Checkpoint" option in checkpoint view

### Filter Agent Conversations

Agent conversations (`agent-<8-char-hex>.jsonl`) are sub-agents spawned by parent conversations via the "Task" tool. They should be filtered from the UI.

**Analysis Findings:**

| Aspect | Agent Conversations | Regular Conversations |
|--------|---------------------|----------------------|
| Filename | `agent-<8-char-hex>.jsonl` | `<uuid>.jsonl` |
| `isSidechain` | `true` | `false` |
| `agentId` | Present (matches filename) | Not present |
| `sessionId` | Points to parent UUID | Same as filename |
| File History | **None** (0 folders) | Yes |
| Avg Size | ~128KB | ~653KB |
| Ratio | ~2:1 agents per conversation | - |

**Why Hide Agent Conversations:**
1. **No restore value** - Agent conversations have zero `file-history-snapshot` entries
2. **Derived from parent** - Spawned by parent via "Task" tool, changes tracked in parent
3. **UX clutter** - ~2:1 ratio doubles list size without adding value

**Implementation:**

- [x] **Option A (Implemented)**: Simple filename filter in `src/routes/conversations.ts`
  ```typescript
  // Skip agent conversation files (sub-agents spawned via "Task" tool)
  // These have no file-history-snapshot entries and clutter the UI
  if (file.startsWith("agent-")) continue;
  ```
  - ✅ Fast (no file I/O)
  - ✅ Accurate (agent files always start with `agent-`)
  - ✅ Minimal code change

---

## Project Structure

```
claude-restore-ui/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # HTTP server
│   ├── config.ts             # Configuration + CLI args
│   ├── routes/               # API endpoints
│   ├── utils/                # Utilities (paths, JSONL, dates)
│   └── types/                # TypeScript interfaces
├── public/
│   └── index.html            # Frontend
├── tests/
│   ├── fixtures/             # Test data
│   ├── unit/                 # Unit tests
│   └── integration/          # Integration tests
└── dist/
    └── claude-restore        # Compiled binary
```
