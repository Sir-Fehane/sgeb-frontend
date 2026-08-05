import type { StaffingRiskViewModel } from '@/features/dashboard/types/dashboard'
import { Caption } from '@/shared/components'

export interface StaffingRiskItemProps {
  risk: StaffingRiskViewModel
}

/**
 * Always a plain, non-interactive `<li>` — no per-event action is
 * documented here (the one available action, inviting waiters, is a
 * section-level control — see `StaffingRiskSection`'s "Invitar meseros"
 * button — not scoped to an individual event).
 */
export function StaffingRiskItem({ risk }: StaffingRiskItemProps) {
  return (
    <li className="border-border bg-card flex flex-col gap-2 rounded-lg border p-4 md:grid md:grid-cols-[2fr_1fr_1fr] md:items-center md:gap-4">
      <span className="font-sans text-body-sm font-semibold">{risk.titulo}</span>
      <span className="flex flex-col">
        <Caption>Horas para inicio</Caption>
        <span className="font-sans text-body-sm">{risk.horasParaInicio}</span>
      </span>
      <span className="flex flex-col">
        <Caption>Meseros faltantes</Caption>
        <span className="font-sans text-body-sm">{risk.faltantes}</span>
      </span>
    </li>
  )
}
