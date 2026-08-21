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
 * CONFIRMED WIRE-CASING MISMATCH (direct inspection of the pinned backend,
 * `app/modules/menu/validators/menu_validator.ts` +
 * `tests/functional/api_barra.spec.ts`, not `docs/api/openapi-sgeb.yaml`
 * alone): every mutating request body (POST/PUT/PATCH) in this module uses
 * **camelCase** field names (`volumenMl`, `idInsumo`, `tipoPorcion`,
 * `ordenServido`) — OpenAPI documents snake_case for all of them. Read
 * responses (Lucid model serialization) ARE snake_case, matching OpenAPI.
 * This file is the one place that boundary is crossed: every `...Input`
 * type above stays camelCase (matching this app's own view-model
 * convention), and every function below builds the literal camelCase wire
 * body by hand rather than trusting a generic case-conversion helper — see
 * this branch's report for the full backend-gap writeup.
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

export interface UpdateInsumoEstadoResult {
  insumo: InsumoViewModel
  /** Confirmed non-OpenAPI response field (`menu_controller.ts`'s `cambiarEstadoInsumo`): a nested `{ insumo, ordenes_pausadas }` wrapper, not a bare `Insumo`. Marking `agotado` pauses every pending order line depending on this insumo. */
  ordenesPausadas: number
}

/** `PATCH /insumos/{id}/estado` — the operational toggle the bar uses without touching the Cubaitor. */
export async function updateInsumoEstado(
  idInsumo: number,
  estado: InsumoEstado,
): Promise<UpdateInsumoEstadoResult> {
  const envelope = await requestSgeb<{
    insumo: InsumoApiRecord
    ordenes_pausadas: number
  }>({
    url: `/insumos/${String(idInsumo)}/estado`,
    method: 'PATCH',
    data: { estado },
  })
  const data = envelope.data as { insumo: InsumoApiRecord; ordenes_pausadas: number }
  return { insumo: mapInsumo(data.insumo), ordenesPausadas: data.ordenes_pausadas }
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
    data: { ingredientes },
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
    data: { nombre: input.nombre, volumenMl: input.volumenMl },
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
    data: input,
  })
  return mapEnvase(envelope.data!)
}

export async function deactivateEnvase(idEnvase: number): Promise<void> {
  await requestSgeb<null>({ url: `/envases/${String(idEnvase)}`, method: 'DELETE' })
}
