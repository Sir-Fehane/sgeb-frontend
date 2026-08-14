import type { EventTableViewModel } from '@/features/events/montage/types/montage'

/**
 * Development/demo fixtures for the table-assignment section only.
 * `feature/montage-live-integration` removed this file's former
 * `findMontageParticipants`/`MONTAGE_PARTICIPANTS` export: the roster and
 * its checklist state are now live (`services/montageApi.ts`), so a
 * participant-keyed overlay tied to fake ids would be dead code, never
 * reachable from `EventMontagePage`. Table availability/assignment stays
 * foundation-only — see `types/montage.ts`'s module comment for the
 * confirmed backend gap this works around — so `MONTAGE_TABLES` remains
 * the real production data source for that one section, exactly as
 * before.
 */
const MONTAGE_TABLES: Readonly<Record<number, readonly EventTableViewModel[]>> = {
  1001: [
    { idMesa: 1, etiqueta: 'Mesa 1', estado: 'libre' },
    { idMesa: 2, etiqueta: 'Mesa 2', estado: 'libre' },
    { idMesa: 3, etiqueta: 'Mesa 3 VIP', estado: 'ocupada' },
  ],
}

/**
 * Returns the event's table roster. Any event without a specific overlay
 * (currently only 1001 has one) correctly returns an empty list — the "no
 * tables" state.
 */
export function findMontageTables(idEvento: number): readonly EventTableViewModel[] {
  return MONTAGE_TABLES[idEvento] ?? []
}
