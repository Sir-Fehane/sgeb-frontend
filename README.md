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
  tablet support; the public diner (comensal) experience is mobile-first — see
  "Public diner UI foundation" below and `docs/FrontendArchitecture.md` §10.3.

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
  filtering are not implemented. `/panel`, `/eventos`, `/meseros`, and
  `/reportes` all now render real, presentation-only feature UIs — see the
  sections below.

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
- **Frozen pending migration to a separate SSO frontend.** `openapi-sso.yaml`
  v2.2.0 reclassified S1–S7 as provider-hosted screens (ADR-002,
  `docs/decisions.md`) — the provider now serves its own login/2FA/recovery
  UI directly, not this repository. `/login`, `/verificacion-2fa`,
  `/recuperar`, and `/recuperar/:token` are kept exactly as they were: not
  connected to `/interno/*`, not redesigned, not turned into route guards.
  They remain routed and rendering for now, but are not the integration path
  going forward — see "OIDC client foundation" below for the actual
  provider-integration route (`/auth/callback`). Removing or migrating these
  four routes is a separate future refactor, not part of this branch.

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
  - **Captain assignment** (`uuid_capitan`, required by `EventoCrear`) has no
    selector anywhere in this prototype: it is required by the confirmed
    contract, but its real source (the authenticated capitán's own session vs.
    an admin-only picker vs. something role-dependent) is pending the
    authentication/role decisions of a later branch. This prototype does not
    invent a captain selector, a fake captain list, or a disabled field merely
    to mimic the API — the future request-composition layer must combine this
    prototype's validated values with a real `uuid_capitan` once that's
    resolved.
  - **Comanda upload** (`comanda_url`) is not an editable field either — no
    upload endpoint is documented (`docs/FrontendArchitecture.md` §7.5), and
    asking a user to hand-type a technical URL isn't a real workflow, so the
    prototype only shows a non-interactive "pending" note.
- **Validation source**: `src/features/events/schemas/eventCreateSchema.ts`
  mirrors the subset of `EventoCrear` this prototype validates
  (`docs/api/openapi-sgeb.yaml`, currently v1.6.0) field-for-field, plus two
  documented cross-field rules (SGEB-2008 fecha/inicio coherence, SGEB-4007
  num_mesas vs. salón capacity). `titulo` enforces exactly the confirmed
  `minLength: 3, maxLength: 120` rule (both a Zod rule and the input's
  `maxLength` HTML attribute) — the previous 40-vs-120 conflict against the
  data dictionary's raw column-type text is resolved in favor of the OpenAPI
  schema.
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
  `EventoCrear`'s request shape is documented — confirmed still true in
  `openapi-sgeb.yaml` v1.6.0: `GET /eventos`/`GET /eventos/{id}` both respond
  with the generic envelope, no dedicated schema) — `EventListItemViewModel`
  (`src/features/events/types/event.ts`) is a necessary synthesis for
  fixtures/components, not a literal backend contract; `salonNombre`/
  `capitanNombre` are optional, fixture-only display fields.
  `EventListItemViewModel` carries **no captain-identifier field at all**
  (no `idCapitan`/`uuidCapitan`) — the list neither displays nor filters by
  captain identity, so there is no genuine use for one here, even though
  `EventoCrear.uuid_capitan` is a real, confirmed, required backend field.
  That requirement is documented where it actually belongs — see
  `EventCreateFieldPrototypeValues` below.
- **Still pending** (explicitly out of scope for this foundation): SGEB API
  integration, real salón directories, event editing, and any
  authenticated-user-derived field (including a real `uuid_capitan` source).
  Requesting creation on `/eventos` shows an inline notice rather than
  silently doing nothing or faking navigation. Selecting an event now
  navigates to `/eventos/:id` — see "Event Detail UI foundation" below.

## Event Detail UI foundation

A **UI-only, fixture-backed** foundation for a single event's detail screen
lives inside `src/features/events/` (not a competing top-level feature) —
`components/EventDetail*`, `pages/EventDetailPage.tsx`,
`fixtures/eventDetailFixtures.ts`, plus a few narrow, feature-local
utilities (`parseEventId.ts`, `eventDetailFormatting.ts`,
`comandaUrlSafety.ts`). This is presentation and navigation only — see
"Still pending" below for everything it deliberately does not do.

