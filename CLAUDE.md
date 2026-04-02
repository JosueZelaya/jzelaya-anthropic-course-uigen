# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup          # Install deps, generate Prisma client, run migrations
npm run dev            # Start dev server with Turbopack at http://localhost:3000
npm run build          # Production build
npm run test           # Run all tests with Vitest
npx vitest run <file>  # Run a single test file
npx prisma migrate dev # Apply schema changes and regenerate client
npm run db:reset       # Reset database (destructive)
```

## Code Style

- Use comments sparingly. Only comment complex code.

## Architecture

**UIGen** is a Next.js 15 (App Router) app that lets users describe React components in a chat, generates them with Claude using tool calls, and shows a live preview — all backed by a virtual file system (no real files written).

### Routing

- `/` — Home: checks auth, redirects to first project or creates one
- `/[projectId]` — Project workspace (chat + editor + preview)
- `/api/chat` — Streaming POST endpoint; the only API route

### AI Generation Flow

1. Client sends `{ messages, files, projectId }` to `POST /api/chat`
2. `src/app/api/chat/route.ts` adds a system prompt with prompt caching, deserializes the virtual FS, and calls `streamText()` (Vercel AI SDK) with the Anthropic claude-haiku-4-5 model
3. Claude calls two tools to manipulate files:
   - `str_replace_editor` — create/view/edit files (commands: `create`, `str_replace`, `insert`, `undo_edit`, `view`)
   - `file_manager` — rename/delete files
4. Tool call results are intercepted client-side in `FileSystemContext.handleToolCall()` to update the virtual FS state in real time
5. On completion, messages and serialized file system are saved to the DB (if authenticated)

If `ANTHROPIC_API_KEY` is absent, `src/lib/provider.ts` returns a `MockLanguageModel` that streams back static component templates.

### Virtual File System

`src/lib/file-system.ts` — `VirtualFileSystem` class holds a tree of `FileNode` objects in memory. It serializes to/from JSON for DB persistence (`project.data`). Key methods: `createFile`, `updateFile`, `deleteFile`, `rename`, `replaceInFile`, `insertInFile`.

### State Management

Two React contexts wire everything together:

- **`ChatContext`** (`src/lib/contexts/chat-context.tsx`) — wraps `useChat()` from `@ai-sdk/react`, holds messages and input state
- **`FileSystemContext`** (`src/lib/contexts/file-system-context.tsx`) — owns the `VirtualFileSystem` instance, exposes file operations, and contains `handleToolCall()` which processes incoming AI tool calls and mutates the FS

### Live Preview

`src/components/preview/PreviewFrame.tsx` renders an `<iframe>` with a sandbox. It transforms JSX to plain JS using `@babel/standalone`, resolves imports with an import map, and hot-reloads whenever the file system changes. Entry point is `App.jsx` or `index.jsx`.

### Auth

JWT-based via `jose`. Sessions stored in HTTP-only cookies (`auth-token`, 7-day expiry). `src/lib/auth.ts` handles token creation/verification. `src/actions/index.ts` has `signUp`/`signIn`/`signOut`/`getUser` server actions. Anonymous users can generate components without signing up; projects are optionally persisted.

### Database

The schema is defined in `prisma/schema.prisma` — reference it anytime you need to understand the structure of data stored in the database. Two models:
- `User` — email + hashed password
- `Project` — `messages` (JSON string) + `data` (serialized virtual FS JSON), optional `userId`

Generated Prisma client lives in `src/generated/prisma/` (not the default location).

### Testing

Vitest + jsdom + React Testing Library. Tests live in `__tests__/` directories co-located with the code they test. The file system has a thorough unit test suite (`src/lib/__tests__/file-system.test.ts`).
