import { useState } from 'react'

import { EventCreateForm } from '@/features/events/components/EventCreateForm'
import { SALON_OPTIONS_FIXTURE } from '@/features/events/fixtures/eventFixtures'
import type { EventCreateFieldPrototypeValues } from '@/features/events/schemas/eventCreateSchema'
import { Alert } from '@/shared/components'

/**
 * NOT registered in `routes.ts` and not intended to be — this is a
 * field-validation prototype for a subset of `EventoCrear`, not the
 * approved "Crear evento" creation workflow. The documented wireframe
 * (W-03) is a five-step wizard whose exact step boundaries could not be
 * verified this session (no image rendering available for
 * docs/design/Diseño Web.pdf); presenting this single-page composition
 * as the final flow would misrepresent it as approved. This page exists
 * so the field-level validation work stays reviewable/testable, ready
 * to be split into the documented steps once they're confirmed.
 */
export function EventCreateFieldPrototypePage() {
  const [validated, setValidated] = useState(false)

  function handleSubmit(_values: EventCreateFieldPrototypeValues) {
    // Demonstrates successful LOCAL validation only — no request is
    // sent, and no event is created or persisted anywhere.
    setValidated(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <Alert tone="warning" title="Prototipo de campos y validaciones">
        El flujo definitivo será un wizard de cinco pasos pendiente de validar contra el
        wireframe.
      </Alert>

      {validated ? (
        <Alert tone="success" title="Validación local exitosa">
          Los valores ingresados cumplen las reglas de validación locales. Esto no crea ni
          persiste ningún evento.
        </Alert>
      ) : null}

      <EventCreateForm onSubmit={handleSubmit} salones={SALON_OPTIONS_FIXTURE} />
    </div>
  )
}
