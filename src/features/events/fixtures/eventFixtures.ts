import type {
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
 * No captain-option fixture exists here: the captain-selector control
 * was removed from event creation entirely (`uuid_capitan`'s real
 * source — authenticated session vs. admin picker vs. role-dependent —
 * remains unresolved), so there is nothing left that needs one. Nor does
 * any event below carry a captain identifier field — the list
 * presentation model has no genuine use for it (see
 * `EventListItemViewModel`'s comment); `capitanNombre` is a display-only
 * convenience, not a fabricated `uuid_capitan`.
 */

export const SALON_OPTIONS_FIXTURE: readonly EventSalonOption[] = [
  { idSalon: 1, nombre: 'Salón Roble', capacidadMaxMesas: 40 },
  { idSalon: 2, nombre: 'Salón Alameda', capacidadMaxMesas: 25 },
  { idSalon: 3, nombre: 'Jardín Norte', capacidadMaxMesas: 60 },
]

export const EVENTOS_FIXTURE: readonly EventListItemViewModel[] = [
  {
    idEvento: 1001,
    idSalon: 1,
    salonNombre: 'Salón Roble',
    capitanNombre: 'Capitán de demostración uno',
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
    capitanNombre: 'Capitán de demostración dos',
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
    capitanNombre: 'Capitán de demostración uno',
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
    capitanNombre: 'Capitán de demostración dos',
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
    capitanNombre: 'Capitán de demostración uno',
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
