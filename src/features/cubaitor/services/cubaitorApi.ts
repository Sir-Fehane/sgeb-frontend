import type {
  CreateCubaitorInput,
  CubaitorEstado,
  CubaitorEstadoViewModel,
  CubaitorViewModel,
  UpdateCubaitorInput,
} from '@/features/cubaitor/types/cubaitor'
import { requestSgeb } from '@/shared/api/sgebClient'

/**
 * CONFIRMED WIRE-CASING MISMATCH — same pattern as `features/menu`'s
 * `menuApi.ts` (see that file's module comment): request bodies here are
 * **camelCase** (`numPins`, `hostIp`), confirmed directly against
 * `app/modules/cubaitor/validators/cubaitor_validator.ts` and
 * `tests/functional/api_barra.spec.ts` on the pinned backend, not
 * `docs/api/openapi-sgeb.yaml`'s documented snake_case. Read responses stay
 * snake_case (Lucid serialization).
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
      numPins: input.numPins,
      ...(input.hostIp === undefined ? {} : { hostIp: input.hostIp }),
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
    data: input,
  })
  return mapCubaitor(envelope.data!)
}

/** `DELETE /cubaitors/{id}` — logical deactivation (`estado='inactivo'`). Rejected (409, `SGEB-4017`) if the device has active pins configured on a published/live event. */
export async function deactivateCubaitor(idCubaitor: number): Promise<void> {
  await requestSgeb<null>({ url: `/cubaitors/${String(idCubaitor)}`, method: 'DELETE' })
}

/** `GET /cubaitors/{id}/estado` — see `types/cubaitor.ts`'s module comment: `enLinea` is not a trustworthy live signal on the pinned backend. Always HTTP 200 even when the device is down (`SGEB-5003`, informational, never surfaced as a request failure). */
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
