import { DashboardSection } from '@/features/dashboard/components/DashboardSection'
import { DashboardSectionUnavailable } from '@/features/dashboard/components/DashboardSectionUnavailable'
import type { DashboardResumen } from '@/features/dashboard/types/dashboard'

export interface DashboardSummarySectionProps {
  resumen: DashboardResumen | null
}

const SUMMARY_FIELDS: readonly { key: keyof DashboardResumen; label: string }[] = [
  { key: 'total', label: 'Total' },
  { key: 'borrador', label: 'Borrador' },
  { key: 'publicados', label: 'Publicados' },
  { key: 'enCurso', label: 'En curso' },
  { key: 'finalizados', label: 'Finalizados' },
  { key: 'cancelados', label: 'Cancelados' },
]

/**
 * `DashboardCapitan.resumen` — exactly the 6 documented counts, no
 * derived trend/percentage/comparison against a prior period (none is
 * documented). Zero is a valid count, rendered like any other.
 */
export function DashboardSummarySection({ resumen }: DashboardSummarySectionProps) {
  return (
    <DashboardSection title="Resumen de eventos">
      {resumen === null ? (
        <DashboardSectionUnavailable />
      ) : (
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {SUMMARY_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1">
              <dt className="font-sans text-caption text-muted-foreground">{label}</dt>
              <dd className="font-heading text-heading text-foreground font-semibold">
                {resumen[key]}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </DashboardSection>
  )
}
