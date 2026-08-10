import { IconInfoCircle } from '@tabler/icons-react'
import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import { EventClosureContent } from '@/features/events/closure/components/EventClosureContent'
import {
  findEventClosureReadiness,
  findMermaReports,
} from '@/features/events/closure/fixtures/closureFixtures'
import type { CreateWasteReportFormValues } from '@/features/events/closure/schemas/wasteReportSchema'
import type { MermaReportViewModel } from '@/features/events/closure/types/closure'
import { findEventDetailFixture } from '@/features/events/fixtures/eventDetailFixtures'
import { parseEventId } from '@/features/events/utils/parseEventId'
import { Alert, Text } from '@/shared/components'

/**
 * Routed at /eventos/:id/cierre ("Cierre del evento"). Entirely
 * presentation-only, exactly like `EventMontagePage`:
 * `findEventClosureReadiness`/`findMermaReports` are development/demo
 * data, never real `GET /eventos/{id}/cierre` or
 * `GET /eventos/{id}/reportes-merma` responses. No Axios, no TanStack
 * Query, no network request of any kind, no payment calculation, no
 * event-finalization mutation.
 *
 * `handleSubmitWasteReport` models the one documented captain action this
 * screen owns (`POST /eventos/{id_evento}/reportes-merma`) entirely in
 * local component state, never persisted. `idReporteDemo` is minted from a
 * counter starting well above any fixture-seeded value — a demo-only key,
 * never claimed as a real backend `id_reporte`.
 */
export function EventClosurePage() {
  const { id } = useParams<{ id: string }>()
  const idEvento = parseEventId(id)
  const evento = idEvento === null ? null : findEventDetailFixture(idEvento)
  const readiness = idEvento === null ? null : findEventClosureReadiness(idEvento)

  const [mermaReports, setMermaReports] = useState<MermaReportViewModel[]>(() =>
    idEvento === null ? [] : [...findMermaReports(idEvento)],
  )
  const [isSubmittingWasteReport, setIsSubmittingWasteReport] = useState(false)
  const nextDemoReportId = useRef(1000)

  async function handleSubmitWasteReport(values: CreateWasteReportFormValues) {
    setIsSubmittingWasteReport(true)
    await Promise.resolve()

    const report: MermaReportViewModel = {
      idReporteDemo: `demo-merma-${String(nextDemoReportId.current)}`,
      observaciones: values.observaciones ?? null,
      detalles: values.detalles.map((detalle) => ({
        tipo: detalle.tipo,
        descripcion: detalle.descripcion ?? null,
        cantidad: detalle.cantidad,
        costoEstimado: detalle.costo_estimado ?? null,
      })),
    }
    nextDemoReportId.current += 1

    setMermaReports((previous) => [report, ...previous])
    setIsSubmittingWasteReport(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <Alert
        tone="info"
        icon={<IconInfoCircle aria-hidden="true" />}
        title="Datos de desarrollo"
      >
        <Text size="sm">
          El cierre mostrado usa datos de desarrollo (
          <code>features/events/closure/fixtures</code>), no información real. Registrar
          un reporte de merma aquí no envía ninguna solicitud ni se conserva al recargar
          la página. El cálculo de pagos no se realiza desde este panel.
        </Text>
      </Alert>

      <EventClosureContent
        evento={evento}
        isLoading={false}
        readiness={readiness}
        mermaReports={mermaReports}
        onSubmitWasteReport={handleSubmitWasteReport}
        isSubmittingWasteReport={isSubmittingWasteReport}
      />
    </div>
  )
}
