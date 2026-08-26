import type {
  BebidaViewModel,
  CreateBebidaInput,
  CreateEnvaseInput,
  CreateInsumoInput,
  EnvaseViewModel,
  InsumoEstado,
  InsumoViewModel,
  RecetaIngredienteInput,
  RecetaIngredienteViewModel,
  UpdateBebidaInput,
  UpdateEnvaseInput,
  UpdateInsumoInput,
} from '@/features/menu/types/menu'
import { requestSgeb } from '@/shared/api/sgebClient'

/**
 * WIRE CASING — envase/receta request bodies are **snake_case**
 * (`volumen_ml`, `id_insumo`, `tipo_porcion`, `orden_servido`), matching
 * both `app/modules/menu/validators/menu_validator.ts`
 * (`envaseValidator`/`envaseParcialValidator`/`recetaValidator`) on the
 * pinned backend AND `docs/api/openapi-sgeb.yaml`'s documented shape. A
 * previous version of this comment claimed the opposite (camelCase,
 * "confirmed" against an older backend commit) — that backend commit
 * predated `3261d02` ("fix(cubaitor): align endpoints and validators with
 * OpenAPI spec"), which flipped these two validators to snake_case; the
 * stale claim produced real `SGEB-2001`/"field must be defined" failures on
 * every envase create/update and recipe define/update. Fixed at the API
 * boundary in each function below, verified directly against the validator
 * source at the currently pinned backend commit. Every `...Input` type
 * above stays camelCase (this app's own view-model convention) — only the
 * wire body transforms.
 */

interface RecetaIngredienteApiRecord {
  id_receta_ing: number
  id_bebida: number
  id_insumo: number
  tipo_porcion: RecetaIngredienteViewModel['tipoPorcion']
  valor: number
  orden_servido: number
}

interface InsumoApiRecord {
  id_insumo: number
  nombre: string
  tipo: InsumoViewModel['tipo']
  unidad: string
  costo: number
  estado: InsumoEstado
  activo: boolean
}

interface BebidaApiRecord {
  id_bebida: number
  nombre: string
  descripcion: string | null
  alcoholica: boolean
  activo: boolean
  receta?: RecetaIngredienteApiRecord[]
}

interface EnvaseApiRecord {
  id_envase: number
  nombre: string
  volumen_ml: number
  activo: boolean
}

function mapInsumo(record: InsumoApiRecord): InsumoViewModel {
  return {
    idInsumo: record.id_insumo,
    nombre: record.nombre,
    tipo: record.tipo,
    unidad: record.unidad,
    costo: record.costo,
    estado: record.estado,
    activo: record.activo,
  }
}

function mapRecetaIngrediente(
  record: RecetaIngredienteApiRecord,
): RecetaIngredienteViewModel {
  return {
    idRecetaIng: record.id_receta_ing,
    idBebida: record.id_bebida,
    idInsumo: record.id_insumo,
    tipoPorcion: record.tipo_porcion,
    valor: record.valor,
    ordenServido: record.orden_servido,
  }
}

function mapBebida(record: BebidaApiRecord): BebidaViewModel {
  return {
    idBebida: record.id_bebida,
    nombre: record.nombre,
    descripcion: record.descripcion,
    alcoholica: record.alcoholica,
    activo: record.activo,
    receta: (record.receta ?? []).map(mapRecetaIngrediente),
  }
}

function mapEnvase(record: EnvaseApiRecord): EnvaseViewModel {
  return {
    idEnvase: record.id_envase,
    nombre: record.nombre,
    volumenMl: record.volumen_ml,
    activo: record.activo,
  }
}

// ─────────────────────────────────────────────────────────────── insumos

