# SGEB Frontend

Web console for **SGEB** (Sistema de Gestión de Eventos de Banquetes) — Mediocres
Inc. React/Vite/TypeScript frontend for the `admin` and `capitan` roles, plus the
public, unauthenticated comensal (guest) experience.

This repository currently contains the **technical foundation** only. Business
features are added incrementally — see `docs/FrontendArchitecture.md` for the full
architecture, open questions, and roadmap (internal docs, not tracked in git).

## Requirements

- Node.js `>=22.12.0`
- [pnpm](https://pnpm.io/) `11.x` (enable via Corepack: `corepack enable pnpm`)

## Installation

```bash
pnpm install
```

## Environment setup

Copy `.env.example` to `.env` and fill in the base URLs for each backend:

```bash
cp .env.example .env
```

| Variable            | Purpose                                          |
| ------------------- | ------------------------------------------------ |
| `VITE_SGEB_API_URL` | Base URL of the SGEB business API                |
| `VITE_SSO_API_URL`  | Base URL of the independent SSO/identity service |

Environment variables are validated at startup with Zod
(`src/shared/config/env.ts`) — the app fails fast with a clear error if either
variable is missing or not a valid URL.

## Development

```bash
pnpm dev
```

## Linting

```bash
pnpm lint        # check
pnpm lint:fix    # check and auto-fix
```

## Formatting

```bash
pnpm format        # write
pnpm format:check  # check only
```

## Type checking

```bash
pnpm typecheck
```

## Testing

```bash
pnpm test        # watch mode
pnpm test:run    # single run (CI)
```

Uses Vitest + React Testing Library + jsdom.

## Production build

```bash
pnpm build       # type-checks, then builds to dist/
pnpm preview     # serve the production build locally
```

## Git hooks

Husky runs `lint-staged` on `pre-commit` (ESLint + Prettier on staged files only).
No hook creates commits automatically.

## High-level architecture

- **Feature-Based Architecture**: business logic lives under `src/features/*`
  (created incrementally); cross-cutting code lives under `src/shared/*`.
- **Two independent backends**: `src/shared/api/sgebClient.ts` (SGEB business API)
  and `src/shared/api/ssoClient.ts` (the separate SSO/identity service), plus
  `src/shared/api/publicClient.ts` for the anonymous comensal endpoints — the
  public client never attaches an auth token and never touches authenticated
  state.
- **State**: TanStack Query for all server state; Zustand reserved for client-only
  UI state (no stores exist yet — auth/token-storage contracts are still pending).
- **Styling**: Tailwind CSS + shadcn/ui, themed from `docs/branding/` via CSS
  variables in `src/styles/globals.css`.
- **PWA**: `vite-plugin-pwa` precaches only the built app shell/static assets.
  No SSO, SGEB, or public API response is cached, and no route is excluded from
  the SPA fallback — direct navigation/refresh on any route (including
  `/publico/*`) keeps working. The manifest icons under `public/` (`favicon.svg`,
  `pwa-192x192.svg`, `pwa-512x512.svg`) are **temporary placeholders**;
  production-ready 192×192 and 512×512 PNG icons (plus a maskable variant) from
  the real brand mark are still pending before release.

For the full rationale, module mapping, and the list of decisions still pending
with the backend/SSO teams, see `docs/FrontendArchitecture.md`.
