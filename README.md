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
eventDetailFixtures.ts` — originally exactly two records (per this
  branch's narrow-fixture instruction), later joined by a third when the
  Event Closure foundation needed a real `estado: 'finalizado'` event to
  pair with its "ready" readiness fixture (see "Event Closure UI
  foundation" below): `idEvento 1001` (social, publicado, WITH a comanda
  URL) aligned with the events list's matching entry; `idEvento 2001`
  (empresarial, en_curso, WITHOUT a comanda URL) reachable directly but
  not linked from the list — none of the list's five existing events
  combine `tipo: empresarial` with `estado` in `{borrador, en_curso}`;
  `idEvento 3001` (social, finalizado, WITHOUT a comanda URL), used only
  by Event Closure. The list's other four events intentionally have no
  matching detail fixture; visiting their `/eventos/:id` correctly
  renders the unavailable state, a valid outcome for this fixture-backed
  foundation.
- **Events list discoverability**: each row in `/eventos` now has a
  restrained "Ver detalle" link (`EventListItem`) to `/eventos/{idEvento}`,
  as a sibling of — never nested inside — the existing whole-row select
  button (avoids the invalid-HTML/accessibility problem of an `<a>` inside
  a `<button>`). The existing select button's behavior, tests, and filters
  are all unchanged.
- **Still pending** (explicitly out of scope for this foundation): SGEB API
  integration, live `DashboardEvento` data, Socket.IO, dispensing UI, event
  editing or status transitions, and the comanda upload contract.
  "Selección de equipo", event attendance, event montage, and event closure
  are no longer pending — see below.

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
  `EventDetailRoadmapSection` is a real `Link` to `/eventos/{id}/equipo`.
  "Pase de lista", "Montaje / asignación de mesas", and "Cierre" are now
  real links too — see "Event Attendance UI foundation (W-06)", "Event
  Montage UI foundation (W-07)", and "Event Closure UI foundation" below.
  The remaining two entries (Bebidas y Cubaitor — W-08, deferred — and
  Pagos) stay exactly as they were — non-interactive, `aria-disabled`,
  labeled "Próximamente", no `href="#"`. The roadmap keeps its canonical
  visual order (Equipo → Pase de lista → Montaje → Bebidas y Cubaitor →
  Cierre → Pagos) even though Cierre is active and Bebidas y Cubaitor,
  which appears earlier, is still pending — see the Event Closure
  section's own note on why the underlying data structure had to change
  to support that.
- **Still pending** (explicitly out of scope for this foundation): SGEB
  API integration, dispensing, Socket.IO, and any route guard or OIDC
  integration (the OIDC client foundation remains untouched). Event
  attendance (W-06), event montage (W-07), and event closure are no
  longer pending — see below.

## Event Attendance UI foundation (W-06)

A **UI-only, fixture-backed, read-only** foundation for W-06 "Pase de
lista" lives at `src/features/events/attendance/` — a subdirectory of the
existing Events feature, mirroring `team-selection/`'s structure
(`components/`, `pages/EventAttendancePage.tsx`, `fixtures/`, `types/`,
`utils/`).

- **This is the captain's web view of attendance — strictly
  observational.** The mesero's arrival confirmation
  (`POST /participaciones/{id_participacion}/confirmacion-llegada`)
  requires mobile/device-originated values this web panel structurally
  cannot produce: `metodo` (the phone invoking Face ID/Touch ID),
  `biometrico_verificado` (the device's own self-reported result),
  `uuid_dispositivo` (the mesero's registered device, kept in Keychain),
  and `latitud`/`longitud` (device GPS). This branch contains **no**
  `navigator.geolocation`, **no** `navigator.credentials`/WebAuthn, **no**
  device-identifier input, and **no** call to this endpoint anywhere —
  verified by dedicated tests, not just by convention.
- **Route**: `/eventos/:id/pase-de-lista` (inside `AppShell`). Reuses
  `parseEventId` directly; a malformed or unknown parent event id renders
  `EventDetailUnavailableState` (reused, not duplicated).
- **Participation state and arrival-attempt result are modeled as two
  separate fields, never conflated.** `estadoParticipacion` (`seleccionado
