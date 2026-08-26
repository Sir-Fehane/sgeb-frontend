import { IconCircle, IconCircleCheck } from '@tabler/icons-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import type { ChecklistTemplateViewModel } from '@/features/events/montage/services/montageApi'
import type {
  ApproveChecklistRequest,
  InstantiateChecklistRequest,
  MontageChecklistViewModel,
} from '@/features/events/montage/types/montage'
import {
  CHECKLIST_STATUS_LABELS,
  CHECKLIST_STATUS_TONES,
} from '@/features/events/montage/utils/montagePresentation'
import { Badge, Button, Select, Text } from '@/shared/components'

export interface EventMontageChecklistSectionProps {
  idParticipacion: number
  nombreParticipante: string
  checklist?: MontageChecklistViewModel | undefined
  isApproving?: boolean
  /** Safe, backend-approved `SgebApplicationError`/`SgebNetworkError` message. Falls back to a generic message when absent — never a `technical_message`. */
  approveErrorMessage?: string
  onApproveChecklist: (request: ApproveChecklistRequest) => void
  /** Available `montaje` templates to offer when this participant has no checklist instanced yet. An empty array (the catalog genuinely has no `montaje` template) renders an explanatory prerequisite and a link to `/checklists`, not a silently missing action — see `NoChecklistInstantiated`. */
  availableTemplates?: readonly ChecklistTemplateViewModel[]
  isInstantiating?: boolean
  instantiateErrorMessage?: string
  onInstantiateChecklist?: (request: InstantiateChecklistRequest) => void
}

interface NoChecklistInstantiatedProps {
  idParticipacion: number
  nombreParticipante: string
  availableTemplates?: readonly ChecklistTemplateViewModel[] | undefined
  isInstantiating: boolean
  instantiateErrorMessage?: string | undefined
  onInstantiateChecklist?: ((request: InstantiateChecklistRequest) => void) | undefined
}

/**
 * Absent-checklist state (Phase 6, `feature/checklist-flow-alignment`) —
 * offers the captain a real `POST /participaciones/{id}/checklist-
 * instancias` action instead of a dead-end message, using the same
 * `montaje` templates already fetched for this screen
 * (`useMontageChecklistTemplatesQuery`). By the time this ever renders,
 * `EventMontagePage`'s top-level `isLoading` has already resolved (it
 * blocks the whole participant list, this component included, while any
 * query — templates among them — is still pending), so an empty
 * `availableTemplates` here always means "the `montaje`-template catalog
 * genuinely has zero entries," never "still loading" — see the two
 * branches below, which is why they can be told apart with certainty
 * instead of collapsing into one silent message.
 */
