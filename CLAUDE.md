# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**UIGen** is an AI-powered React component generator with live preview. Users describe components in a chat interface; Claude generates React/JSX files in a virtual file system; a sandboxed iframe renders them live using Babel (in-browser) and import maps.

## Commands

```bash
# Initial setup (install deps, generate Prisma client, run migrations)
npm run setup

# Development (uses Turbopack + node-compat shim)
npm run dev

# Build
npm run build

# Lint
npm run lint

# Run all tests
npm test

# Run a single test file
npx vitest run src/path/to/file.test.ts

# Reset database
npm run db:reset
```

The dev scripts require `NODE_OPTIONS='--require ./node-compat.cjs'` — this is already baked into all npm scripts, so always use `npm run dev` rather than calling `next dev` directly.

## Environment

Set `ANTHROPIC_API_KEY` in `.env`. Without it, the app uses a `MockLanguageModel` (`src/lib/provider.ts`) that returns static placeholder components — useful for UI/layout work without incurring API costs.

## Architecture

### End-to-End Data Flow

1. User sends a message in `ChatInterface` → `POST /api/chat` with current messages + serialized VFS files
2. API route (`src/app/api/chat/route.ts`) reconstructs a `VirtualFileSystem`, calls Vercel AI SDK's `streamText()` with two tools: `str_replace_editor` and `file_manager`
3. Claude uses those tools to create/edit files in the server-side VFS; results stream back via the AI data stream protocol
4. On the client, `FileSystemContext` processes incoming tool call results and mirrors changes into the client-side VFS
5. `PreviewFrame` watches the VFS → triggers `createImportMap()` which Babel-transforms all JS/JSX/TS/TSX files to blob URLs, builds an HTML document with an import map, and writes it into a sandboxed iframe

### Key Modules

| Path | Role |
|------|------|
| `src/lib/file-system.ts` | `VirtualFileSystem` class — all file ops; never touches disk |
| `src/lib/contexts/file-system-context.tsx` | React context wrapping VFS; processes streaming AI tool calls client-side |
| `src/lib/contexts/chat-context.tsx` | Wraps Vercel AI SDK `useChat`; manages messages and streaming state |
| `src/lib/transform/jsx-transformer.ts` | Babel-transforms JSX→JS, resolves `@/` aliases and third-party imports via `esm.sh`, creates blob URLs, generates the full iframe HTML |
| `src/lib/tools/str-replace.ts` | Builds the `str_replace_editor` AI tool (view / create / str_replace / insert operations) |
| `src/lib/tools/file-manager.ts` | Builds the `file_manager` AI tool (rename / delete) |
| `src/lib/prompts/generation.tsx` | System prompt defining AI behavior and file conventions |
| `src/lib/provider.ts` | Returns real Anthropic model or `MockLanguageModel` based on env |
| `src/app/api/chat/route.ts` | Streaming API route; persists chat + VFS to DB on completion for authenticated users |
| `src/actions/` | Server Actions for auth (`signUp`, `signIn`, `signOut`, `getUser`) and project CRUD |
| `prisma/schema.prisma` | SQLite schema: `User` and `Project` (messages + VFS data stored as JSON columns) |

### UI Layout

`src/app/main-content.tsx` uses `react-resizable-panels` for a two-column layout:
- **Left**: Chat panel (`ChatInterface` → `MessageList` + `MessageInput`)
- **Right**: Tabs between **Preview** (`PreviewFrame` — sandboxed iframe) and **Code** (`FileTree` + Monaco `CodeEditor`)

### AI-Generated File Conventions

The system prompt (`src/lib/prompts/generation.tsx`) instructs Claude to:
- Always create `/App.jsx` as the entry point with a default export
- Style with Tailwind CSS (loaded via CDN in the preview iframe — no build step needed)
- Use `@/` for local imports (e.g., `import Foo from '@/components/Foo'`)
- Import third-party packages by name — they resolve to `esm.sh` at runtime automatically

## Code Style

Use comments sparingly — only on complex or non-obvious logic.

### Authentication

JWT sessions via `jose`, stored as HTTP-only cookies (7-day expiry). `src/middleware.ts` handles route protection. Anonymous users can use the app without persistence. Authenticated users have projects saved to SQLite on every AI response completion.