| confirmo_asistencia | confirmo_llegada`) is the real SGEB lifecycle
  subset; `ultimaConfirmacionLlegada` is a possibly-failed attempt that
  never advances participation state on its own — a participant can be
  `confirmo_asistencia` with a `fallido` arrival attempt at the same time.
  No fake participation state (`llegada_fallida`, `biometria_fallida`,
  `gps_fallido`, `pendiente_revision`, ...) is ever added to the real
  enum.
- **Failure/inconclusive motives are not flattened to one bucket.**
  `fuera_geocerca` (SGEB-4003) and `biometria_fallida` (SGEB-4004) are
  presented as real failures needing review;
  `dispositivo_de_otro_usuario` (SGEB-4025) — the documented collusion
  signal, "se alerta al capitán" — gets the most severe presentation
  (`tone="danger"`) of the five; `dispositivo_no_vinculado` (SGEB-4024) is
  presented as a real-but-legitimate scenario (phone replacement);
  `precision_insuficiente` (SGEB-4026) is presented as **inconclusive**,
  explicitly never labeled "ausente"/"falta" and never flagged for
  review — the error dictionary itself states this motive "no se
  registra como asistencia denegada".
- **No manual captain action exists — this is a genuine, recorded
  contract gap, not a guess.** The error dictionary's prose mentions that
  a `metodo=ninguno`/failed-biometric case "deja la confirmación en manos
  del capitán", but no endpoint or request shape for a captain's manual
  confirmation is documented anywhere in `openapi-sgeb.yaml`. This branch
  does not invent "Confirmar manualmente", "Aprobar llegada", "Marcar
  presente", or any similar action — a failed/inconclusive attempt
  renders "Requiere revisión" (or, for the inconclusive case, no review
  call-out at all) as presentation only.
- **`uuid_dispositivo` and `id_confirmacion` are never displayed** —
  neither has a captain-facing presentation purpose.
- **Development fixtures**: `attendance/fixtures/attendanceFixtures.ts`
  builds on Team Selection's real `seleccionado` roster for event 1001
  (one participant, reused by id) plus six new fictional participants
  (IDs `6001`+, a clearly different range) needed to demonstrate the
  seven required cases (pending, asistencia confirmed with arrival still
  pending, successful arrival, and all five failure/inconclusive
  motives). Team Selection's own fixtures and tests are unmodified and do
  not depend on this feature. Event 2001 correctly has an empty roster
  (Team Selection has zero selected participants there), demonstrating
  the "no selected participants" state without any fixture of its own.
- **Summary counts are computed only from the local fixture list** —
  never `GET /eventos/{id}/dashboard` (`DashboardEvento.staffing`, a
  separate, explicitly out-of-scope live aggregate), no polling, no
  Socket.IO (`participacion:cambio` real-time updates are a later,
  explicitly deferred scope).
- **Still pending** (explicitly out of scope for this foundation): SGEB
  API integration for this screen's own endpoints
  (`GET /eventos/{id}/participaciones`, `GET /participaciones/{id}`), live
  `DashboardEvento`/Socket.IO integration, the exact relation/source for
  detailed arrival-attempt data during future live integration (a genuine
  open backend question, not resolved here), and the manual
  captain-confirmation contract gap noted above.

## Event Montage UI foundation (W-07)

A **UI-only, fixture-backed** foundation for W-07 "Verificar montaje +
asignar mesas" lives at `src/features/events/montage/` — a subdirectory of
the existing Events feature, mirroring `team-selection/`/`attendance/`'s
structure (`components/`, `pages/EventMontagePage.tsx`, `fixtures/`,
`types/`, `utils/`).

- **Route**: `/eventos/:id/montaje` (inside `AppShell`). Reuses
  `parseEventId` directly; a malformed or unknown parent event id renders
  `EventDetailUnavailableState` (reused, not duplicated).
- **Read/mutation contract, by actor (future live integration — nothing
  below is called in this branch, fixtures only):**
  - **Captain reads** (this screen): `GET
