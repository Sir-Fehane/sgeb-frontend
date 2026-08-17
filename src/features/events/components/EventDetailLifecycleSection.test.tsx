import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EventDetailLifecycleSection } from '@/features/events/components/EventDetailLifecycleSection'

describe('EventDetailLifecycleSection', () => {
  it('renders nothing for a non-managing session, regardless of estado', () => {
    const { container } = render(
      <EventDetailLifecycleSection
        estado="borrador"
        canManage={false}
        onTransition={vi.fn()}
        isTransitioning={false}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for finalizado — terminal, no actions, and never a duplicate "Finalizar evento" button', () => {
    render(
      <EventDetailLifecycleSection
        estado="finalizado"
        canManage
        onTransition={vi.fn()}
        isTransitioning={false}
      />,
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText(/Finalizar evento/)).not.toBeInTheDocument()
  })

  it('renders nothing for cancelado — terminal, no actions', () => {
    render(
      <EventDetailLifecycleSection
        estado="cancelado"
        canManage
        onTransition={vi.fn()}
        isTransitioning={false}
      />,
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('borrador offers Publicar and Cancelar only', () => {
    render(
      <EventDetailLifecycleSection
        estado="borrador"
        canManage
        onTransition={vi.fn()}
        isTransitioning={false}
      />,
    )
    expect(screen.getByRole('button', { name: 'Publicar evento' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar evento' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Iniciar evento' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Volver a borrador' }),
    ).not.toBeInTheDocument()
  })

  it('shows the mesas hint only in borrador with a real mesasCount of 0', () => {
    const { rerender } = render(
      <EventDetailLifecycleSection
        estado="borrador"
        canManage
        mesasCount={0}
        onTransition={vi.fn()}
        isTransitioning={false}
      />,
    )
    expect(screen.getByText(/Agrega al menos una mesa/)).toBeInTheDocument()

    rerender(
      <EventDetailLifecycleSection
        estado="borrador"
        canManage
        mesasCount={2}
        onTransition={vi.fn()}
        isTransitioning={false}
      />,
    )
    expect(screen.queryByText(/Agrega al menos una mesa/)).not.toBeInTheDocument()
  })

  it('clicking Publicar calls onTransition("publicado") immediately, no confirmation', async () => {
    const user = userEvent.setup()
    const onTransition = vi.fn()
    render(
      <EventDetailLifecycleSection
        estado="borrador"
        canManage
        onTransition={onTransition}
        isTransitioning={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Publicar evento' }))

    expect(onTransition).toHaveBeenCalledWith('publicado')
  })

  it('publicado offers Iniciar, Volver a borrador, and Cancelar', () => {
    render(
      <EventDetailLifecycleSection
        estado="publicado"
        canManage
        onTransition={vi.fn()}
        isTransitioning={false}
      />,
    )
    expect(screen.getByRole('button', { name: 'Iniciar evento' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Volver a borrador' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar evento' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Publicar evento' }),
    ).not.toBeInTheDocument()
  })

  it('clicking Volver a borrador calls onTransition("borrador") immediately', async () => {
    const user = userEvent.setup()
    const onTransition = vi.fn()
    render(
      <EventDetailLifecycleSection
        estado="publicado"
        canManage
        onTransition={onTransition}
        isTransitioning={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Volver a borrador' }))

    expect(onTransition).toHaveBeenCalledWith('borrador')
  })

  it('en_curso offers only Cancelar, plus a note that finalization lives in Closure', () => {
    render(
      <EventDetailLifecycleSection
        estado="en_curso"
        canManage
        onTransition={vi.fn()}
        isTransitioning={false}
      />,
    )
    expect(screen.getByRole('button', { name: 'Cancelar evento' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Iniciar evento' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Publicar evento' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/se realiza desde su Cierre/)).toBeInTheDocument()
  })

  it('Cancelar requires confirmation before calling onTransition("cancelado")', async () => {
    const user = userEvent.setup()
    const onTransition = vi.fn()
    render(
      <EventDetailLifecycleSection
        estado="borrador"
        canManage
        onTransition={onTransition}
        isTransitioning={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Cancelar evento' }))
    expect(onTransition).not.toHaveBeenCalled()
    expect(screen.getByText(/no se puede deshacer/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirmar cancelación' }))
    expect(onTransition).toHaveBeenCalledWith('cancelado')
  })

  it('"Volver" dismisses the cancel confirmation without transitioning', async () => {
    const user = userEvent.setup()
    const onTransition = vi.fn()
    render(
      <EventDetailLifecycleSection
        estado="borrador"
        canManage
        onTransition={onTransition}
        isTransitioning={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Cancelar evento' }))
    await user.click(screen.getByRole('button', { name: 'Volver' }))

    expect(onTransition).not.toHaveBeenCalled()
    expect(screen.queryByText(/no se puede deshacer/)).not.toBeInTheDocument()
  })

  it('shows the given safe error message', () => {
    render(
      <EventDetailLifecycleSection
        estado="borrador"
        canManage
        onTransition={vi.fn()}
        isTransitioning={false}
        errorMessage="Este evento no tiene mesas registradas."
      />,
    )
    expect(
      screen.getByText('Este evento no tiene mesas registradas.'),
    ).toBeInTheDocument()
  })
})
