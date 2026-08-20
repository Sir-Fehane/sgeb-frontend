import type {
  EventCaptainViewModel,
  EventListItemViewModel,
  EventSalonOption,
} from '@/features/events/types/event'

/**
 * Development/demo fixtures only — NOT live backend data.
 *
 * Used to give the reusable events components something representative
 * to render during development and in tests. All names are neutral and
 * fictional. Remove this whole file once real API integration
 * (a later branch) supplies `GET /salones` and `GET /eventos` responses.
 *
 * No captain-option fixture exists for event CREATION: the captain-
 * selector control was removed from that form entirely (self-service,
 * resolved from the authenticated session — see `eventCreateSchema.ts`).
 * The `capitan` fixtures below are for READ-side display only, mirroring
 * the confirmed `Evento.capitan` field (v1.12).
 */
export const CAPITAN_UNO_FIXTURE: EventCaptainViewModel = {
  uuidUsuario: '11111111-1111-4111-8111-111111111111',
  nombre: 'Capitán',
  apellidoPaterno: 'Demostración',
  apellidoMaterno: 'Uno',
  correo: 'capitan.uno@example.com',
}

export const CAPITAN_DOS_FIXTURE: EventCaptainViewModel = {
  uuidUsuario: '22222222-2222-4222-8222-222222222222',
  nombre: 'Capitán',
  apellidoPaterno: 'Demostración',
  apellidoMaterno: 'Dos',
  correo: 'capitan.dos@example.com',
}

export const SALON_OPTIONS_FIXTURE: readonly EventSalonOption[] = [
  {
    idSalon: 1,
    nombre: 'Salón Roble',
    capacidadMaxMesas: 40,
    latitud: 25.5428,
    longitud: -103.4068,
  },
  {
    idSalon: 2,
    nombre: 'Salón Alameda',
    capacidadMaxMesas: 25,
    latitud: 25.5511,
    longitud: -103.4192,
  },
  {
    idSalon: 3,
    nombre: 'Jardín Norte',
    capacidadMaxMesas: 60,
    latitud: 25.5623,
    longitud: -103.44,
  },
]

export const EVENTOS_FIXTURE: readonly EventListItemViewModel[] = [
  {
    idEvento: 1001,
    idSalon: 1,
    salonNombre: 'Salón Roble',
    capitan: CAPITAN_UNO_FIXTURE,
    titulo: 'Evento de demostración — boda',
    tipo: 'social',
    fecha: '2026-09-12',
    horaPresentacion: '16:00',
    inicio: '2026-09-12T18:00:00',
    fin: null,
    cupoMeseros: 12,
    numMesas: 20,
    tarifaPorMesero: 450,
    radioGeocercaM: 150,
    estado: 'publicado',
    creadoEn: '2026-07-01T09:00:00',
  },
  {
    idEvento: 1002,
    idSalon: 3,
    salonNombre: 'Jardín Norte',
    capitan: CAPITAN_DOS_FIXTURE,
    titulo: 'Evento de demostración — conferencia anual',
    tipo: 'empresarial',
    fecha: '2026-08-01',
    horaPresentacion: '08:00',
    inicio: '2026-08-01T09:00:00',
    fin: '2026-08-01T17:00:00',
    cupoMeseros: 30,
    numMesas: 45,
    tarifaPorMesero: 500,
    radioGeocercaM: 200,
    estado: 'finalizado',
    creadoEn: '2026-05-10T12:00:00',
  },
  {
    idEvento: 1003,
    idSalon: 2,
    salonNombre: 'Salón Alameda',
    capitan: CAPITAN_UNO_FIXTURE,
    titulo: 'Evento de demostración — en curso',
    tipo: 'social',
    fecha: '2026-07-20',
    horaPresentacion: '19:00',
    inicio: '2026-07-20T20:00:00',
    fin: null,
    cupoMeseros: 8,
    numMesas: 12,
    tarifaPorMesero: 400,
    radioGeocercaM: 100,
    estado: 'en_curso',
    creadoEn: '2026-06-01T10:00:00',
  },
  {
    idEvento: 1004,
    idSalon: 1,
    salonNombre: 'Salón Roble',
    capitan: CAPITAN_DOS_FIXTURE,
    titulo: 'Evento de demostración — cancelado',
    tipo: 'empresarial',
    fecha: '2026-07-05',
    horaPresentacion: '10:00',
    inicio: '2026-07-05T11:00:00',
    fin: null,
    cupoMeseros: 10,
    numMesas: 15,
    tarifaPorMesero: 420,
    radioGeocercaM: 150,
    estado: 'cancelado',
    creadoEn: '2026-05-20T08:00:00',
  },
  {
    idEvento: 1005,
    idSalon: 2,
    salonNombre: 'Salón Alameda',
    capitan: CAPITAN_UNO_FIXTURE,
    titulo: 'Evento de demostración — borrador',
    tipo: 'social',
    fecha: '2026-10-03',
    horaPresentacion: '17:00',
    inicio: '2026-10-03T18:30:00',
    fin: null,
    cupoMeseros: 6,
    numMesas: 10,
    tarifaPorMesero: 380,
    radioGeocercaM: 120,
    estado: 'borrador',
    creadoEn: '2026-07-15T14:00:00',
  },
]
