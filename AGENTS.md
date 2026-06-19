<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Dev server

- Run `npm run dev` in a **separate terminal** to avoid timeout crashes
- Do NOT build production (`next build`) in dev mode — dev server only

## Database

- Never use `db push` in dev mode. Only use `prisma migrate dev` for schema changes.
- `db push` skips migration history and causes drift; migrations keep history in sync.

## Debug browser

- Use `npm run dev:chrome` to start the dev server and open Chrome with a **clean temporary profile** (no accounts, no extensions, no history).
- Chrome data dir: `%TEMP%\chrome-debug` (auto-created, disposable).
- The server starts in a separate window; Chrome opens after ~11s once the server is ready.

## Code comments

- Cover all code with necessary comments clear enough for AI agents to understand context across different machines

## Project structure: components

- All components in `app/components/` must be grouped into subdirectories by purpose (e.g. `layout/`, `theme/`, `ui/`, etc.)
