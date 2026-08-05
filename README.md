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
  filtering are not implemented — `/reportes` still renders the shared,
  unguarded development placeholder (`AppShellPreviewPage`). `/panel`,
  `/eventos`, and `/meseros` now render real, presentation-only feature UIs
  instead — see the sections below.

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

## Waiters UI foundation

A **UI-only** foundation for the SGEB waiters directory lives under
`src/features/waiters/` (`components/`, `pages/`, `types/`, `utils/`,
`fixtures/` — no `services/queries/mutations`, since API integration isn't
part of this foundation yet).

- **Routes**: `/meseros` (inside `AppShell`) is the **only registered waiters
  route** — a real, presentation-only directory, replacing the generic
  `AppShellPreviewPage` placeholder. No waiter detail, creation, or invite
  route is registered: unlike `/eventos/nuevo` or `/eventos/:id` (at least
  listed as "Proposed"), `docs/FrontendArchitecture.md` §17 doesn't list
  `/meseros/:id`, `/meseros/nuevo`, or `/meseros/invitar` at all — there is
  nothing to infer a slug from.
- **No separate "operational waiter" entity exists.** The 29-table data
  dictionary has no `MESERO` table — the only documented waiter-directory
  source is `GET /usuarios?rol=mesero`, returning the same `Usuario` schema
  shared with `admin`/`capitan`. `src/features/waiters/types/waiter.ts`
  documents this explicitly and does not invent a second entity; it also
  flags a real, unresolved identifier conflict: SGEB's `Usuario.id_usuario`
  is a plain integer, while the SSO documentation states that identifier
  never leaves the backend and only `uuid_usuario` is exposed
  (`docs/FrontendArchitecture.md` §8.1). Every waiter identifier here is
  therefore an opaque string, never parsed or validated.
- **Fields shown**: name, correo, teléfono (or "No registrado"), and account
  status (`activo`/`inactivo`, from `Usuario.activo`) — the only fields
  `Usuario` documents that are appropriate directory content. No rating, no
  completed-events count, no payment/bank data, no per-event
  attendance/assignment status: none of those are documented on `Usuario`,
  and the tables that do define them (`CALIFICACION`, `PARTICIPACION_EVENTO`,
  `CONFIRMACION_LLEGADA`, `PAGO`) are either per-event (no "current event"
  exists on a general directory) or belong to a separate, contract-pending
  dashboard screen (`GET /dashboard/meseros`, §7.1).
- **Invitation renders genuinely disabled — it is not a form, and not a
  clickable notice either.** `POST /auth/invitaciones` (SSO) is documented,
  but the W-04 wireframe's invite panel captures only a phone number — a
  field the confirmed contract doesn't even have (it requires
  `nombre`/`apellido_paterno`/`correo`/`id_rol_destino` instead), and
  `id_rol_destino`'s integer↔role mapping is undocumented. This mismatch is
  already flagged in `docs/FrontendArchitecture.md` §8.2/§19 item 13 as
  needing a design decision — building a capture form here would mean
  guessing which field set is right. `WaitersPageHeader`'s "Invitar mesero"
  button has no click handler and renders with the native `disabled`
  attribute, with visible supporting text explaining the pending fields/role
  mapping; the component accepts an `onInvite` callback prop so a real
  handler can be wired in later, but the routed page does not supply one.
- **Waiter rows are static, not selectable.** No waiter-detail route is
  approved (`docs/FrontendArchitecture.md` §17 doesn't list `/meseros/:id`
  even as "Proposed"), so `WaiterListItem` renders as a plain, non-interactive
  item by default — never a clickable div. It only becomes a keyboard-operable
  button when an `onSelect` callback is explicitly supplied, which the routed
  `/meseros` page does not do.
- **Development fixtures**: `src/features/waiters/fixtures/waiterFixtures.ts`
  — neutral, fictional names/contact info, clearly labeled as dev-only. No
  fake links to event/participation/payment fixtures are fabricated, since
  none of those concerns are displayed in this directory.
- **Still pending** (explicitly out of scope for this foundation): SGEB/SSO
  API integration, waiter detail, SSO invitation sending, event assignment,
  attendance, and payments (all separate features/screens).

## Captain Dashboard UI foundation

