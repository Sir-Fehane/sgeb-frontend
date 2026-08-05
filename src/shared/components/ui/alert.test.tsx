import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Alert } from '@/shared/components/ui/alert'

describe('Alert', () => {
  it('uses an assertive "alert" role for a danger tone', () => {
    render(
      <Alert tone="danger" title="No se pudo completar">
        Ocurrió un problema. Intenta de nuevo.
      </Alert>,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('No se pudo completar')
    expect(alert).toHaveTextContent('Ocurrió un problema. Intenta de nuevo.')
  })

  it('uses a polite "status" role for a success tone', () => {
    render(
      <Alert tone="success" title="Operación exitosa">
        El registro se guardó correctamente.
      </Alert>,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Operación exitosa')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('defaults a warning tone to the polite "status" role, not "alert"', () => {
    render(
      <Alert tone="warning" title="Revisión pendiente">
        Hay elementos en espera de confirmación.
      </Alert>,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Revisión pendiente')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('lets a warning opt into an assertive "alert" role via `assertive`', () => {
    render(
      <Alert tone="warning" assertive title="Acción requerida de inmediato">
        Esto es urgente.
      </Alert>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Acción requerida de inmediato')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
