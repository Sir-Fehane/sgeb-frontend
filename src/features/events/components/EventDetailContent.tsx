import {
  EventDetailComandaSection,
  type EventDetailComandaSectionProps,
} from '@/features/events/components/EventDetailComandaSection'
import { EventDetailErrorState } from '@/features/events/components/EventDetailErrorState'
import { EventDetailGeofenceSection } from '@/features/events/components/EventDetailGeofenceSection'
import { EventDetailHeader } from '@/features/events/components/EventDetailHeader'
import { EventDetailLifecycleSection } from '@/features/events/components/EventDetailLifecycleSection'
import { EventDetailLoadingState } from '@/features/events/components/EventDetailLoadingState'
import { EventDetailLogisticsSection } from '@/features/events/components/EventDetailLogisticsSection'
import { EventDetailMesasSection } from '@/features/events/components/EventDetailMesasSection'
import type { EventDetailMesasSectionProps } from '@/features/events/components/EventDetailMesasSection'
import { EventDetailRoadmapSection } from '@/features/events/components/EventDetailRoadmapSection'
import { EventDetailScheduleSection } from '@/features/events/components/EventDetailScheduleSection'
import { EventDetailUnavailableState } from '@/features/events/components/EventDetailUnavailableState'
import { EventEditForm } from '@/features/events/components/EventEditForm'
import type { EventEditFormValues } from '@/features/events/schemas/eventEditSchema'
import type { EventDetailViewModel, EventStatus } from '@/features/events/types/event'

export interface EventDetailEditBundleProps {
  /** UX-only visibility gate for the "Editar evento" toggle — see `EventDetailHeader`'s own `canEdit` comment. */
  canEdit: boolean
  isEditing: boolean
  onToggleEdit: () => void
  /** May reject — see `EventEditForm`'s own `onSubmit` comment. */
  onSubmit: (values: EventEditFormValues) => Promise<void>
  isSubmitting: boolean
  /** A safe, user-facing message for the most recent failed update attempt — never `technical_message`. */
  errorMessage?: string
}

export interface EventDetailLifecycleBundleProps {
  /** UX-only role gate — see `EventDetailLifecycleSection`'s own `canManage` comment. */
  canManage: boolean
  mesasCount?: number
  onTransition: (estado: EventStatus) => void
  isTransitioning: boolean
  /** A safe, user-facing message for the most recent failed transition — never `technical_message`. */
  errorMessage?: string
}

export interface EventDetailContentProps {
  /** `null` means "not found" — a fixture-lookup miss or a malformed route id, not a loading gap. */
  evento: EventDetailViewModel | null
  isLoading?: boolean
  errorMessage?: string
  onRetry?: (() => void) | undefined
  comanda: EventDetailComandaSectionProps
  edit: EventDetailEditBundleProps
  lifecycle: EventDetailLifecycleBundleProps
  mesas: EventDetailMesasSectionProps
}

/**
 * The reusable presentational composition — header + (schedule/logistics/
 * geofence-preview OR the edit form, mutually exclusive) + mesas +
 * lifecycle actions + comanda + operation roadmap, or exactly one of
 * loading / error / unavailable, selected purely from props. Mirrors
 * `EventsContent`'s architecture (`EventDetailPage` is the thin,
 * live-wired layer around it).
 *
 * `comanda`/`edit`/`lifecycle`/`mesas` are each passed as one bundled prop
 * object, not flattened — each is entirely its own section's
 * self-contained state/actions, so it is forwarded to its section
 * unchanged rather than re-declared as many more individual props here.
 *
 * While `edit.isEditing` is true, `EventEditForm` (which mounts its own
 * `EventGeofenceMapPreview`) replaces the read-only Schedule + Logistics +
 * `EventDetailGeofenceSection` sections (the exact fields/visualization it
 * edits) rather than sitting alongside them — showing both at once would
 * let a stale read-only value sit next to the same field mid-edit, AND
 * would mount two `mapbox-gl` instances on the same page at once.
 */
export function EventDetailContent({
  evento,
  isLoading = false,
  errorMessage,
  onRetry,
  comanda,
  edit,
  lifecycle,
  mesas,
}: EventDetailContentProps) {
  if (isLoading) {
    return <EventDetailLoadingState />
  }

  if (errorMessage) {
    return <EventDetailErrorState errorMessage={errorMessage} onRetry={onRetry} />
  }

  if (!evento) {
    return <EventDetailUnavailableState />
  }

  return (
    <div className="flex flex-col gap-6">
      <EventDetailHeader
        evento={evento}
        canEdit={edit.canEdit}
        isEditing={edit.isEditing}
        onToggleEdit={edit.onToggleEdit}
      />

      {edit.isEditing ? (
        <EventEditForm
          evento={evento}
          onSubmit={edit.onSubmit}
          onCancel={edit.onToggleEdit}
          isSubmitting={edit.isSubmitting}
          {...(edit.errorMessage ? { errorMessage: edit.errorMessage } : {})}
        />
      ) : (
        <>
          <EventDetailScheduleSection evento={evento} />
          <EventDetailLogisticsSection evento={evento} />
          <EventDetailGeofenceSection evento={evento} />
        </>
      )}

      <EventDetailMesasSection {...mesas} />

      <EventDetailLifecycleSection
        estado={evento.estado}
        canManage={lifecycle.canManage}
        {...(lifecycle.mesasCount !== undefined
          ? { mesasCount: lifecycle.mesasCount }
          : {})}
        onTransition={lifecycle.onTransition}
        isTransitioning={lifecycle.isTransitioning}
        {...(lifecycle.errorMessage ? { errorMessage: lifecycle.errorMessage } : {})}
      />

      <EventDetailComandaSection {...comanda} />
      <EventDetailRoadmapSection idEvento={evento.idEvento} />
    </div>
  )
}
