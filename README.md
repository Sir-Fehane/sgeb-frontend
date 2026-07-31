# SGEB Frontend

Web console for **SGEB** (Sistema de Gestión de Eventos de Banquetes) — Mediocres
Inc. React/Vite/TypeScript frontend for the `admin` and `capitan` roles, plus the
public, unauthenticated comensal (guest) experience.

This repository currently contains the **technical foundation** and a **design-system
foundation** (tokens + reusable UI components). Business features are added
incrementally — see `docs/FrontendArchitecture.md` for the full architecture, open
questions, and roadmap (internal docs, not tracked in git).

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

## Design system

Tokens and reusable UI components live under `src/shared/components/`, based on
`docs/branding/branding.pdf` (colors, typography scale, spacing, radius) and built
on shadcn/ui + Radix primitives.

- **Import from the barrel, not from `ui/`.** Feature code must always import
  shared components from `@/shared/components` —
  ```ts
  import { Button, Card, Badge, FormField } from '@/shared/components'
  ```
  never `@/shared/components/ui/button` etc. directly. `ui/` holds the
  shadcn/Radix-backed implementation; the barrel (`src/shared/components/index.ts`)
  is the stable, project-owned public API — this keeps every consumer decoupled
  from how a primitive is implemented internally.
- **Tokens** live in `src/styles/globals.css` as CSS variables (colors, the
  typography scale, radius, shadows), consumed through Tailwind's `@theme` block.
  Typography primitives (`PageTitle`, `SectionHeading`, `CardHeading`, `Text`,
  `Caption`, `HelperText`, `ErrorText`) wrap that scale — use them instead of raw
  `text-*` utilities so the hierarchy stays consistent.
- **Semantic tones** (`success | warning | danger | info | neutral`) are a typed
  `Tone` union (`src/shared/components/ui/tone.ts`) consumed by `Badge` and
  `Alert`. Don't map an undocumented business status to a tone directly — do that
  mapping inside the feature that owns the status.
- **Icons** use `@tabler/icons-react` per branding, imported individually
  (`import { IconCheck } from '@tabler/icons-react'`) for tree-shaking. Components
  accept an icon-agnostic `icon?: ReactNode` slot rather than being coupled to a
  specific icon.
- **Responsive targets**: the authenticated console is desktop-first with full
  tablet support; the (not-yet-built) comensal experience is mobile-first — see
  `docs/FrontendArchitecture.md` §10.3.

### Running the design-system preview

```bash
pnpm dev
```

Then open the app root (`/`) — it currently renders a development-only preview of
every token and foundation component (typography, colors, buttons, form controls,
cards, badges, alerts, loading states, and a mobile-viewport example). This is not
a business screen and will be replaced once real routes exist.

## Authenticated app shell

The reusable layout shared by the `admin` and `capitan` roles lives under
`src/shared/components/layout/` (`AppShell`, `Sidebar`, `MobileNavDrawer`,
`Topbar`, `NavItem`, `AppShellMain`, `AccountMenuPlaceholder`), exported through
the same `@/shared/components` barrel as the rest of the design system.

- **How pages render inside it**: a route-level layout
  (`src/app/router/layouts/AppShellLayout.tsx`) wraps an `<Outlet />` in
  `<AppShell>`; any authenticated page is simply the element rendered at a child
  route of that layout — it should not render its own top-level page heading
  (`AppShell`'s `Topbar` already renders the page's `<h1>` from the route's
  `title`).
- **Navigation configuration**: `src/shared/components/layout/nav-items.ts`
  exports a typed `NavItemConfig[]` (`NAV_ITEMS`) — the 7 items from the captain
  wireframes (Panel, Eventos, Meseros, Operación en vivo, Bebidas y Cubaitor,
  Pagos, Reportes). It's shaped to add a `roles` field later, but does **not**
  filter by role yet. Each item is `status: 'available'` (with a real `href`) or
  `status: 'route-pending'` (`href: null`) — only Panel, Eventos, Meseros, and
  Reportes have a top-level route pinned in `docs/FrontendArchitecture.md` §17.
  Operación en vivo, Bebidas y Cubaitor, and Pagos are genuinely undecided
  information architecture (see the comment in that file for why) and are
  **not** registered as routes — no placeholder slug was invented for them.
  They still render in the sidebar/drawer, visibly labeled "Ruta pendiente",
  `aria-disabled`, and not keyboard-activatable.
- **Still pending**: authentication, route guards, and role-based nav/action
  filtering are not implemented — every route under the shell is currently a
  shared, unguarded development placeholder (`AppShellPreviewPage`), not a real
  business page.

Visit `/panel`, `/eventos`, `/meseros`, or `/reportes` in dev to see the shell
with a different nav item active.

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
