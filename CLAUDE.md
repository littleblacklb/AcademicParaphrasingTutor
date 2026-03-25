# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Overview

APT (Academic Paraphrasing Tutor) — a Next.js 16 web app that teaches academic paraphrasing with AI-powered feedback and knowledge extraction. Uses an OpenAI-compatible SDK to talk to Gemini/DeepSeek/OpenAI, SQLite for persistence, and streaming SSE for real-time responses.

## Commands

- `npm run dev` — start dev server (localhost:3000)
- `npm run build` — production build
- `npm run lint` — run ESLint
- No test framework is configured

## Environment

Copy `.env.example` to `.env.local`. Required variables:
- `AI_API_KEY` — API key for the AI provider
- `AI_BASE_URL` — OpenAI-compatible endpoint (default: Gemini)
- `AI_MODEL` — model name (default: `gemini-2.0-flash`)
- `AI_THINKING_LEVEL` — reasoning effort: `low`, `medium`, or `high`

## Architecture

**Three-pane client app**: conversation list (left) → chat window (center) → knowledge bank (right). Single main client component (`src/app/page.tsx`) manages all state with React hooks — no external state library.

**Streaming chat flow** (`src/app/api/chat/route.ts`):
1. Client sends messages + conversation_id
2. Server streams completion via SSE (`data: {JSON}\n\n`) with event types: `text`, `knowledge_point`, `done`, `error`
3. AI uses tool calling (`store_knowledge_point`) to extract knowledge points during conversation
4. Multi-turn loop: if the model calls tools but provides no text, the server continues the conversation automatically

**Database** (`src/lib/db.ts`): SQLite via better-sqlite3 in WAL mode. Three tables: `conversations`, `conversation_messages`, `knowledge_points`. Stored at `data/apt.db`, auto-created on first access. All DB access is server-side only (Node.js runtime).

**Key files**:
- `src/lib/types.ts` — all shared TypeScript types
- `src/lib/prompts.ts` — system prompt defining the EAP tutor role
- `src/lib/tools.ts` — AI tool definitions (store_knowledge_point schema)
- `src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)

## Conventions

- Path alias: `@/*` → `src/*`
- Tailwind CSS v4 with `@tailwindcss/postcss` (not the legacy plugin)
- Dark theme with slate color palette; category colors defined as CSS custom properties in `globals.css`
- Framer Motion for animations, KaTeX for math rendering in markdown
- `better-sqlite3` must stay in `serverExternalPackages` in `next.config.ts`
- API routes return JSON; parameterized SQL statements throughout (no raw string interpolation)
