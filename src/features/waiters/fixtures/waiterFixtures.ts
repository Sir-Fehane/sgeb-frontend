import type { WaiterListItemViewModel } from '@/features/waiters/types/waiter'

/**
 * Development/demo fixtures only — NOT live backend data. All names and
 * contact details are neutral and fictional (no real employee or
 * customer data). Remove this whole file once real API integration
 * (a later branch) supplies `GET /usuarios?rol=mesero` responses.
 *
 * Each row stands alone — no fake links to event/participation/payment
 * fixtures are fabricated here, since none of those concerns are
 * displayed in this directory (see `types/waiter.ts`'s comment on why).
 */
export const WAITERS_FIXTURE: readonly WaiterListItemViewModel[] = [
  {
    id: 'mesero-demo-1',
    nombreCompleto: 'Mesero de demostración uno',
    correo: 'mesero.demo.uno@example.com',
    telefono: '+52 871 000 0001',
    estadoCuenta: 'activo',
  },
  {
    id: 'mesero-demo-2',
    nombreCompleto: 'Mesero de demostración dos',
    correo: 'mesero.demo.dos@example.com',
    telefono: null,
    estadoCuenta: 'activo',
  },
  {
    id: 'mesero-demo-3',
    nombreCompleto: 'Mesero de demostración tres',
    correo: 'mesero.demo.tres@example.com',
    telefono: '+52 871 000 0003',
    estadoCuenta: 'inactivo',
  },
  {
    id: 'mesero-demo-4',
    nombreCompleto: 'Mesero de demostración cuatro',
    correo: 'mesero.demo.cuatro@example.com',
    telefono: '+52 871 000 0004',
    estadoCuenta: 'activo',
  },
]