A **UI-only** foundation for the captain's operational dashboard lives under
`src/features/dashboard/` (`components/`, `pages/`, `types/`, `utils/`,
`fixtures/` — no `services/queries/mutations`, since API integration isn't
part of this foundation yet). This is the **captain** dashboard only — there
is no admin dashboard, no role switcher, and no inferred "current captain"
(auth/role resolution is still pending).

- **Routes**: `/panel` (inside `AppShell`) is the **only registered dashboard
  route**, replacing the generic `AppShellPreviewPage` placeholder. No
  event-detail or live-operation route is registered — none is approved in
  `docs/FrontendArchitecture.md` §17.
- **Source contract**: `GET /dashboard/capitan` and its `DashboardCapitan` /
  `AlertaOperativa` schemas in `docs/api/openapi-sgeb.yaml` (v1.6.0). This
  **resolves** the "pending" dashboard/KPI contract §7.1 previously noted for
  the captain role specifically — the admin dashboard remains unresolved.
  Every field rendered traces back to this contract; no additional KPI,
  chart, status, or action is invented.
- **Six sections, each independently nullable**: resumen (event counts),
  próximos eventos, riesgo de personal (staffing), operación en curso,
  cierre y pagos, and alertas operativas. Every `id_evento`/`id_alerta` is an
  opaque string (`src/features/dashboard/types/dashboard.ts`), never parsed,
  validated, or used to build a route.
- **SGEB-0004 partial success**: when the API reports this code, some
  sections arrive `null` because they failed to compute (not because they
  were excluded via `secciones`). Each null section renders its own
  "No disponible" (`DashboardSectionUnavailable`) — never a spinner, never a
  failed dashboard — and `CaptainDashboardContent`'s `isPartial` prop shows a
  non-interrupting banner using the exact documented wording. A **global**
  error (`errorMessage`, e.g. SGEB-5008) is a distinct, total-failure state
  that replaces the whole dashboard body instead.
- **Date-range filters**: native date inputs for the two documented,
  user-facing query parameters (`fecha_desde`/`fecha_hasta`), defaulting to
  today / today+30 days. Validation is local-only (inverted range, >366-day
  span) via `validateDashboardDateRange` — nothing is ever sent to a server.
  `secciones` is **not** exposed as a user-facing filter; it's an internal
  API mechanism, not a documented filter concept.
- **Two unresolved actions render genuinely disabled**, mirroring the
  Waiters feature's pattern: "Invitar meseros" in the staffing-risk section
  has no approved invitation flow (same contract gap as `WaitersPageHeader`),
  so it renders with the native `disabled` attribute and an accessible
  pending explanation rather than a modal/route/form that doesn't exist.
  Upcoming-event rows render as plain, non-interactive items by default
  (never a clickable div) — the routed page doesn't supply `onSelectEvent`
  since no event-detail route is approved.
- **Development fixtures**: `src/features/dashboard/fixtures/dashboardFixtures.ts`
  — a fully populated `CAPTAIN_DASHBOARD_FIXTURE` (one event in progress,
  upcoming events, a staffing risk, one alert per documented severity) and an
  `EMPTY_CAPTAIN_DASHBOARD_FIXTURE` demonstrating that a dashboard with zero
  counts/empty lists/no current event is a valid state, distinct from
  "unavailable". `/panel` always renders the populated fixture, clearly
  labeled as development data; loading/global-error/partial-success states
  remain fully implemented and independently testable through
  `CaptainDashboardContent`'s own props.
- **A newly-flagged, unresolved cross-document drift** (not fixed on this
  branch — the Events feature is frozen): `openapi-sgeb.yaml`'s current
  `EventoCrear` schema requires `uuid_capitan` (a UUID), while the
  already-shipped Events UI foundation was built against
  `docs/api/documentacion-endpoints.txt`'s older `EventoCrear`, which used
  `id_capitan` (a plain integer). This is a genuine version drift between
  two OpenAPI-shaped documents in the repo, surfaced here because this
  branch is the first to read the newer document closely.
- **Still pending** (explicitly out of scope for this foundation): SGEB API
  integration, authentication/role resolution, Socket.IO, event-detail and
  live-operation routes, and waiter invitations (same contract gap as the
  Waiters feature).

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