/** `GET /insumos`. `activo: undefined` sends no filter — the backend then defaults to catalog-wide (both active and inactive; there is no server-side default narrowing here, unlike `bebidas`). `tipo` has no server-side filter on the pinned backend despite OpenAPI documenting one — narrow client-side if ever needed, never send it as a query param. */
export async function fetchInsumos(
  params: { activo?: boolean; estado?: InsumoEstado } = {},
  signal?: AbortSignal,
): Promise<InsumoViewModel[]> {
  const envelope = await requestSgeb<InsumoApiRecord[]>({
    url: '/insumos',
    params: {
      ...(params.activo === undefined ? {} : { activo: params.activo }),
      ...(params.estado ? { estado: params.estado } : {}),
    },
    ...(signal ? { signal } : {}),
  })
  return (envelope.data ?? []).map(mapInsumo)
}

export async function createInsumo(input: CreateInsumoInput): Promise<InsumoViewModel> {
  const envelope = await requestSgeb<InsumoApiRecord>({
    url: '/insumos',
    method: 'POST',
    data: {
      nombre: input.nombre,
      tipo: input.tipo,
      unidad: input.unidad,
      costo: input.costo,
    },
  })
  return mapInsumo(envelope.data!)
}

/** `PUT /insumos/{id}` — catalog fields only. Never sets `estado`: that is a deliberately separate, operationally-consequential mutation (`updateInsumoEstado`, below) — see `insumo_validator.ts`'s own comment on the pinned backend. */
export async function updateInsumo(
  idInsumo: number,
  input: UpdateInsumoInput,
): Promise<InsumoViewModel> {
  const envelope = await requestSgeb<InsumoApiRecord>({
    url: `/insumos/${String(idInsumo)}`,
    method: 'PUT',
    data: input,
  })
  return mapInsumo(envelope.data!)
}

/**
 * `PATCH /insumos/{id}/estado` — the operational toggle the bar uses
 * without touching the Cubaitor. Marking `agotado` pauses every pending
 * order line depending on this insumo; marking it back `disponible` is the
 * "reload the stock" action.
 *
 * The response `data` is the **bare** `Insumo` resource
 * (`menu_controller.ts`'s `cambiarEstadoInsumo`:
 * `responder.ok(ctx, r.insumo, ...)`). How many order lines were paused is
 * NOT in the JSON body — it only appears inside the non-machine-readable
 * `technical_message` string. A previous version of this function assumed a
 * nested `{ insumo, ordenes_pausadas }` wrapper here — that was wrong and
 * caused this call to dereference `undefined.insumo` and throw, even though
 * the backend applied the estado change successfully (see this branch's
 * final report for the full write-up). Callers that need to know about
 * paused orders should rely on the realtime `orden:cambio`/`alerta:insumo`
 * events, not this return value.
 */
export async function updateInsumoEstado(
  idInsumo: number,
  estado: InsumoEstado,
): Promise<InsumoViewModel> {
  const envelope = await requestSgeb<InsumoApiRecord>({
    url: `/insumos/${String(idInsumo)}/estado`,
    method: 'PATCH',
    data: { estado },
  })
  return mapInsumo(envelope.data!)
}

/** `DELETE /insumos/{id}` — logical deactivation (`estado='inactivo'`). Rejected (409) if the insumo is in an active bebida's recipe (`SGEB-4016`) or configured on a live event's pin (`SGEB-4017`) — surfaced to the caller as `SgebApplicationError`, never swallowed here. */
export async function deactivateInsumo(idInsumo: number): Promise<void> {
  await requestSgeb<null>({ url: `/insumos/${String(idInsumo)}`, method: 'DELETE' })
}

// ─────────────────────────────────────────────────────────────── bebidas

/** `GET /bebidas`. `soloActivas` defaults `true` server-side when `activo` is omitted — pass `false` explicitly to see deactivated bebidas too. */
export async function fetchBebidas(
  params: { activo?: boolean } = {},
  signal?: AbortSignal,
): Promise<BebidaViewModel[]> {
  const envelope = await requestSgeb<BebidaApiRecord[]>({
    url: '/bebidas',
    params: params.activo === undefined ? {} : { activo: params.activo },
    ...(signal ? { signal } : {}),
  })
  return (envelope.data ?? []).map(mapBebida)
}

