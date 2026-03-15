# Detonadores-back

Backend for Detonadores: Node.js, TypeScript, Express, WebSocket. Hexagonal architecture; authoritative match engine.

## Local development

See **`docs/local-development.md`** at project root for the full local run path (client, server, Postgres, Redis), environment variables, and deployment targets.

Quick start:

```bash
npm install
npm run dev
```

Server runs at http://localhost:3001 (or `PORT` from env). Copy `.env.example` to `.env` and set `PORT`, `DATABASE_URL`, `REDIS_URL` as needed.

## Scripts

- `npm run dev` — run with tsx watch (HTTP server)
- `npm run build` — compile TypeScript to `dist/`
- `npm run start` — run compiled app
- `npm run test` — run Vitest once
- `npm run test:watch` — run Vitest in watch mode
