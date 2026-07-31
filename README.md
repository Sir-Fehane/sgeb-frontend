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

## Continuous Integration

`.github/workflows/ci.yml` ("Frontend CI") runs the same checks used locally,
against the **entire** repository (not just staged files — `lint-staged` is a
pre-commit-only tool and is never used in CI):

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm format:check`
4. `pnpm test:run`
5. `pnpm build`

**When it runs**: on every Pull Request targeting `develop` or `main`, and on
every push to `develop` or `main`.

**Runtime**: Node `22.12.0` — the minimum runtime declared by this repo's
`engines.node` (`>=22.12.0`) — is the version CI tests against; `engines.node`
only declares a floor, so this is not an exact pin the way pnpm's version is.
pnpm is installed through the official
[`pnpm/action-setup`](https://github.com/pnpm/action-setup) action, which
reads its exact version (`pnpm@11.18.0`) directly from this repo's
`packageManager` field — Corepack is **not** part of this workflow (its
bundled keyring failed to verify pnpm's signature on GitHub's runners).
Dependencies are installed with `pnpm install --frozen-lockfile` against the
committed `pnpm-lock.yaml`, which CI never modifies.

The workflow uses GitHub-maintained actions under `actions/*` (checkout,
setup-node, cache) plus the pnpm-maintained `pnpm/action-setup` — not
exclusively GitHub-maintained actions.

This workflow does **not** deploy the application — it only validates it.

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
  filtering are not implemented — `/panel`, `/meseros`, and `/reportes` still
  render the shared, unguarded development placeholder (`AppShellPreviewPage`).
  `/eventos` now renders the real, presentation-only events UI foundation
  instead — see the next section.

Visit `/panel`, `/eventos`, `/meseros`, or `/reportes` in dev to see the shell
with a different nav item active.

## Authentication UI foundation

A **UI-only** foundation for the public SSO web auth screens lives under
`src/features/auth/` (`components/`, `pages/`, `schemas/`, `types/`, `utils/` —
no `services/queries/mutations/stores`, since API integration isn't part of this
foundation yet).

- **Routes** (public, unauthenticated, rendered outside `AppShell`):
  - `/login` — S1, shared by `admin` and `capitan`.
  - `/verificacion-2fa` — the still-undesigned web adaptation of S3; shows a
    fallback message when visited without an in-progress verification (no real
    login flow produces that state yet).
  - `/recuperar` — S5, request a recovery link.
  - `/recuperar/:token` — S6, set a new password. The route's `token` is never
    read, displayed, or logged on this branch.
- **`AuthLayout`** (`src/shared/components/layout/AuthLayout.tsx`) — the
  project-owned, centered card layout for these screens. A real, separate
  layout from `AppShell`, exported through the same `@/shared/components`
  barrel; each auth page renders it directly (there is no shared route-level
  wrapper, since each screen has its own distinct title/description).
- **Validation source**: every Zod schema under `src/features/auth/schemas/`
  mirrors `docs/sso/openapi-sso (1).yaml` and
  `docs/sso/Diccionario_Datos_Auth_SGEB_v3.md` field-for-field (lengths, regex,
  and the exact password policy) — see `src/features/auth/utils/patterns.ts`
  for the shared regexes.
- **Still pending** (explicitly out of scope for this foundation): SSO API
  integration, token storage, `AuthProvider`, a Zustand auth store, route
  guards, and role-based redirects. Every routed page's submit handler is a
  dev-only no-op that visibly states the integration is pending — it never
  claims a user was authenticated. See `docs/FrontendArchitecture.md` §18 for
  the full intended flow once these land.

## Events UI foundation

A **UI-only** foundation for the SGEB events module lives under
`src/features/events/` (`components/`, `pages/`, `schemas/`, `types/`, `utils/`,
`fixtures/` — no `services/queries/mutations`, since API integration isn't part
of this foundation yet).

- **Routes**: `/eventos` (inside `AppShell`) is the **only registered events
  route** — a real, presentation-only events list, replacing the generic
  `AppShellPreviewPage` placeholder. `/eventos/nuevo` and `/eventos/:id` are
  **intentionally not registered**: `docs/FrontendArchitecture.md` §17 lists
  those exact slugs only under a section explicitly headed "Proposed Routing
  Structure" — not reconfirmed the way `/eventos` itself was, so registering
  them would be inferring an unapproved URL.
- **Event creation is currently a non-routed field-validation prototype**
  (`EventCreateForm` + `EventCreateFieldPrototypePage`, not wired into
  `routes.ts`). The documented wireframe (W-03 "Crear evento") is a five-step
  wizard, but its exact step boundaries are still pending verification against
  the wireframe (no PDF image rendering was available to inspect it) — the
  prototype's single-page layout exists only to exercise field-level
  validation and must not be read as the approved creation UX. Its final
  action is labeled "Validar borrador" and only demonstrates successful local
  validation — it never claims an event was created or persisted.
  - **Captain assignment** (`id_capitan`) has no selector anywhere in this
    prototype: whether it should derive from the authenticated capitán's own
    session, be picked by an admin, or depend on role/permissions is pending
    the authentication/role decisions of a later branch.
  - **Comanda upload** (`comanda_url`) is not an editable field either — no
    upload endpoint is documented (`docs/FrontendArchitecture.md` §7.5), and
    asking a user to hand-type a technical URL isn't a real workflow, so the
    prototype only shows a non-interactive "pending" note.
- **Validation source**: `src/features/events/schemas/eventCreateSchema.ts`
  mirrors the subset of `EventoCrear` this prototype validates
  (`docs/api/documentacion-endpoints.txt`) field-for-field, plus two documented
  cross-field rules (SGEB-2008 fecha/inicio coherence, SGEB-4007 num_mesas vs.
  salón capacity). `titulo`'s maximum length is a documented blocker for API
  integration: the OpenAPI schema says `maxLength: 120`, the data dictionary's
  raw column-type text reads `VARCHAR(40)` — a real, unresolved conflict, so
  only the minimum (3 characters) is enforced until the backend team clarifies
  which maximum is correct.
- **Page-level state architecture**: `EventsContent`
  (`src/features/events/components/EventsContent.tsx`) is the presentational
  composition — header, filters, and exactly one of loading / error / empty /
  populated, selected purely from its own props (`events`, `isLoading`,
  `errorMessage`, `onRetry`, `filters`, `onFilterChange`, `salones`,
  `onSelectEvent`, `onCreate`). The routed `EventsPage` is only a thin,
  fixture-backed wrapper around it — always `isLoading={false}`, no
  `errorMessage`, no development-state selector. Real API integration wires
  TanStack Query state into those same two props without touching
  `EventsContent` itself.
- **Development fixtures**: `src/features/events/fixtures/eventFixtures.ts` —
  neutral, fictional salón/event data, clearly labeled as dev-only and easy to
  delete once real API integration lands. `/eventos` always renders this
  fixture list (clearly labeled as development data) — there is no
  user-facing control to fake loading/empty/error states; `EventsLoadingState`
  and `EventsErrorState` remain fully implemented and independently testable
  (both directly and through `EventsContent`'s own props), and the empty
  state is reachable for real by filtering the fixture list down to zero
  matches.
- **Event list types are presentation models, not confirmed response DTOs.**
  No read/response schema for an event exists in any documented source (only
  `EventoCrear`'s request shape is documented) — `EventListItemViewModel`
  (`src/features/events/types/event.ts`) is a necessary synthesis for
  fixtures/components, not a literal backend contract; `salonNombre`/
  `capitanNombre` are optional, fixture-only display fields.
- **Still pending** (explicitly out of scope for this foundation): SGEB API
  integration, real salón directories, event detail/editing, and any
  authenticated-user-derived field. Selecting an event or requesting creation
  on `/eventos` shows an inline notice rather than silently doing nothing or
  faking navigation.

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
