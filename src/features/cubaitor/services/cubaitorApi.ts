import type {
  CreateCubaitorInput,
  CubaitorEstado,
  CubaitorEstadoViewModel,
  CubaitorViewModel,
  UpdateCubaitorInput,
} from '@/features/cubaitor/types/cubaitor'
import { requestSgeb } from '@/shared/api/sgebClient'

/**
 * CONFIRMED WIRE CASING — `POST /cubaitors` and `PUT /cubaitors/{id}`
 * request bodies are **snake_case** (`num_pins`, `host_ip`), matching both
 * `app/modules/cubaitor/validators/cubaitor_validator.ts`
 * (`cubaitorValidator`/`cubaitorParcialValidator`) on the pinned backend
 * AND `docs/api/openapi-sgeb.yaml`'s documented shape — unlike some other
 * mutating endpoints in this API (see e.g. `features/events/cubaitor`'s own
 * module comment), this one does NOT use camelCase. A previous version of
 * this comment claimed the opposite; that was wrong and caused a real
 * `SGEB-2001`/"the num_pins field must be defined" failure on every
 * create/update — verified directly against the validator source, not
 * assumed. `estado` (update-only) is unaffected — already snake_case-safe
 * since it has no casing to transform. Read responses stay snake_case
 * (Lucid serialization), as always.
 */

interface CubaitorApiRecord {
  id_cubaitor: number
  nombre: string
  mac: string
  host_ip: string | null
  num_pins: number
  estado: CubaitorEstado
  ultima_conexion: string | null
}

interface EstadoCubaitorApiRecord {
  id_cubaitor: number
  nombre: string
  mac: string
  en_linea: boolean
  ultima_conexion: string | null
  segundos_sin_reportar: number | null
  pines_configurados: number
}

function mapCubaitor(record: CubaitorApiRecord): CubaitorViewModel {
  return {
    idCubaitor: record.id_cubaitor,
    nombre: record.nombre,
    mac: record.mac,
    hostIp: record.host_ip,
    numPins: record.num_pins,
    estado: record.estado,
    ultimaConexion: record.ultima_conexion,
  }
}

function mapEstado(record: EstadoCubaitorApiRecord): CubaitorEstadoViewModel {
  return {
    idCubaitor: record.id_cubaitor,
    nombre: record.nombre,
    mac: record.mac,
    enLinea: record.en_linea,
    ultimaConexion: record.ultima_conexion,
    segundosSinReportar: record.segundos_sin_reportar,
    pinesConfigurados: record.pines_configurados,
  }
}

export async function fetchCubaitors(signal?: AbortSignal): Promise<CubaitorViewModel[]> {
  const envelope = await requestSgeb<CubaitorApiRecord[]>({
    url: '/cubaitors',
    ...(signal ? { signal } : {}),
  })
  return (envelope.data ?? []).map(mapCubaitor)
}

export async function createCubaitor(
  input: CreateCubaitorInput,
): Promise<CubaitorViewModel> {
  const envelope = await requestSgeb<CubaitorApiRecord>({
    url: '/cubaitors',
    method: 'POST',
    data: {
      nombre: input.nombre,
      mac: input.mac,
      num_pins: input.numPins,
      ...(input.hostIp === undefined ? {} : { host_ip: input.hostIp }),
    },
  })
  return mapCubaitor(envelope.data!)
}

/** MAC is never editable here — it is the device's physical identity and the key the ESP32 announces itself with; see `cubaitor_validator.ts`'s own comment on the pinned backend. */
export async function updateCubaitor(
  idCubaitor: number,
  input: UpdateCubaitorInput,
): Promise<CubaitorViewModel> {
  const envelope = await requestSgeb<CubaitorApiRecord>({
    url: `/cubaitors/${String(idCubaitor)}`,
    method: 'PUT',
    data: {
      ...(input.nombre === undefined ? {} : { nombre: input.nombre }),
      ...(input.numPins === undefined ? {} : { num_pins: input.numPins }),
      ...(input.hostIp === undefined ? {} : { host_ip: input.hostIp }),
      ...(input.estado === undefined ? {} : { estado: input.estado }),
    },
  })
  return mapCubaitor(envelope.data!)
}

/** `DELETE /cubaitors/{id}` — logical deactivation (`estado='inactivo'`). Rejected (409, `SGEB-4017`) if the device has active pins configured on a published/live event. */
export async function deactivateCubaitor(idCubaitor: number): Promise<void> {
  await requestSgeb<null>({ url: `/cubaitors/${String(idCubaitor)}`, method: 'DELETE' })
}

/** `GET /cubaitors/{id}/estado` — see `types/cubaitor.ts`'s module comment for `enLinea`'s heartbeat-threshold semantics. Always HTTP 200 even when the device is offline (`SGEB-5003`, informational, never surfaced as a request failure). */
export async function fetchCubaitorEstado(
  idCubaitor: number,
  signal?: AbortSignal,
): Promise<CubaitorEstadoViewModel> {
  const envelope = await requestSgeb<EstadoCubaitorApiRecord>({
    url: `/cubaitors/${String(idCubaitor)}/estado`,
    ...(signal ? { signal } : {}),
  })
  return mapEstado(envelope.data!)
}
