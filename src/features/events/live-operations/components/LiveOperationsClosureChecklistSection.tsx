import { IconCircle, IconCircleCheck } from '@tabler/icons-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import type { ChecklistTemplateViewModel } from '@/features/checklists/types/checklists'
import type {
  ApproveClosureChecklistRequest,
  ClosureChecklistApprovalStatus,
  ClosureChecklistViewModel,
  InstantiateClosureChecklistRequest,
} from '@/features/events/live-operations/types/liveOperations'
import {
  CLOSURE_CHECKLIST_STATUS_LABELS,
  CLOSURE_CHECKLIST_STATUS_TONES,
} from '@/features/events/live-operations/utils/liveOperationsPresentation'
import { Badge, Button, Select, Text } from '@/shared/components'

export interface LiveOperationsClosureChecklistSectionProps {
  idParticipacion: number
  nombreParticipante: string
  checklist?: ClosureChecklistViewModel | undefined
  approvalStatus?: ClosureChecklistApprovalStatus
  /** Safe, backend-approved `SgebApplicationError`/`SgebNetworkError` message. Falls back to a generic message when absent — never a `technical_message`. */
  approveErrorMessage?: string
  onApproveChecklist: (request: ApproveClosureChecklistRequest) => void
  /** Available `cierre` templates to offer when this participant has no exit checklist instanced yet. An empty array (the catalog genuinely has no `cierre` template) renders an explanatory prerequisite and a link to `/checklists`, not a silently missing action — mirrors `EventMontageChecklistSection`'s `NoChecklistInstantiated`. */
  availableTemplates?: readonly ChecklistTemplateViewModel[]
  isInstantiating?: boolean
  instantiateErrorMessage?: string
  onInstantiateChecklist?: (request: InstantiateClosureChecklistRequest) => void
}

interface NoChecklistInstantiatedProps {
  idParticipacion: number
  nombreParticipante: string
  availableTemplates?: readonly ChecklistTemplateViewModel[] | undefined
  isInstantiating: boolean
  instantiateErrorMessage?: string | undefined
  onInstantiateChecklist?:
    ((request: InstantiateClosureChecklistRequest) => void) | undefined
}

/** Mirrors `EventMontageChecklistSection`'s `NoChecklistInstantiated`, adapted to `tipo: 'cierre'` wording. */
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

  if (!onInstantiateChecklist) {
    return (
      <div className="flex flex-col items-start gap-1">
        <Badge tone="neutral">Checklist de salida no asignado</Badge>
        <Text size="sm" className="text-muted-foreground">
          Este mesero aún no tiene un checklist de salida instanciado.
        </Text>
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-start gap-1">
        <Badge tone="neutral">Checklist de salida no asignado</Badge>
        <Text size="sm" className="text-muted-foreground">
          Este mesero aún no tiene un checklist de salida instanciado.
        </Text>
        <Text size="sm" className="text-muted-foreground">
          No hay ninguna plantilla de checklist de tipo "Cierre" en el catálogo todavía —
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
      <Badge tone="neutral">Checklist de salida no asignado</Badge>
      <Text size="sm" className="text-muted-foreground">
        Este mesero aún no tiene un checklist de salida instanciado.
      </Text>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label={`Plantilla de checklist de salida para ${nombreParticipante}`}
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={isInstantiating}
          disabled={selectedIdChecklist === null}
          aria-label={`Asignar checklist de salida a ${nombreParticipante}`}
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
 * Captain-facing exit checklist ("Verificación de limpieza") for one
 * participant, on the Control de salida screen. Mirrors
 * `EventMontageChecklistSection` — same instantiate/monitor/approve shape
 * — with one now-resolved difference: approving here used to persist
 * nothing, so this section was purely advisory. The pinned backend
 * authority now persists approval (`checklist_instancia.aprobado_en`) for
 * every checklist type, and `PATCH /participaciones/{id}/estado` →
 * `salida` requires it for a `cierre` instance — see
 * `types/liveOperations.ts`'s `ClosureChecklistViewModel` comment. So
 * approving here IS now a real precondition for "Dar salida"
 * (`LiveOperationsParticipantRow` disables that action until
 * `checklist.status === 'approved'`).
 *
 * "Aprobar checklist" is offered once `status === 'completed'`, same
 * SGEB-4005 mirroring montage does. Unlike before this branch, a
 * successful approval is NOT shown from local state: the badge at the top
 * of this component already renders `status === 'approved'` once the
 * mutation's invalidation (`useApproveClosureChecklistMutation`) resolves
 * a refetch — the real, persisted, resync-safe signal, not a flag that
 * would vanish on remount/reload/reconnect the way it used to.
 */
export function LiveOperationsClosureChecklistSection({
  idParticipacion,
  nombreParticipante,
  checklist,
  approvalStatus = 'idle',
  approveErrorMessage,
  onApproveChecklist,
  availableTemplates,
  isInstantiating = false,
  instantiateErrorMessage,
  onInstantiateChecklist,
}: LiveOperationsClosureChecklistSectionProps) {
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
        <Badge tone={CLOSURE_CHECKLIST_STATUS_TONES[checklist.status]}>
          {CLOSURE_CHECKLIST_STATUS_LABELS[checklist.status]}
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
            loading={approvalStatus === 'approving'}
            aria-label={`Aprobar checklist de salida de ${nombreParticipante}`}
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
