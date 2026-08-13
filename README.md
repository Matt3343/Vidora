# Vidora 1.4.1 – Vercel

Vercel-ready build. There is intentionally **no `vercel.json` runtime configuration**.
Vercel automatically recognizes JavaScript files in the root `api/` directory as
Node.js Functions. The Node.js version is pinned via `package.json` to `24.x`.

## Deploy

Upload/deploy the entire folder to Vercel. No `npm start` is required.

After deployment:

- `/` → Vidora
- `/api/health` → deployment/API health check
- Settings → **🔍 Instanzen automatisch suchen** → discovers and probes Invidious instances

## Important

Public Invidious instances can disappear or change API behavior. Vidora tests
multiple API endpoints and automatically fails over when search/trending/video
requests fail.

The video iframe is served by the selected Invidious instance itself; if that
instance blocks embedding, the API can still work while the iframe refuses to
play.