- **Route**: `/eventos/:id` (inside `AppShell`) — the route value is a
  **positive integer** SGEB event id, never a UUID: `USUARIO` is the only
  domain whose public identifier is a UUID (`docs/FrontendArchitecture.md`
  §8.1); events, tables, salones, and participations all use plain
  integers. `parseEventId` rejects empty, zero, negative, decimal,
  non-numeric, and unsafe-integer values _before_ any fixture lookup — a
  malformed id renders the feature's own unavailable state, never a
  redirect and never a raw parsing error. None of the documented
  operational children (`/editar`, `/equipo`, `/pase-de-lista`,
  `/montaje`, `/cubaitor`, `/cierre`, `/pagos` —
  `docs/FrontendArchitecture.md` §17) are registered in this branch.
- **Source contract**: `GET /eventos/{id_evento}` (`openapi-sgeb.yaml`
  v1.6.0) currently documents its 200 response as the generic `Exito`
  envelope, not a dedicated `EventDetail` schema — so
  `EventDetailViewModel` (`src/features/events/types/event.ts`) is a
  feature-local presentation synthesis of confirmed `EventoCrear` fields
  plus the server-generated `estado`, exactly the same status as
  `EventListItemViewModel` (see its own comment). `salonNombre` is a
  presentation-only convenience, not a documented `/eventos/{id}` field —
  reused verbatim from the existing list model's naming, not a new
  invention.
- **Confirmed domain fields shown**: título, tipo, estado, salón (display
  convenience), fecha, hora de presentación, inicio, cupo de meseros,
  número de mesas, tarifa por mesero (formatted MXN, display only — never
  a derived payroll calculation), radio de geocerca (meters, no map). No
  captain identifier, UUID, QR value, or other technical backend
  identifier is ever displayed — `idEvento` is used only for routing.