/participaciones/{id_participacion}/checklist-instancias` (documented
    to feed both the mesero's own montage screen and this captain
    approval view) and `GET /eventos/{id_evento}/mesas`.
  - **Captain mutations** (this screen's three local actions):
    `PATCH /checklist-instancias/{id}/aprobar`,
    `POST /participaciones/{id}/asignaciones`,
    `DELETE /asignaciones/{id_asignacion}`.
  - **Mesero mutation, never called from here**:
    `PUT /checklist-instancias/{id}/respuestas` — this is only where the
    OpenAPI document happens to name the `{id_item, cantidad, hecho}`
    shape; it is not this screen's read source, and no code or comment in
    this feature implies the captain reads checklist state through it.
- **Checklist state and table assignment are two separate concerns, never
  collapsed into one fake state machine.** `docs/api/openapi-sgeb.yaml`
  v1.6.0's `GET/POST /participaciones/{id_participacion}/checklist-instancias`
  proves montage checklists are scoped to **one participación each**, not
  one checklist for the whole event — correcting a naive "single event
  checklist" reading. `MontageParticipantViewModel.checklist` is therefore
  a per-participant field, and the SGEB-4005 approval gate is evaluated
  per mesero, not globally for the page. `checklist.status`
  (`pending | completed | approved`) is this feature's own synthesis of
  the documented `completado` boolean plus whether
  `PATCH /checklist-instancias/{id}/aprobar` has succeeded — not a
  literal documented field.
- **Only two real captain actions exist, and both map exactly to
  documented endpoints, nothing more:**
  - "Aprobar checklist" → `PATCH /checklist-instancias/{id}/aprobar`
    (RF-21, no request body). Only ever rendered enabled when
    `status === 'completed'`, mirroring SGEB-4005 ("Primero completa y
    aprueba el checklist de montaje") by construction — there is no
    captain-override path for an incomplete checklist, and no "reopen an
    approved checklist" action, since neither is documented anywhere.
  - "Asignar mesa" → `POST /participaciones/{id}/asignaciones` with
    **exactly** `{id_mesa}` — nothing invented beyond that one field.
    Only available once that participant's own checklist is approved,
    and only lists tables currently `libre` (mirrors SGEB-4006, "esa mesa
    ya está asignada a otro mesero").
  - "Liberar mesa" → `DELETE /asignaciones/{id_asignacion}`, verified as a
    real, documented, captain-owned release endpoint (not assumed) — the
    only reason a "liberar"/unassign action exists in this branch at all.
    There is no single "change/move table" action, since no documented
    endpoint performs that in one step — moving a mesero is only ever
    release-then-assign, matching the two separate real endpoints.
- **The montage-approval prerequisite is never faked.** When a
  participant's checklist isn't `approved`, the assignment area shows only
  explanatory text ("Requiere aprobar el checklist de montaje de este
  mesero antes de asignar una mesa.") — no enabled `<select>`, no enabled
  button, and the local handlers re-check the same prerequisite
  defensively even though the UI already prevents reaching them.
- **Mesa status uses exactly the two documented values, `libre | ocupada`**
  (`GET /eventos/{id_evento}/mesas`) — no `reservada`/`limpieza`/`VIP`/
  `bloqueada` or any other invented state. `codigo_qr`/`token_comensal` are
  never modeled or displayed anywhere in this feature, and no QR
  regeneration action exists (that belongs to a different, unrelated
  mesa-management concern).
- **No invented puesto-based eligibility rule.** `POST
/participaciones/{id}/asignaciones`'s summary text reads "Asignar mesa a
  un mesero", which is suggestive but not a documented validation or
  rejection code — this foundation does not block `puesto: barra`
  participants from the assignment UI. One of the fixture-seeded
  "approved" demo participants is deliberately `barra`, so this is
  verified by a test, not left as an unstated assumption. Recorded as an
  open contract question, not resolved by guessing.
- **Development fixtures**: `montage/fixtures/montageFixtures.ts` reuses
  three real participants from Attendance's roster (`5003`, `6001`,
  `6002` — the same people visible on the Pase de lista screen) by
  id/nombre/puesto, layering montage-specific checklist/assignment state
  on top; two new fictional participants (`7001`/`7002`, a clearly
  different id range) are added because the existing roster cannot
  demonstrate an approved-and-unassigned state and an
  approved-and-already-assigned state at the same time. Event 2001
  correctly has an empty roster (Attendance has zero selected participants
  there), demonstrating the "no participants" state without any fixture
  of its own.
- **Summary counts are computed only from the local fixture list** — never
  `GET /eventos/{id}/dashboard` (`DashboardEvento`, a separate, explicitly
  out-of-scope live aggregate), no polling, no Socket.IO.
- **Event Detail's roadmap now links here too.** "Montaje / asignación de
  mesas" in `EventDetailRoadmapSection` is a real `Link` to
  `/eventos/{id}/montaje`, alongside "Selección de equipo" and "Pase de
  lista". At the time this foundation shipped, the remaining three entries
  (Bebidas y Cubaitor, Cierre, Pagos) stayed non-interactive,
  `aria-disabled`, labeled "Próximamente", no `href="#"` — "Cierre" is now
  a real link too, see "Event Closure UI foundation" below. This is
  navigation discoverability only — there is no wizard engine, stepper
  state, or "complete this step to unlock the next page" logic anywhere;
  Team Selection → Attendance → Montage → Cierre is an operational
  lifecycle, not an irreversible backend wizard.
- **Still pending** (explicitly out of scope for this foundation): SGEB
  API integration for this screen's own endpoints, live
  `DashboardEvento`/Socket.IO integration, and whether a single mesa can
  ever legitimately hold more than one simultaneous assignment or a
  participation more than one table at once — the current contract
  doesn't state a cardinality limit either way, so this foundation
  neither hardcodes "exactly one table forever" nor invents a multi-table
  UI beyond what the presentation model's array shape already allows.
- **Approval read-side contract gap (recorded, not resolved):** the
  current contract documents the approval OPERATION
  (`PATCH /checklist-instancias/{id}/aprobar`) and the approval
  PREREQUISITE (SGEB-4005 blocks table assignment when not approved), but
  does not document the read-side field/schema through which the frontend
  would learn — from `GET /participaciones/{id}/checklist-instancias` —
  that a checklist instance has already been approved. No `aprobado`
  boolean, `fecha_aprobacion` timestamp, or `estado`/`status` enum value
  is named anywhere in `docs/api/openapi-sgeb.yaml` v1.6 (confirmed by a
  direct text search); the data dictionary PDF could not be inspected in
  this environment (no `poppler-utils`). `MontageChecklistViewModel.status`
  (`pending | completed | approved`) is therefore a fixture-backed
  PRESENTATION state only, not a claimed API response field — see
  `types/montage.ts` for the full note.

## Event Closure UI foundation

**Update (`feature/closure-live-integration`):** this screen is now LIVE.
`EventClosurePage` reads closure-readiness (`GET /eventos/{id}/cierre`)
and existing merma reports (`GET /eventos/{id}/reportes-merma`) through
`queries/useEventClosureReadinessQuery`/`useMermaReportsQuery`, and
registers new reports through `queries/useCreateMermaReportMutation` →
`POST /eventos/{id}/reportes-merma` — following the same
`services/*Api.ts` + `queries/*QueryKeys.ts` + `use*Query`/`use*Mutation`
convention Team Selection/Attendance/Montage already established
(`services/closureApi.ts`, `queries/closureQueryKeys.ts`). The "Datos de
desarrollo" banner is removed; there is no remaining fixture-backed
sub-section on this screen (unlike Montage's table-assignment gap).
`closureFixtures.ts` stays in the tree — still used by this feature's own
tests and by `EventPaymentsPage` (which reads `findEventClosureReadiness`
directly and is unaffected by this branch; Payments gets its own
live-integration branch later).

**Confirmed contract mismatch, corrected in code:** the real backend's
merma-registration validator (`app/modules/cierre/validators/cierre_validator.ts`)
requires camelCase `costoEstimado` in the `POST` request body, not the
`costo_estimado` `openapi-sgeb.yaml` documents — confirmed against the
backend's own unit tests (`tests/unit/cierre.spec.ts`), not guessed. The
form/schema keep the documented `costo_estimado` field name (no user- or
test-visible change); `useCreateMermaReportMutation` translates it to the
real wire key immediately before the request is sent. See
`services/closureApi.ts`'s `CreateMermaDetalleRequest` comment.

**Identifier correction:** `MermaReportViewModel.idReporteDemo` (a
presentation-only demo string) is now `idReporte: number` — the real
backend `id_reporte`, confirmed via direct inspection of
`app/modules/cierre/models/reporte_merma.ts`. `fecha`/`descripcion`/
`costoEstimado` are equally now known-always-present fields rather than
inferred-optional ones (see `types/closure.ts`).

**Event finalization and participant `salida` remain untouched and
distinct, exactly as before.** Direct backend inspection (not inference
from route names) confirms: there is no dedicated "finalize event"
endpoint — finalization is the generic `PATCH /eventos/{id}/estado`
transition, capitán/admin-only, reachable only from `en_curso`, terminal.
Participation `salida` is set via the equally generic `PATCH
/participaciones/{id}/estado`, also capitán/admin-only (not a mesero
self-action), and is fully independent — neither state machine triggers
the other. This screen still only ever _displays_
`readiness.eventoFinalizado`/`participacionesSinSalida` (both server-derived
counts) and never adds a finalize button or a "mark salida" action, per
this section's original "Event-finalization is not this screen's
mutation to own" note below, which remains accurate.

The rest of this section (below) describes the original foundation this
branch built on top of; treat every "fixture"/"local"/"no network call"
statement below as historical, superseded by the live wiring above.

A foundation for "Cierre del evento" — closure-readiness diagnostics and
merma (waste) reporting — lives at `src/features/events/closure/` — a
subdirectory of the existing Events feature, mirroring `montage/`'s
structure (`components/`, `pages/EventClosurePage.tsx`, `fixtures/`,
`queries/`, `schemas/`, `services/`, `types/`, `utils/`).

- **Route**: `/eventos/:id/cierre` (inside `AppShell`). Reuses
  `parseEventId` directly; a malformed or unknown parent event id, or a
  known event with no closure diagnostic fixture, all render
  `EventDetailUnavailableState` (reused, not duplicated).
- **Closure vs. Payments — a hard boundary.** This branch is EVENT
  CLOSURE only: closure-readiness diagnostics (`GET /eventos/{id}/cierre`)
  and merma reporting (`GET`/`POST /eventos/{id}/reportes-merma`). It does
  **not** implement `POST /eventos/{id}/pagos/calcular`, `GET
/eventos/{id}/pagos` as a payments screen, `PATCH /pagos/{id}/pagado`,
  `PATCH /pagos/{id}/fallido`, payment reference capture, CLABE display,
  payment status tables, transfer actions, or banking actions. When the
  readiness fixture says `listo: true`, the screen may say "Listo para
  calcular pagos" as plain status copy, but there is no "Calcular pagos"
  button anywhere on THIS screen — verified by dedicated tests, not just
  by convention. **Update:** those payment concerns are now implemented
  in `feature/event-payments-ui-foundation` — see "Event Payments UI
  foundation" below; `/eventos/:id/pagos` is registered there, and this
  Closure screen links to it with a small "Ir a pagos" shortcut, rendered
  only when `listo: true`.
- **Stale pre-v1.6 payment contract, corrected.** `openapi-sgeb.yaml`'s own
  changelog (v1.5, "cierre pago por pago") confirms `POST
/eventos/{id}/pagos/aprobar` was retired and replaced by three
  operations — `POST /eventos/{id}/pagos/calcular`, `PATCH
/pagos/{id}/pagado`, `PATCH /pagos/{id}/fallido` — specifically because
  bulk approval had nowhere to store each transfer's own banking
  reference. `docs/FrontendArchitecture.md` still had two references to
  the retired bulk-approval endpoint (§2.1, the wireframe→endpoint table);
  both were corrected on disk to the current payment-by-payment model.
  This branch does not call any of these endpoints either way — the
  correction is documentation-only.
- **Closure-readiness diagnostic** (`EventClosureReadinessViewModel`,
  `types/closure.ts`) mirrors `GET /eventos/{id_evento}/cierre`'s
  documented response field-for-field — a rare case in this codebase where
  a full response schema actually exists, unlike most endpoints here that
  only echo the generic `Exito`/`ExitoLista` envelope: `eventoFinalizado`,
  `participacionesTotal`, `participacionesSinSalida`,
  `meserosSinClabeVigente`, `listo`. `listo` is rendered exactly as
  received and never recomputed client-side from the other four fields —
  it is documented as server-derived ("true cuando los tres bloqueos están
  resueltos"). `participacionesSinSalida`/`meserosSinClabeVigente` are
  counts only — the endpoint documents no participant/mesero identity
  alongside them, so no fictional per-person rows are ever rendered from
  these numbers, and no CLABE/bank details are ever shown (the diagnostic
  gives a count, not an account).
- **Blocker wording is restrained and precise.** `eventoFinalizado ===
false` reads "Evento pendiente de finalizar" — never "Error" or "Pago
  fallido", since no payment attempt has actually occurred on this screen.
  No raw SGEB code or `technical_message` is ever shown.
- **Event-finalization is not this screen's mutation to own.** `PATCH
/eventos/{id_evento}/estado` (the generic event lifecycle transition,
  `... → finalizado | cancelado`) is not documented or wireframed as
  belonging to the closure screen specifically — this foundation only
  _displays_ `eventoFinalizado`, never adds a "Finalizar evento" button,
  and never fakes finalization locally to unlock readiness.
- **"Verificar limpieza" remains an explicit, unresolved contract gap.**
  `docs/FrontendArchitecture.md` §9/§18 already recorded, before this
  branch touched anything, that no captain-facing endpoint or
  checklist-type wiring backs the wireframe's "Verificar limpieza"
  concept — `SGEB-4015`'s technical diagnostic string mentions "checklist
  cierre incompleto" only inside its own free-text context, never as a
  schema or operation. `EventClosureCleanupSection` is therefore purely
  informational text, with no interactive control, no per-person/per-area
  rows, no "Marcar limpio"/"Aprobar limpieza" action, and no reuse of the
  montage checklist's approval flow (a different entity entirely). The one
  real, documented signal this screen has for outstanding exits is
  `participacionesSinSalida`, already shown in the readiness section. The
  engineering reasoning above — the contract gap, `SGEB-4015`, the
  `docs/FrontendArchitecture.md` cross-reference — lives only in code
  comments and this README; the rendered end-user copy says none of it,
  only a plain pointer to the readiness section's verified-exits count,
  since "contrato"/"endpoint"/"pendiente de definición"-style language has
  no place in product-facing UI.
- **Merma request contract mirrors `POST
/eventos/{id_evento}/reportes-merma`'s body exactly, in snake_case** —
  `schemas/wasteReportSchema.ts` uses the documented wire field names
  (`observaciones`, `detalles[].tipo`/`descripcion`/`cantidad`/
  `costo_estimado`) directly, the same established convention
  `eventCreateSchema.ts` already uses for a request-shaped form (not the
  camelCase used everywhere else for read-side view models). Exactly the
  five documented categories (`vaso_roto`, `plato_roto`, `copa_rota`,
  `comida_desperdiciada`, `otro`) are supported, nothing invented.
  `cantidad` (integer 1–65535), `descripcion` (≤150, nullable), `costo_
estimado` (0–999999.99, nullable), and `observaciones` (≤255, nullable)
  all mirror the documented constraints exactly.
- **A real React Hook Form bug was found and fixed while building the
  form, not just tested around.** React Hook Form syncs a registered
  `<input>` against `defaultValues` on mount by passing the raw default
  straight through `setValueAs` — not a DOM string, unlike every
  subsequent `onChange` call. Since `costo_estimado`'s default is `null`
  (matching the documented `nullable: true`), a naive `setValueAs: (v) =>
v === '' ? null : Number(v)` let `Number(null)` (which is `0`, not
  `NaN`) leak through, so every untouched row silently submitted
  `costo_estimado: 0` instead of `null`. Confirmed by isolated
  reproduction against a minimal RHF form before writing the fix
  (`parseOptionalCosto` in `EventClosureWasteForm.tsx`), not guessed —
  and now covered by a dedicated test (`'does not require descripcion or
costo estimado'`).
- **Merma read-side stays explicitly presentation-only.** `GET
/eventos/{id}/reportes-merma` responds with the generic `ExitoLista`
  envelope — no named response schema exists for the list, so
  `MermaReportViewModel` (`types/closure.ts`) is inferred from the POST
  body's field names, not a confirmed response DTO; its `fecha` field and
  `idReporteDemo` React key are both flagged in comments as
  presentation-only, never claimed as documented response fields or a
  real backend `id_reporte`. Locally-submitted reports mint
  `idReporteDemo` from a counter starting well above any fixture-seeded
  value, for the same reason.
- **The merma form is local, callback-driven, and allowed because the
  POST contract is fully documented** — `useFieldArray`-backed dynamic
  detail rows (the first in this codebase), each with a "Quitar" action
  that is local form editing only (never described as deleting a recorded
  report) and is never offered on the last remaining row (mirrors the
  documented `minItems: 1`). No network call; `onSubmit` is a typed local
  callback the page wires to in-memory state, appending a new report to
  the existing-reports list and showing a restrained
  "Reporte registrado localmente." success message before resetting the
  form to one empty row.
- **Roadmap visual order is preserved across an active item sandwiched
  between two pending ones.** Because W-08 (Bebidas y Cubaitor) is
  intentionally deferred while Cierre (positioned after it) goes active,
  `EventDetailRoadmapSection`'s previous two-array shape
  (`ACTIVE_ROADMAP_ITEMS` rendered as one block, `PENDING_ROADMAP_ITEMS`
  rendered after it) would have silently reordered the list — every active
  item before every pending one, moving Cierre ahead of Bebidas y
  Cubaitor. It was refactored to a single ordered `ROADMAP_ITEMS` array
  (`{ label, slug: string | null }`), where `slug: null` renders the
  existing non-interactive "Próximamente" treatment and a real `slug`
  renders a `Link` — same accessibility behavior as before, but position
  in the array is now the only thing that decides visual order, verified
  by a dedicated order-assertion test (`EventDetailContent.test.tsx`).
- **Development fixtures**: `closure/fixtures/closureFixtures.ts` reuses
  existing Event Detail identity (events 1001, 2001, and 3001) rather
  than duplicating event title/type/status inside this feature. Event
  1001 is the "blocked" fixture (`estado: 'publicado'`, not finalized,
  real pending exits and banking blockers, `listo: false`, with one
  existing merma report); event 2001 is an "in progress" fixture
  (`estado: 'en_curso'`, not finalized but no other blockers, `listo:
false`, zero existing merma reports); event 3001 is the "ready" fixture
  (`estado: 'finalizado'`, zero blockers, `listo: true`, zero existing
  merma reports). `assertReadinessConsistency` is a small,
  presentation-only dev check (throws if a fixture's `listo` doesn't
  match the other three documented blockers) that only guards fixture
  authoring — it is never used to recompute `listo` for real presentation
  logic, which stays server-derived by design.
- **Fixture correction: `eventoFinalizado` must never contradict the
  shared event's own `estado`.** The first version of this foundation's
  "ready" fixture (`listo: true`) was attached to event 2001, whose
  shared `EventDetailViewModel.estado` is `en_curso` — a real, navigable
  contradiction: `/eventos/2001` shows "En curso" while
  `/eventos/2001/cierre`, reached from that same event's own roadmap
  link, claimed the event was already finalized.
  `eventoFinalizado: true` is documented as meaning the event satisfies
  the `finalizado` prerequisite for payment calculation, so this was a
  real coherence bug, not a cosmetic one. Fixed by adding `idEvento: 3001`
  (`estado: 'finalizado'`) to `eventDetailFixtures.ts` specifically for
  this scenario — 1001 and 2001's existing records, and every other
  feature's fixtures/tests that depend on them (Team Selection,
  Attendance, Montage), are unchanged. `closureFixtures.test.ts` now
  cross-checks, for every fixture event id, that `eventoFinalizado: true`
  only ever pairs with a shared `estado: 'finalizado'`, and that
  `listo: true` only ever appears alongside `eventoFinalizado: true` and
  zero other blockers.
- **Still pending** (explicitly out of scope for this foundation): SGEB
  API integration for this screen's own endpoints, live
  `DashboardEvento`/Socket.IO integration, and W-08 Bebidas y Cubaitor
  (deferred — catalog-scope/product semantics remain unresolved; its
  roadmap entry stays present and pending, not removed).

## Event Payments UI foundation

A **UI-only, fixture-backed, local-callback-driven** foundation for
"Pagos" (Dispersión de pagos) lives at `src/features/events/payments/` —
a subdirectory of the existing Events feature, mirroring `closure/`'s
structure (`components/`, `pages/EventPaymentsPage.tsx`, `fixtures/`,
`schemas/`, `types/`, `utils/`).

- **Route**: `/eventos/:id/pagos` (inside `AppShell`). Reuses
  `parseEventId` directly; a malformed or unknown parent event id, or a
  known event with no closure diagnostic fixture, all render
  `EventDetailUnavailableState` (reused, not duplicated).
- **Current v1.6 payment model only — the retired bulk flow is never
  modeled.** `openapi-sgeb.yaml`'s own changelog (v1.5, "cierre pago por
  pago") confirms `POST /eventos/{id}/pagos/aprobar` was retired and
  replaced by three per-payment operations, specifically because bulk
  approval had nowhere to store each transfer's own banking reference.
  This feature implements exactly those three: `POST
/eventos/{id}/pagos/calcular` (calculation), `PATCH
/pagos/{id}/pagado` (record a completed manual transfer), `PATCH
/pagos/{id}/fallido` (record a rejected one). No "Aprobar todos",
  "Dispersar todos", or bulk mutation of any kind exists anywhere —
  verified by dedicated tests.
- **The bank transfer itself always happens manually, outside SGEB.**
  `PATCH /pagos/{id}/pagado`'s own documented description says so
  explicitly: "El pago se hace por transferencia manual, sin integración
  con banca ni pasarela." This screen only _records_ what already
  happened — it never says or implies "Transferir", "Enviar dinero",
  "Conectar banco", "Procesar con banco", or shows any fake transfer
  progress. Action labels are deliberately "Registrar transferencia
  realizada"/"Registrar transferencia rechazada", never "Pagar"/
  "Dispersar ahora".
- **Reuses Closure's readiness data directly — never a second,
  independently-maintained copy.** `findEventClosureReadiness` (and
  `EventClosureReadinessViewModel`) are imported straight from
  `features/events/closure/`, the same "reuse the fixture/type accessor
  across sibling sub-features, never cross-import UI components" pattern
  already established for Attendance→Montage. This feature builds its
  own `EventPaymentsBlockedSection` to re-frame the SAME three documented
  blockers with Payments-specific copy ("No se pueden calcular los pagos
  todavía." + the exact blocker list) rather than reusing Closure's own
  UI component, and rather than recomputing/reinventing the blocker
  logic itself.
- **`Pago.clabe_destino` is ALWAYS masked, and this frontend enforces
  that at the type level.** The documented field is "Siempre
  enmascarada... El valor completo nunca sale del servidor, ni en
  respuestas ni en logs." `EventPaymentViewModel.clabeDestinoEnmascarada`
  is named specifically so that safety property can't be missed at a
  call site; fixtures use the documented example shape (`'0121…8909'`),
  never a raw 18-digit sequence, and there is no editable CLABE input
  anywhere in this feature. CLABE-safety tests assert no 18-digit
  sequence ever appears in the rendered UI.
- **`nombre` is presentation enrichment, not a `Pago` API field.** `Pago`
  documents only `id_participacion` — no name, email, UUID, or
  `id_usuario`. No participation fixture exists for event 3001 (this
  feature's only "payments available" scenario), so `nombre` is
  hand-authored fixture data (`idParticipacion` 9001–9004, a clearly new
  range, continuing the "Mesero de demostración `<ordinal>`" naming
  already used across Team Selection/Attendance/Montage) — not joined
  from any other feature's fixture, and not invented Attendance/Montage
  participation history just to back a display name. How the real payee
  name would be sourced during live integration is a genuine open
  mapping question, recorded here rather than guessed.
- **No frontend payment-amount arithmetic, anywhere.** `monto` is always
  a value already provided by fixture/callback data — this feature never
  computes `attendance × tarifa` or any other formula. The one place
  numbers ARE derived locally is the summary's `total` (a presentation-
  only sum of already-provided `monto` values across non-cancelled rows,
  explicitly allowed) and the local recalculation fixture (see below,
  which only filters/carries forward existing rows, never computes a
  new amount).
- **Calculate/recalculate is a local callback, not a state-transition
  engine.** `calculatePaymentsResult` (`fixtures/paymentsFixtures.ts`)
  takes only `idEvento` — it never reads the current local payments list
  — and returns a PREBUILT fixture result representing what
  `/pagos/calcular` would respond with. `pagado`/`cancelado` rows are
  authored identically to their pre-calculation counterparts (not copied
  forward by a rule); the `fallido` example is authored already in its
  post-recalculation `pendiente` shape. No production code infers a
  payment's next state from its current state. A dedicated test asserts
  the function's arity is 1 (no payments-list parameter exists to read),
  and a page-level regression test proves the already-paid row survives
  a recalculation unchanged.
- **Failed-payment recovery stays page-level, never a direct shortcut.**
  A `fallido` row shows "Se recalculará en el próximo cálculo de pagos."
  and offers no direct "mark as paid" action — the documented recovery
  path is the next `/pagos/calcular` call, and nothing in the current
  contract confirms a direct `fallido → pagado` transition, so this
  foundation does not invent one.
- **`motivo` is submitted, never displayed as a persisted field.** `Pago`
  documents no read-side `motivo`/`motivo_fallo` — after a payment
  becomes `fallido`, its reason is not shown anywhere on reload, matching
  what a real `GET /pagos` response would actually be able to show.
- **`pagado` is genuinely terminal.** No undo, no revert, no reopen, no
  edit-reference action exists anywhere — matching the documented
  "revertirlo dejaría el registro contradiciendo al banco. Reintentar
  sobre un pago ya marcado devuelve SGEB-4011."
- **`cancelado` is display-only — a recorded contract gap, not a
  guess.** No documented endpoint produces, reverses, or reopens a
  cancelled payment; this foundation does not invent
  "Cancelar pago"/"Reactivar pago"/"Reabrir pago".
- **SGEB-5004's unusual real-API semantic is documented, not
  reproduced.** `PATCH /pagos/{id}/fallido` has NO documented success
  response code — only 400/403/404/409/500 — because a "successful"
  failure-recording call is itself an error response (SGEB-5004, "No
  pudimos registrar la transferencia. Se reintentará.") even though the
  record persists as `fallido` server-side. This foundation's local demo
  callback simply resolves to a local "failure recorded" presentation
  outcome — it doesn't need to reproduce that unusual HTTP-error-as-
  success-signal behavior locally, but the README/code comments record it
  so a future live-integration branch doesn't treat that endpoint like a
  normal success response.
- **A local, client-side filter only** (`Todos`/`Pendientes`/
  `Pagados`/`Fallidos`/`Cancelados`) mirrors `GET /eventos/{id}/pagos`'s
  optional `estado` query parameter conceptually, documented as a future
  live-query capability — no request is ever sent.
- **Optional Closure → Payments handoff.** `EventClosureContent` now
  renders a small "Ir a pagos" link to `/eventos/{id}/pagos`, ONLY when
  Closure's `readiness.listo` is true — pure discoverability, no
  wizard/stepper, no forced navigation. The Event Detail roadmap remains
  the primary way to reach this screen.
- **Development fixtures**: `payments/fixtures/paymentsFixtures.ts` keys
  off the same three events Closure already established. 1001/2001 stay
  `listo: false` there, so they get zero payment fixtures here too
  (calculation is unavailable — verified, never independently
  recomputed). 3001 (`listo: true`) is pre-seeded with one row of each
  documented `estado` (`pendiente`/`pagado`/`fallido`/`cancelado`) so the
  full mixed-state UI is visible on first load without requiring any
  interaction. No existing Closure fixture is mutated.
- **Event Detail's roadmap now links here too — canonical order
  unchanged.** "Pagos" in `EventDetailRoadmapSection` is now a real
  `Link` to `/eventos/{id}/pagos`, the sixth and final item in the
  already-established single-ordered-array roadmap structure (see the
  Event Closure section above for why that refactor was necessary). No
  reordering was needed since Pagos was already the last item; "Bebidas y
  Cubaitor" (W-08) stays exactly as pending as before.
- **Still pending** (explicitly out of scope for this foundation): SGEB
  API integration, OIDC/authenticated-request integration, live
  `DashboardEvento`/Socket.IO integration, real bank/gateway integration
  (never planned — the product is manual-transfer recording, not a
  payment processor), and W-08 Bebidas y Cubaitor (deferred).

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
  treated as sources for this general Reports screen — those belong to the
  separate, event-scoped "Event Closure UI foundation" (`GET /eventos/{id}/
cierre` and the merma endpoints) and "Event Payments UI foundation"
  (`GET /eventos/{id}/pagos`, `POST /eventos/{id}/pagos/calcular`,
  `PATCH /pagos/{id}/pagado`, `PATCH /pagos/{id}/fallido`), both now
  implemented — see their own README sections.
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
  exports (CSV/PDF), and charts. Event-specific closure/merma reporting is
  a separate screen, not an alternate source for this one — see "Event
  Closure UI foundation"; event-specific Pagos remains a future feature.

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
