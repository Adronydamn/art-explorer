# AGENTS.md — Art Explorer

## Environment

- Node.js was installed user-locally at `~/.local/node` (no system Node). Prefix commands with
  `export PATH=~/.local/node/bin:$PATH`.
- `curl` is not available on this machine; use `wget -q -O - --content-on-error URL`.

## Commands

- Dev: `npm run dev` (port 3000)
- Lint: `npm run lint` · Typecheck: `npm run typecheck` · Unit: `npm run test`
- E2E: `npm run test:e2e` (builds into `.next-e2e` against `tests/e2e/mock-server.mts` on port 4010, app on 3100)
- Build: `npm run build` · All checks: `npm run check`

## Conventions

- UI never consumes raw museum responses: adapters in `src/lib/api/{aic,cma}` validate with Zod and
  normalize to `Artwork` (`src/lib/artwork/types.ts`).
- Wikipedia is server-only (`src/lib/api/wikipedia`); style context must always have `museumEvidence`.
- Colors / spacing / motion come from tokens in `src/styles/globals.css`; don't hardcode colors.
- ESLint is pinned to 9.x (eslint-plugin-react inside eslint-config-next breaks on ESLint 10).
- TypeScript is pinned to 6.0.x (typescript-eslint supports < 6.1).
- AIC IIIF is behind a Cloudflare challenge: AIC images go through `/api/images/aic/[imageId]/[width]`
  (adds `AIC-User-Agent`); the `next/image` loader lives in `src/components/ui/art-image.tsx`.
- Playwright browsers: install via `node node_modules/@playwright/test/cli.js install chromium` (`npx` hung here).
- Translation uses Yandex Cloud Translate when `YANDEX_TRANSLATE_API_KEY` and `YANDEX_TRANSLATE_FOLDER_ID` are set.
  e2e tests do not set these variables, so fixtures keep their original English strings.