export async function createBebida(input: CreateBebidaInput): Promise<BebidaViewModel> {
  const envelope = await requestSgeb<BebidaApiRecord>({
    url: '/bebidas',
    method: 'POST',
    data: {
      nombre: input.nombre,
      descripcion: input.descripcion ?? null,
      alcoholica: input.alcoholica,
    },
  })
  return mapBebida(envelope.data!)
}

/** `PUT /bebidas/{id}` — catalog fields only; the recipe is a separate resource (`definirReceta`, below). */
export async function updateBebida(
  idBebida: number,
  input: UpdateBebidaInput,
): Promise<BebidaViewModel> {
  const envelope = await requestSgeb<BebidaApiRecord>({
    url: `/bebidas/${String(idBebida)}`,
    method: 'PUT',
    data: input,
  })
  return mapBebida(envelope.data!)
}

/** `PUT /bebidas/{id}/receta` — full replace, never a patch (confirmed `menu_service.ts`'s `definirReceta`: existing rows are deleted, then re-inserted). Server rejects (`SGEB-2012`) if `PROPORCION` values sum above 1.00, and requires at least one ingredient (`SGEB-2001`). */
export async function definirReceta(
  idBebida: number,
  ingredientes: readonly RecetaIngredienteInput[],
): Promise<BebidaViewModel> {
  const envelope = await requestSgeb<BebidaApiRecord>({
    url: `/bebidas/${String(idBebida)}/receta`,
    method: 'PUT',
    data: {
      ingredientes: ingredientes.map((i) => ({
        id_insumo: i.idInsumo,
        tipo_porcion: i.tipoPorcion,
        valor: i.valor,
        orden_servido: i.ordenServido,
      })),
    },
  })
  return mapBebida(envelope.data!)
}

/** `DELETE /bebidas/{id}` — logical deactivation. Rejected (409, `SGEB-4016`) if any `orden_detalle` referencing it is still `pendiente`/`pausada_por_insumo`. */
export async function deactivateBebida(idBebida: number): Promise<void> {
  await requestSgeb<null>({ url: `/bebidas/${String(idBebida)}`, method: 'DELETE' })
}

// ─────────────────────────────────────────────────────────────── envases

export async function fetchEnvases(
  params: { activo?: boolean } = {},
  signal?: AbortSignal,
): Promise<EnvaseViewModel[]> {
  const envelope = await requestSgeb<EnvaseApiRecord[]>({
    url: '/envases',
    params: params.activo === undefined ? {} : { activo: params.activo },
    ...(signal ? { signal } : {}),
  })
  return (envelope.data ?? []).map(mapEnvase)
}

export async function createEnvase(input: CreateEnvaseInput): Promise<EnvaseViewModel> {
  const envelope = await requestSgeb<EnvaseApiRecord>({
    url: '/envases',
    method: 'POST',
    data: { nombre: input.nombre, volumen_ml: input.volumenMl },
  })
  return mapEnvase(envelope.data!)
}

/** Changing `volumenMl` never recalculates orders already placed — each `orden_detalle` froze its own `volumen_total_ml` at creation time. */
export async function updateEnvase(
  idEnvase: number,
  input: UpdateEnvaseInput,
): Promise<EnvaseViewModel> {
  const envelope = await requestSgeb<EnvaseApiRecord>({
    url: `/envases/${String(idEnvase)}`,
    method: 'PUT',
    data: {
      ...(input.nombre === undefined ? {} : { nombre: input.nombre }),
      ...(input.volumenMl === undefined ? {} : { volumen_ml: input.volumenMl }),
    },
  })
  return mapEnvase(envelope.data!)
}

export async function deactivateEnvase(idEnvase: number): Promise<void> {
  await requestSgeb<null>({ url: `/envases/${String(idEnvase)}`, method: 'DELETE' })
}
