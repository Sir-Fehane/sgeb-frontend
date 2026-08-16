import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  EventClosureFinalizeSection,
  type EventClosureFinalizeSectionProps,
} from '@/features/events/closure/components/EventClosureFinalizeSection'

function renderSection(props: Partial<EventClosureFinalizeSectionProps> = {}) {
  return render(
    <EventClosureFinalizeSection
      estado="en_curso"
      canFinalize={true}
      onFinalize={vi.fn()}
      {...props}
    />,
  )
}

describe('EventClosureFinalizeSection — availability by estado', () => {
  it('offers "Finalizar evento" when en_curso and the role can finalize', () => {
    renderSection({ estado: 'en_curso', canFinalize: true })

    expect(screen.getByRole('button', { name: 'Finalizar evento' })).toBeInTheDocument()
  })

  it('renders a read-only completed state when finalizado, with no actionable button', () => {
    renderSection({ estado: 'finalizado', canFinalize: true })

    expect(screen.getByText('Este evento ya fue finalizado.')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Finalizar evento' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Confirmar finalización' }),
    ).not.toBeInTheDocument()
  })

  it.each(['borrador', 'publicado', 'cancelado'] as const)(
    'renders nothing for %s (never offers an invalid action)',
    (estado) => {
      const { container } = renderSection({ estado, canFinalize: true })

      expect(container).toBeEmptyDOMElement()
    },
  )

  it('renders nothing when en_curso but the role cannot finalize (hidden, not disabled)', () => {
    const { container } = renderSection({ estado: 'en_curso', canFinalize: false })

    expect(container).toBeEmptyDOMElement()
    expect(
      screen.queryByRole('button', { name: 'Finalizar evento' }),
    ).not.toBeInTheDocument()
  })
})

describe('EventClosureFinalizeSection — confirmation flow', () => {
  it('does not call onFinalize merely by clicking "Finalizar evento"', async () => {
    const user = userEvent.setup()
    const onFinalize = vi.fn()
    renderSection({ onFinalize })

    await user.click(screen.getByRole('button', { name: 'Finalizar evento' }))

    expect(onFinalize).not.toHaveBeenCalled()
    expect(screen.getByText(/no se puede deshacer/i)).toBeInTheDocument()
  })

  it('communicates the transition to finalizado and its irreversibility', async () => {
    const user = userEvent.setup()
    renderSection()

    await user.click(screen.getByRole('button', { name: 'Finalizar evento' }))

    expect(screen.getByText(/finalizado/)).toBeInTheDocument()
    expect(screen.getByText(/no permite reabrir ni revertir/i)).toBeInTheDocument()
  })

  it('cancel closes the confirmation without ever calling onFinalize', async () => {
    const user = userEvent.setup()
    const onFinalize = vi.fn()
    renderSection({ onFinalize })

    await user.click(screen.getByRole('button', { name: 'Finalizar evento' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onFinalize).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Finalizar evento' })).toBeInTheDocument()
  })

  it('confirm sends exactly one call to onFinalize', async () => {
    const user = userEvent.setup()
    const onFinalize = vi.fn()
    renderSection({ onFinalize })

    await user.click(screen.getByRole('button', { name: 'Finalizar evento' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar finalización' }))

    expect(onFinalize).toHaveBeenCalledTimes(1)
  })

  it('disables confirm/cancel while isFinalizing is true, preventing a duplicate submit', async () => {
    const user = userEvent.setup()
    const onFinalize = vi.fn()
    const { rerender } = renderSection({ onFinalize })

    await user.click(screen.getByRole('button', { name: 'Finalizar evento' }))
    rerender(
      <EventClosureFinalizeSection
        estado="en_curso"
        canFinalize={true}
        onFinalize={onFinalize}
        isFinalizing={true}
      />,
    )

    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Confirmar finalización/ })).toBeDisabled()
  })
})

describe('EventClosureFinalizeSection — error handling', () => {
  it('shows a safe error message inline, never technical_message', () => {
    renderSection({ errorMessage: 'Esta acción no está permitida en el estado actual.' })

    expect(
      screen.getByText('Esta acción no está permitida en el estado actual.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/technical_message/)).not.toBeInTheDocument()
  })

  it('renders no error alert when errorMessage is absent', () => {
    renderSection()

    expect(screen.queryByText('No se pudo finalizar el evento')).not.toBeInTheDocument()
  })
})

describe('EventClosureFinalizeSection — domain boundaries', () => {
  it('never exposes participant-salida, payment, comanda, or montage controls', () => {
    renderSection({ estado: 'finalizado' })

    for (const forbidden of [
      /Marcar salida/i,
      /Calcular pagos/i,
      /Marcar pagado/i,
      /Comanda/i,
      /Montaje/i,
    ]) {
      expect(screen.queryByText(forbidden)).not.toBeInTheDocument()
    }
  })
})
