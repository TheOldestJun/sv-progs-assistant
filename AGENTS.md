<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Dev server

- Run `npm run dev` in a **separate terminal** to avoid timeout crashes
- Do NOT build production (`next build`) in dev mode — dev server only
- "запускай" → run `npm run dev:chrome` (separate window + clean Chrome profile)

## Database

- Never use `db push` in dev mode. Only use `prisma migrate dev` for schema changes.
- `db push` skips migration history and causes drift; migrations keep history in sync.
- Uses `@prisma/adapter-mariadb` with `prisma-client-js` generator. `PrismaClient` from `@prisma/client` requires `{ adapter }` in Prisma v7.
- `DATABASE_URL` env var for connection (MySQL/MariaDB).
- `serverExternalPackages` in `next.config.ts`: `["@prisma/client", "@prisma/adapter-mariadb", "mariadb"]`

## Vercel

- `vercel-build` script: `prisma generate && prisma migrate deploy || echo 'Migrate skipped (no DB)' && next build` — migrate deploy is non-fatal; build continues if DB is unreachable during build
- Prisma uses `@prisma/adapter-mariadb` — `new PrismaClient({ adapter })`
- Set `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET` in Vercel Dashboard env vars (JWT_REFRESH_SECRET опционален — fallback на JWT_SECRET)
- **Add `export const dynamic = "force-dynamic"`** to any server component page that imports `db` or renders a component that queries the DB — prevents build-time pre-rendering errors when DB is unreachable

## Debug browser

- Use `npm run dev:chrome` to start the dev server and open Chrome with a **clean temporary profile** (no accounts, no extensions, no history).
- Chrome data dir: `%TEMP%\chrome-debug` (auto-created, disposable).
- The server starts in a separate window; Chrome opens after ~11s once the server is ready.

## Git

- Push to GitHub **only after the user explicitly requests it**. Never push on your own initiative.

## Code comments

- Cover all code with necessary comments clear enough for AI agents to understand context across different machines

## Project structure: components

- All components in `app/components/` must be grouped into subdirectories by purpose (e.g. `layout/`, `theme/`, `ui/`, etc.)