function NoChecklistInstantiated({
  idParticipacion,
  nombreParticipante,
  availableTemplates,
  isInstantiating,
  instantiateErrorMessage,
  onInstantiateChecklist,
}: NoChecklistInstantiatedProps) {
  const templates = availableTemplates ?? []
  const [selectedIdChecklist, setSelectedIdChecklist] = useState<number | null>(
    templates[0]?.idChecklist ?? null,
  )

  // Only when the caller hasn't wired the instantiate action at all (never
  // the case in the real `EventMontagePage` flow — only a defensive
  // fallback for other/future consumers of this component) does this fall
  // back to a plain, non-actionable message.
  if (!onInstantiateChecklist) {
    return (
      <Text size="sm" className="text-muted-foreground">
        Este mesero aún no tiene un checklist de montaje instanciado.
      </Text>
    )
  }

  /**
   * The real prerequisite this bug report traced to: the instantiate
   * action needs at least one `tipo: 'montaje'` template in the global
   * catalog (`GET /checklists?tipo=montaje`) to offer. When the catalog
   * has none — e.g. a captain who only created `servicio`/`cierre`
   * templates, or hasn't created any yet — the action has nothing to
   * instantiate and previously disappeared with no explanation,
   * indistinguishable from the feature being broken. This now names the
   * prerequisite explicitly and links to the existing global `/checklists`
   * catalog (`features/checklists`) to fix it — never a second,
   * disconnected template-management UI duplicated inside the event.
   */
  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-start gap-1">
        <Text size="sm" className="text-muted-foreground">
          Este mesero aún no tiene un checklist de montaje instanciado.
        </Text>
        <Text size="sm" className="text-muted-foreground">
          No hay ninguna plantilla de checklist de tipo "Montaje" en el catálogo todavía —
          crea una en Checklists para poder asignarla aquí.
        </Text>
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link to="/checklists">Ir a Checklists</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Text size="sm" className="text-muted-foreground">
        Este mesero aún no tiene un checklist de montaje instanciado.
      </Text>
      <div className="flex flex-wrap items-center gap-2">
        {templates.length > 1 ? (
          <Select
            aria-label={`Plantilla de checklist para ${nombreParticipante}`}
            value={selectedIdChecklist ?? ''}
            disabled={isInstantiating}
            onChange={(event) => setSelectedIdChecklist(Number(event.target.value))}
            className="w-auto"
          >
            {templates.map((template) => (
              <option key={template.idChecklist} value={template.idChecklist}>
                {template.nombre}
              </option>
            ))}
          </Select>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={isInstantiating}
          disabled={selectedIdChecklist === null}
          aria-label={`Asignar checklist de montaje a ${nombreParticipante}`}
          onClick={() => {
            if (selectedIdChecklist === null) return
            onInstantiateChecklist({ idParticipacion, idChecklist: selectedIdChecklist })
          }}
        >
          Asignar checklist
        </Button>
      </div>
      {instantiateErrorMessage ? (
        <Text size="sm" className="text-destructive">
          {instantiateErrorMessage}
        </Text>
      ) : null}
    </div>
  )
}

/**
 * Read-only checklist presentation — items are filled by the mesero
 * (`PUT /checklist-instancias/{id}/respuestas`), never by the captain.
 * The captain's own read path for this same data, in live integration,
 * is `GET /participaciones/{id}/checklist-instancias` (documented to feed
 * both the mesero's montage screen and this captain approval view) — this
 * component never implies the captain reads through the mesero's `PUT`.
 * No item here is an interactive checkbox (per the accessibility
 * requirement: no fake interactive controls for read-only state). Icon +
 * text conveys each item's `hecho` state, never color alone.
 *
 * "Aprobar checklist" is the one real captain action documented for this
 * screen (`PATCH /checklist-instancias/{id}/aprobar`, RF-21) — it is only
 * ever rendered enabled when `status === 'completed'`, mirroring SGEB-4005
 * ("Checklist incompleto no puede aprobarse") locally. There is no
 * captain-override path for an incomplete checklist, and no "reopen an
 * approved checklist" action — neither is documented.
 */
export function EventMontageChecklistSection({
  idParticipacion,
  nombreParticipante,
  checklist,
  isApproving = false,
  approveErrorMessage,
  onApproveChecklist,
  availableTemplates,
  isInstantiating = false,
  instantiateErrorMessage,
  onInstantiateChecklist,
}: EventMontageChecklistSectionProps) {
  if (!checklist) {
    return (
      <NoChecklistInstantiated
        idParticipacion={idParticipacion}
        nombreParticipante={nombreParticipante}
        availableTemplates={availableTemplates}
        isInstantiating={isInstantiating}
        instantiateErrorMessage={instantiateErrorMessage}
        onInstantiateChecklist={onInstantiateChecklist}
      />
    )
  }

  const completedCount = checklist.items.filter((item) => item.hecho).length

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={CHECKLIST_STATUS_TONES[checklist.status]}>
          {CHECKLIST_STATUS_LABELS[checklist.status]}
        </Badge>
        <Text size="sm" className="text-muted-foreground">
          {checklist.nombre} · {completedCount} de {checklist.items.length} ítems
          completos
        </Text>
      </div>

      <ul className="flex flex-col gap-1">
        {checklist.items.map((item) => (
          <li key={item.idItem} className="flex items-center gap-2">
            {item.hecho ? (
              <IconCircleCheck
                aria-hidden="true"
                className="text-success size-4 shrink-0"
              />
            ) : (
              <IconCircle
                aria-hidden="true"
                className="text-muted-foreground size-4 shrink-0"
              />
            )}
            <Text size="sm">
              {item.descripcion} — {item.hecho ? 'completo' : 'pendiente'} (
              {item.cantidad} de {item.cantidadEsperada})
            </Text>
          </li>
        ))}
      </ul>

      {checklist.status === 'completed' ? (
        <div className="flex flex-col items-start gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            loading={isApproving}
            aria-label={`Aprobar checklist de ${nombreParticipante}`}
            onClick={() =>
              onApproveChecklist({
                idParticipacion,
                idChecklistInstancia: checklist.idChecklistInstancia,
              })
            }
          >
            Aprobar checklist
          </Button>
          {approveErrorMessage ? (
            <Text size="sm" className="text-destructive">
              {approveErrorMessage}
            </Text>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
