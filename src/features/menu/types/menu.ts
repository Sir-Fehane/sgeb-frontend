/**
 * UI domain types for the global menu catalog — Insumos, Bebidas (+ recetas),
 * Envases. Confirmed against the pinned backend
 * (`sgeb-backend@2c41367f6d5d87b49fbd6d4682d52ee39203b631`,
 * `app/modules/menu/`), not `docs/api/openapi-sgeb.yaml` alone: see
 * `services/menuApi.ts`'s module comment for the confirmed request-body
 * casing mismatch this feature works around.
 *
 * Scope: this catalog is GLOBAL, not event-scoped (`Insumo`/`Bebida`/
 * `Envase` carry no `id_evento`). Event-scoped dispensing configuration
 * (`ConfigDispensado`) and live order/dispensing state live in
 * `features/events/cubaitor/`, never here — see that feature's own module
 * comment for the split rationale (task's own §4/§21 instruction: never mix
 * the global catalog with event-scoped operational state in one query
 * domain).
 */

export type InsumoTipo = 'alcohol' | 'refresco' | 'jugo' | 'agua' | 'otro'

/** Operational state, distinct from `activo` (catalog membership) — confirmed `insumo.ts:6-9` on the pinned backend. */
export type InsumoEstado = 'disponible' | 'bajo' | 'agotado' | 'inactivo'

export interface InsumoViewModel {
  idInsumo: number
  nombre: string
  tipo: InsumoTipo
  unidad: string
  costo: number
  estado: InsumoEstado
  activo: boolean
}

/** `FIJO_ML` never scales with the envase (e.g. a fixed alcohol dose); `PROPORCION` scales with envase volume; `RESTO` fills whatever is left. */
export type TipoPorcion = 'PROPORCION' | 'FIJO_ML' | 'RESTO'

export interface RecetaIngredienteViewModel {
  idRecetaIng: number
  idBebida: number
  idInsumo: number
  tipoPorcion: TipoPorcion
  /** Fraction 0–1 for `PROPORCION`, ml for `FIJO_ML`, ignored (always 0 server-side) for `RESTO`. */
  valor: number
  ordenServido: number
}

export interface BebidaViewModel {
  idBebida: number
  nombre: string
  descripcion: string | null
  alcoholica: boolean
  activo: boolean
  /** Absent on the list endpoint's rows is never observed — `GET /bebidas` always preloads `receta` on the pinned backend — but a freshly-created bebida has an empty array, not undefined; see `services/menuApi.ts`. A bebida with an empty recipe exists in the catalog but cannot be dispensed (`SGEB-3002`). */
  receta: readonly RecetaIngredienteViewModel[]
}

export interface EnvaseViewModel {
  idEnvase: number
  nombre: string
  volumenMl: number
  activo: boolean
}

export interface CreateInsumoInput {
  nombre: string
  tipo: InsumoTipo
  unidad: string
  costo: number
}

export type UpdateInsumoInput = Partial<CreateInsumoInput>

export interface CreateBebidaInput {
  nombre: string
  descripcion?: string | null
  alcoholica: boolean
}

export type UpdateBebidaInput = Partial<CreateBebidaInput>

export interface RecetaIngredienteInput {
  idInsumo: number
  tipoPorcion: TipoPorcion
  valor: number
  ordenServido: number
}

export interface CreateEnvaseInput {
  nombre: string
  volumenMl: number
}

export type UpdateEnvaseInput = Partial<CreateEnvaseInput>