- **Comanda is display-only.** `EventDetailComandaSection` renders an
  "Abrir comanda" link only when `comandaUrl` passes `isSafeComandaUrl`
  (mirrors `EventoCrear.comanda_url`'s documented `^https?://` pattern) —
  opens in a new tab with `rel="noopener noreferrer"`, never a
  `javascript:` URL. No upload, edit, or generated-file action exists; the
  comanda-upload origin/path itself remains a known, separate contract gap
  (`docs/FrontendArchitecture.md` §7.5). Absent/unsafe `comandaUrl` shows a
  restrained "no comanda disponible" message, never a fake link.
- **The operation roadmap is non-interactive where routes don't exist
  yet.** `EventDetailRoadmapSection` lists the six already-documented
  per-event operational areas (Selección de equipo, Pase de lista, Montaje
  / asignación de mesas, Bebidas y Cubaitor, Cierre, Pagos) as contextual
  entry points only — mirrors `NavItem`'s `status: 'route-pending'`
  treatment (`aria-disabled`, a visible "Próximamente" badge, no `href`,
  no `href="#"`, no interactive role) rather than implying any of those
  screens already work.
- **No API integration, no live dashboard.** `GET
/eventos/{id_evento}/dashboard` (`DashboardEvento`) is the separate,
  explicitly out-of-scope operational dashboard (resumen/staffing/
  montaje/piso/barra/comensal/cierre/alertas) — this page is the stable
  event-information hub, not a duplicate of it. No polling, no Socket.IO,
  no attendance implementation, no status-transition/editing action exists
  anywhere on this page.
- **Development fixtures**: `src/features/events/fixtures/
eventDetailFixtures.ts` — exactly two records (per this branch's
  narrow-fixture instruction): `idEvento 1001` (social, publicado, WITH a
  comanda URL) aligned with the events list's matching entry, and
  `idEvento 2001` (empresarial, en_curso, WITHOUT a comanda URL) reachable
  directly but not linked from the list — none of the list's five existing
  events combine `tipo: empresarial` with `estado` in
  `{borrador, en_curso}`. The list's other four events intentionally have
  no matching detail fixture; visiting their `/eventos/:id` correctly
  renders the unavailable state, a valid outcome for this fixture-backed
  foundation.
- **Events list discoverability**: each row in `/eventos` now has a
  restrained "Ver detalle" link (`EventListItem`) to `/eventos/{idEvento}`,
  as a sibling of — never nested inside — the existing whole-row select
  button (avoids the invalid-HTML/accessibility problem of an `<a>` inside
  a `<button>`). The existing select button's behavior, tests, and filters
  are all unchanged.
- **Still pending** (explicitly out of scope for this foundation): SGEB API
  integration, live `DashboardEvento` data, Socket.IO, event attendance,
  montaje/dispensing UI, event editing or status transitions, and the
  comanda upload contract. "Selección de equipo" is no longer pending —
  see below.

## Team Selection UI foundation (W-05)

A **UI-only, fixture-backed** foundation for W-05 "Seleccionar equipo"
lives at `src/features/events/team-selection/` — a subdirectory of the
existing Events feature (not a competing top-level "team" domain), with
its own `components/`, `pages/TeamSelectionPage.tsx`, `fixtures/`, and
`types/`.

- **Route**: `/eventos/:id/equipo` (inside `AppShell`), the first of
  Event Detail's documented operational children
  (`docs/FrontendArchitecture.md` §17) to become real. Reuses
  `parseEventId` from the Events feature directly — the same positive
  integer SGEB event id as `/eventos/:id`, never a UUID. A malformed
  parent event id renders `EventDetailUnavailableState` (reused, not
  duplicated — the exact same "event not found" concern as Event Detail
  itself).
- **Source contract**: `GET /eventos/{id_evento}/participaciones?estado=aparto`
  (`openapi-sgeb.yaml` v1.6.0, `Participaciones`) lists applicants; the
  captain's action is `PATCH /participaciones/{id_participacion}/estado`
  with `{"estado": "seleccionado"}`. No dedicated `Participacion` response
  schema is documented (the list responds with the generic `ExitoLista`
  envelope), so `TeamSelectionParticipantViewModel`
  (`team-selection/types/teamSelection.ts`) is a feature-local synthesis,
  same status as `EventDetailViewModel`/`EventListItemViewModel`.
- **Only the documented forward transition is modeled: `aparto →
seleccionado`.** The current contract's own `PATCH .../estado` request
  body enum (`seleccionado | confirmo_asistencia | asignado | salida`)
  never lists `aparto` as a valid target — there is no reverse transition
  in this branch, and none is invented. No deselect, reject, delete, bulk
  action, or drag-and-drop exists.
- **Selection is local-only, fixture-backed, and never persisted.**
  Selecting a candidate invokes a typed callback
  (`{ idParticipacion, estado: 'seleccionado' }`) that only updates
  in-memory React state on `TeamSelectionPage` — no Axios call, no
  TanStack Query hook, no network request of any kind. A real (but
  instant) microtask yield (`await Promise.resolve()`, never
  `setTimeout`) makes the `selecting` row state genuinely observable and
  testable, during which the row's "Seleccionar" button is a real
  `disabled` button (never `aria-disabled` decoration on a clickable
  element) — repeated selection is structurally prevented, not just
  visually discouraged. Refreshing the page resets all demo state.
- **Candidates and selected participants are two views of the same live
  list**, partitioned purely by each participant's current `estado` — a
  selected candidate moves from one section to the other by that field
  changing, never by a separate "removed" action. The summary section
  (cupo, selected count, applicant count) reuses `EventDetailViewModel.
cupoMeseros` from the existing Event Detail fixture — never a second,
  independently-maintained source of the same number — and never computes
  or claims "equipo completo" from any guessed staffing rule.
- **Presentation model fields**: `idParticipacion` (positive integer,
  never a UUID), `nombre` (presentation-only convenience, same status as
  `capitanNombre`/`nombreCompleto` elsewhere in this app), `puesto`
  (`mesero | barra`, from `POST /eventos/{id}/participaciones`'s
  documented request body — a real domain concept even without a GET
  response schema to source it from), `estado` (`aparto | seleccionado`
  only — everything from `confirmo_asistencia` onward belongs to
  attendance (W-06) and later screens). No phone, email, rating,
  attendance percentage, experience, photo, payment/bank data, internal
  numeric user id, or captain UUID exists anywhere on this screen.
- **Development fixtures**: `team-selection/fixtures/
teamSelectionFixtures.ts` — keyed by `idEvento`, aligned with
  `EVENT_DETAIL_FIXTURES`. Event 1001 has both applicants and an
  already-selected participant (both list states populated at once);
  event 2001 has only applicants (demonstrates an empty selected list);
  any other event id naturally has no roster at all (demonstrates an
  empty candidate list too) — a valid outcome, not a bug.
- **Event Detail's roadmap now links here.** "Selección de equipo" in
  `EventDetailRoadmapSection` is a real `Link` to `/eventos/{id}/equipo`;
  the remaining five entries (Pase de lista, Montaje / asignación de
  mesas, Bebidas y Cubaitor, Cierre, Pagos) stay exactly as they were —
  non-interactive, `aria-disabled`, labeled "Próximamente", no `href="#"`.
- **Still pending** (explicitly out of scope for this foundation): SGEB
  API integration, event attendance (W-06 — arrival confirmation,
  biometric results, geofence, `confirmo_asistencia`/`confirmo_llegada`;
  reserved for `feature/event-attendance-ui-foundation`), table/montaje
  assignment, dispensing, Socket.IO, and any route guard or OIDC
  integration (the OIDC client foundation remains untouched).

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
- **A cross-document drift flagged here, resolved on `refactor/events-contract-v1-6`:**
  `openapi-sgeb.yaml`'s `EventoCrear` schema requires `uuid_capitan` (a UUID),
  while the Events UI foundation had originally been built against
  `docs/api/documentacion-endpoints.txt`'s older `EventoCrear`, which used
  `id_capitan` (a plain integer) — a genuine version drift between two
  OpenAPI-shaped documents in the repo. The Events feature (list types,
  fixtures, the field-validation prototype's comments/tests) has since been
  aligned to `uuid_capitan` — see the "Events UI foundation" section above.
- **Still pending** (explicitly out of scope for this foundation): SGEB API
  integration, authentication/role resolution, Socket.IO, event-detail and
  live-operation routes, and waiter invitations (same contract gap as the
  Waiters feature).

## Reports UI foundation

A **UI-only** foundation for the waiter-performance report lives under
`src/features/reports/` (`components/`, `pages/`, `types/`, `fixtures/`,
`utils/` — no `services/queries/mutations`, since API integration isn't part
of this foundation yet).

- **Routes**: `/reportes` (inside `AppShell`) is the **only registered
  reports route** — a real, presentation-only report, replacing the generic
  `AppShellPreviewPage` placeholder. No `/reportes/:id`,
  `/reportes/meseros/:uuid`, `/reportes/exportar`, `/reportes/merma`, or
  `/reportes/pagos` route is registered — no waiter-detail, export, or
  event-specific route is approved.
- **Source contract**: `GET /dashboard/meseros`
  (`docs/api/openapi-sgeb.yaml`, v1.6.0) — a single, separately-paginated
  endpoint returning one historical aggregate row per waiter
  (`DesempenoMesero`: attendance, ratings, and payment totals over a date
  range). This is the **only** backing contract for this screen. Event-specific
  endpoints (`GET/POST /eventos/{id}/reportes-merma`, `GET /eventos/{id}/cierre`,
  `GET /eventos/{id}/pagos`, `POST /eventos/{id}/pagos/calcular`,
  `PATCH /pagos/{id}/pagado`, `PATCH /pagos/{id}/fallido`) are explicitly **not**
  treated as sources for this general Reports screen — those belong to
  separate, future Cierre/Pagos features scoped to a specific event.
- **Scope is historical waiter performance, not a general report center.**
  The page heading is "Reportes" (rendered by `AppShell`'s `Topbar`, per the
  established convention); the subtitle honestly states "Desempeño histórico
  de meseros" — never "reportes generales del sistema," a financial audit, an
  event report, or a merma report. No functional tabs exist for report
  categories the current contract doesn't back (attendance/ratings/payments
  all come from the _same_ `DesempenoMesero` row, so there's nothing to
  tab between); if the wireframe visually suggests other categories, they
  are not built here — see "Still pending" below.
- **Presentation model**: `WaiterPerformanceReportItem`
  (`src/features/reports/types/report.ts`) mirrors `DesempenoMesero`
  field-for-field (camelCase). `uuidUsuario` is an opaque string — never
  parsed, converted to an integer, or displayed anywhere; `clabeVigente` is
  only ever rendered as "Vigente"/"No vigente" text, never the CLABE itself.
  No undocumented field exists (no teléfono, correo, employee number, named
  missed events, trend, rank, or previous-period comparison).
- **Filters**: native `Desde`/`Hasta` date inputs (local-only inverted-range
  validation; **no** undocumented maximum-range check, unlike
  `GET /dashboard/capitan`'s confirmed 366-day limit — `/dashboard/meseros`
  documents no specific number) and an `orden` `<select>` with exactly the
  three documented values (Calificación, Asistencias, Monto pagado). No
  `uuid_usuario` filter is exposed as a raw text input — the endpoint
  supports it, but no approved waiter-selector integration exists in this
  branch; a future integration would source it from that selector, never a
  free-text UUID field. No pagination control (page/page-size) exists either
  — see "Contract limitation" below.
- **Page-level state architecture**: `ReportsContent`
  (`src/features/reports/components/ReportsContent.tsx`) is the
  presentational composition — header, filters, and exactly one of
  loading/error/empty/populated, selected purely from its own props
  (`items`, `isLoading`, `errorMessage`, `onRetry`, `filters`,
  `onFilterChange`) — mirrors `EventsContent`/`WaitersContent`/
  `CaptainDashboardContent`'s architecture. Unlike `DashboardCapitan`,
  `GET /dashboard/meseros` has no documented partial-success behavior (no
  SGEB-0004-style per-section nullability) — it's a flat array, so only
  these four whole-screen states exist.
- **Report table**: a plain semantic `<table>` (this is the first feature
  needing one — no shared `Table` primitive exists yet, so this isn't a
  refactor of anything) with `<th scope="col">` headers grouped exactly as
  documented (Mesero, Participación, Asistencia, Calificación, Pagos,
  Cuenta), wrapped in its own horizontally-scrolling container so only the
  table overflows on narrow viewports, never the page. Rows are plain
  `<tr>`s — never a link or button; no action menu, payment action, or
  invitation action exists.
- **Development fixtures**: `src/features/reports/fixtures/reportFixtures.ts`
  — 4 fictional waiter rows covering zero/some inasistencias, 100%/partial
  attendance, a `null` `calificacionPromedio`, zero/positive
  `montoPendiente`, and both `clabeVigente` values; plus an empty-array
  fixture. `/reportes` always renders the populated fixture, clearly labeled
  as development data.
- **Local ordering is demo-only.** `sortWaiterPerformanceReport`
  (`src/features/reports/utils/`) sorts the in-memory fixture rows when
  `orden` changes — a stand-in for the server's real ordering, which future
  API integration owns. Supports exactly the three documented `orden`
  values, never mutates its input, and sorts a `null` `calificacionPromedio`
  after every rated waiter (not as a "low" rating) with a stable
  name-based tie-break for deterministic rendering.
- **Still pending** (explicitly out of scope for this foundation): SGEB API
  integration, a `uuid_usuario` waiter-selector, pagination UI, report
  exports (CSV/PDF), charts, and any event-specific Cierre/Pagos/merma
  screen (separate future features, not alternate sources for this one).

## Route-error foundation

A **UI-only** foundation for unmatched routes and unexpected route-level failures
lives under `src/features/route-errors/` (`components/`, `pages/` — no
`services/queries/mutations`, since this is unrelated to API/domain error
handling). This is client-side routing infrastructure, independent of
authentication, current role, current user, or API availability.

- **Not-found route**: `path: '*'` in `src/app/router/routes.tsx` (already
  registered, now pointing at `features/route-errors/pages/NotFoundPage.tsx`)
  renders a real page for any URL that matches no registered route — a normal
  client-navigation outcome, not a crash. It never redirects automatically,
  never redirects to `/login`, and never claims the user lacks permission; its
  one recovery action links to `/panel`, the app's stable authenticated home.
- **Route error boundary**: every top-level route in `routes.tsx` has an
  `errorElement` (`RouteErrorBoundary`), the idiomatic React Router v7
  mechanism for a thrown loader/action/render error or a failed lazy-module
  import. It distinguishes exactly two outcomes via `useRouteError` +
  `isRouteErrorResponse`: a thrown `404` route response renders the same
  not-found presentation as the catch-all route; anything else (a thrown
  `Error`, an unknown value, or any other response status) renders one safe,
  generic "No pudimos abrir esta página" presentation. No 401/403 is
  special-cased into a login redirect or authorization behavior — that
  remains explicitly out of scope. `errorElement` bubbles from a child route
  to its nearest ancestor that defines one, so the single instance on the
  `AppShellLayout` route also covers `panel`/`eventos`/`meseros`/`reportes` —
  and correctly replaces the whole AppShell chrome rather than rendering
  inside it, since a route failure is never treated as AppShell domain
  content.
- **Shared presentation, never raw error text**:
  `RouteErrorPresentation` (`src/features/route-errors/components/`) is the
  one reusable component behind both the not-found page and the error
  boundary. It has no prop for the original thrown value or message — the
  boundary discards it down to just a `variant` — so it structurally cannot
  render a stack trace, `Error.message`, a file path, or a `technical_message`.
  The not-found variant uses plain, non-assertive text; the unexpected-error
  variant uses an assertive `Alert` (`tone="danger"`). Both always render
  exactly one `<h1>` and a real "Volver al panel" link; the unexpected variant
  additionally offers a "Reintentar" button that calls a real
  `window.location.reload()` — but only at the boundary itself, so the
  presentational component stays fully unit-testable via an injected callback,
  without ever triggering real navigation inside a test.
- **Hydration fallback**: every route in this app is registered via
  route-level `lazy()`, and until this branch nothing was configured for the
  window before the initially-matched route's module resolves — reproducible
  as `No \`HydrateFallback\` element provided...`on a fresh render. Every
top-level route now also has a`hydrateFallbackElement`
(`RouteHydrateFallback`): one accessible `role="status"`region (via the
existing`Spinner` component) with no fake progress and no simulated delay.
- **Still pending** (explicitly out of scope for this foundation): SGEB/SSO
  API error handling (envelope parsing, `result.code` mapping) — a
  deliberately separate concern from route-level errors — plus
  authentication, route guards, and role-based authorization.

## Public diner UI foundation

A **UI-only** foundation for the anonymous, QR-based guest (comensal)
experience lives under `src/features/public-diner/` (`components/`, `pages/`,
`types/`, `fixtures/`, `schemas/` — no `services/queries/mutations`, since API
integration isn't part of this foundation yet). It ships in this same
repository but is **architecturally independent** of the captain/admin
console: no `AppShell`, no `AuthLayout`, no SSO, no Bearer token, no derived
role, no shared authenticated state.

- **Route**: `/publico/mesas/:codigoQr` — reached directly from a table's QR
  code, mounted outside `AppShell`/`AuthLayout` with its own minimal,
  mobile-first layout (`PublicDinerLayout`, feature-local for now —
  `docs/FrontendArchitecture.md` §12 proposes promoting this to a shared
  `PublicLayout` once a second public route genuinely needs it; premature
  before that). `codigoQr` is an opaque route value — never displayed,
  parsed, or generated. No `/publico`, `/publico/mesas` (bare), or
  `/publico/mesas/:codigoQr/calificar` route is registered — the rating form
  is embedded in this one page instead of a separate route.
- **Source contract**: `docs/api/openapi-sgeb.yaml` v1.6.0's
  `/publico/mesas/{codigo_qr}*` endpoints (`GET` for the table/waiter view,
  `POST .../solicitudes` for the attention request, `POST .../calificaciones`
  for the rating). `POST .../token`'s relationship to the `GET` response's own
  `token_comensal` field is a genuine, **unresolved** integration question
  this branch does not decide — see "Still pending" below.
- **Current scope**: table label + assigned waiter name, one "Llamar al
  mesero" action, and a waiter rating form. Nothing else — no menu, no
  ordering, no payment, no waiter contact info, no QR scanner.
- **"Pedir cuenta" is intentionally excluded**, per `docs/decisions.md`'s
  confirmed product decision — SGEB is banquet/event service (a fixed
  per-event tariff), not restaurant table billing. The backend's `tipo` enum
  still documents `cuenta` (and `otro`); this UI simply never surfaces
  either — only `tipo: "atencion"` is exposed.
- **Presentation model**: `PublicDinerTableViewModel` mirrors the `GET`
  response's inline `data` object (`etiqueta`, `mesero`, `tokenComensal`)
  field-for-field — not a named OpenAPI component schema, since the spec
  documents this response inline. `tokenComensal` is an opaque string,
  supplied internally to the page from route/session data; never rendered,
  never user-entered, never persisted to `localStorage`/`sessionStorage`.
- **Rating validation**: `schemas/ratingSchema.ts` mirrors
  `POST .../calificaciones`'s documented fields exactly (`puntuacion`:
  integer 1–5; `comentario`: optional, max 255 chars) via React Hook
  Form + Zod, this project's existing form stack. `token_comensal` is
  deliberately not a schema field — it isn't user input. A blank comment
  normalizes to `undefined`, never an empty string. The score control is a
  native `<input type="radio">` group (real radiogroup semantics for free),
  driven through RHF's `Controller` rather than plain `register()` — radio
  inputs have no native `.valueAsNumber` DOM property, so `Controller`
  avoids that whole class of silent-`NaN` bugs.
- **Development fixtures**: `fixtures/publicDinerFixtures.ts` — one
  fictional table (`PUBLIC_DINER_TABLE_FIXTURE`), an opaque UUID-shaped
  token, never rendered. `/publico/mesas/:codigoQr` always shows this
  fixture, clearly labeled as development data; no development-state
  selector exists.
- **Demo interaction states are honest, not simulated backend calls.**
  Pressing "Llamar al mesero" or submitting a rating updates local React
  state only (no request, no fake delay) and shows an explicit
  "Demostración: ... aún no se envió al personal" disclosure — never the
  real components' default "Avisamos a tu mesero." copy, which is reserved
  for actual integration. Refreshing the page resets all demo state.
- **Still pending** (explicitly out of scope for this foundation): SGEB API
  integration; which endpoint (`GET /publico/mesas/{codigo_qr}` vs.
  `POST .../token`) owns _initial_ `token_comensal` issuance, and whether/how
  the browser persists it, is a genuine, unresolved integration decision this
  branch does not make; no diner wireframes exist anywhere in the provided
  documentation (confirmed in `docs/FrontendArchitecture.md` §2.2), so this
  foundation is built directly from the OpenAPI contract, conservatively, per
  existing branding/design-system conventions.

## OIDC client foundation

A narrow, contract-backed **OIDC client** foundation lives under
`src/features/oidc-client/` (`client/`, `components/`, `config/`, `pages/`,
`protocol/`, `session/`, `storage/`, `types/`, `utils/`). See ADR-002
(`docs/decisions.md`) for the full architectural decision this implements.

- **sgeb-frontend is an OIDC public client, not an identity provider.**
  `openapi-sso.yaml` v2.2.0 (`docs/sso/`) reclassified the SSO module as an
  independent Authorization Code + PKCE provider — S1–S7 (login, 2FA,
  recovery) are now provider-hosted screens, not something this repository
  implements. This foundation only initiates the protocol and consumes its
  responses; it never renders a credentials form. `/interno/*` (the
  provider's own internal endpoints) is never called from here.
- **client_id**: `sgeb-web-panel`, a public client — no client secret exists
  or is ever added; PKCE is what authenticates the client, per the OpenAPI
  document's own "Clientes públicos, sin secreto" note.
- **Route**: `/auth/callback` — outside `AppShell` and outside `AuthLayout`
  (that layout is the frozen S1/S3/S5/S6 provider-screen shell; reusing it
  here would misleadingly imply this page belongs to that same frozen
  family). No `/callback` alias is registered.
- **Flow**: Authorization Code + PKCE (S256) only — no implicit flow, no
  password grant, no iframe or popup strategy for `prompt=none`.
  `beginAuthorization()` generates `state`/`nonce`/PKCE, persists the
  transient transaction, and does a full-page redirect to `GET /authorize`.
  `/auth/callback` validates the returned `state` against the stored
  transaction before ever calling `POST /token` — a missing code, missing
  state, missing transaction, or mismatched state all render a safe generic
  error and never reach the token endpoint.
- **Token storage**: the access token (and `id_token`, when returned) live
  **only in memory**, in a small Zustand store (`session/sessionStore.ts`) —
  never localStorage, never sessionStorage. A page reload always starts back
  at `idle`; there is no persisted identity cache. The refresh token is
  never seen by this code at all: the provider delivers it as an **HttpOnly
  cookie** it owns, and `POST /token`'s `grant_type=refresh_token` request
  never includes a `refresh_token` field — the cookie does that implicitly
  via `credentials: include`. `document.cookie` is never read.
- **Transaction storage**: `state`, `nonce`, `code_verifier`, `redirect_uri`,
  and a validated `returnTo` live in **sessionStorage** (one namespaced key)
  only for the duration of the redirect round-trip, consumed exactly once.
  An unsafe (external/absolute) `returnTo` is rejected and falls back to
  `/panel`.
- **No SGEB/SSO envelope on protocol endpoints.** `/authorize`, `/token`,
  `/userinfo`, and `/logout` respond in the exact OAuth/OIDC spec shape
  (`access_token`, `error`, `error_description`, ...), per
  `openapi-sso.yaml`'s own documented exception — this client never applies
  `unwrapEnvelope`/`{ result, data }` parsing to them.
- **Refresh coordination**: same-tab concurrent refresh calls share one
  in-flight `POST /token` request (`client/tokenClient.ts`); the lock always
  clears after settling, success or failure. **Cross-tab coordination is a
  documented gap, not implemented here** — the provider rotates the refresh
  cookie on every use, so two tabs refreshing concurrently can trigger
  SSO-1007 (reuse detected, full chain revoked). No `BroadcastChannel` or
  localStorage-based lock exists; this is required before production.
- **`id_token` is treated as opaque in this branch.** It may be kept in
  memory for a future provider-logout `id_token_hint`, but this branch never
  decodes it and presents its claims as trusted identity — identity comes
  from `GET /userinfo` instead. Full cryptographic validation (signature via
  JWKS, issuer, audience, expiration, `nonce`) needs an approved JWT/OIDC
  validation library, which does not exist in this repository yet — adding
  one is out of scope here per CLAUDE.md's "no unapproved dependencies"
  rule. This is a genuine, recorded gap, not a claimed implementation.
- **`POST /token/revoke` is not implemented.** It requires a `token` field,
  and the web client's refresh token lives exclusively in an HttpOnly
  cookie this code cannot read — sending the access token in its place would
  misrepresent what's being revoked. `GET /logout` (full-page navigation,
  provider session + full token-chain revocation) is implemented instead;
  "sign out of only this application" is reserved for a later branch once
  the web revoke contract is clarified.
- **No live provider integration is claimed.** The provider may not be
  reachable during this branch's development; every network-facing piece
  (`exchangeAuthorizationCode`, `refreshAccessToken`, `fetchUserInfo`) takes
  an injectable transport and is exercised only against fakes in tests —
  never a real request.
- **No route guards yet.** Landing on `/panel`, `/eventos`, `/meseros`, or
  `/reportes` without a session behaves exactly as before this branch —
  nothing here redirects an existing visit to `/login` or checks
  authentication state. Wiring guards is future work once this foundation
  is exercised against a live provider.

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
