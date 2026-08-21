import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AttentionRequestAction } from '@/features/public-diner/components/AttentionRequestAction'

describe('AttentionRequestAction', () => {
  it('renders "Llamar al mesero" as the primary action', () => {
    render(<AttentionRequestAction status="idle" onRequestAttention={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Llamar al mesero' })).toBeInTheDocument()
  })

  it('invokes the callback with the confirmed { tipo: "atencion" } request payload', async () => {
    const user = userEvent.setup()
    const onRequestAttention = vi.fn()
    render(
      <AttentionRequestAction status="idle" onRequestAttention={onRequestAttention} />,
    )

    await user.click(screen.getByRole('button', { name: 'Llamar al mesero' }))

    expect(onRequestAttention).toHaveBeenCalledOnce()
    expect(onRequestAttention).toHaveBeenCalledWith({
      tipo: 'atencion',
    })
  })

  it('renders no "Pedir cuenta" action and no "cuenta" option anywhere', () => {
    render(<AttentionRequestAction status="idle" onRequestAttention={vi.fn()} />)

    expect(
      screen.queryByRole('button', { name: /pedir cuenta/i }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/cuenta/i)).not.toBeInTheDocument()
  })

  it('renders no "Otro" request option', () => {
    render(<AttentionRequestAction status="idle" onRequestAttention={vi.fn()} />)

    expect(screen.queryByRole('button', { name: /otro/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/^otro$/i)).not.toBeInTheDocument()
  })

  it('disables the button while submitting, preventing a repeated request', () => {
    render(<AttentionRequestAction status="submitting" onRequestAttention={vi.fn()} />)

    // The accessible name includes the loading spinner's own "Cargando"
    // label while submitting, so match by role alone — this is the only
    // button this component ever renders.
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('renders safe success feedback without promising an arrival time', () => {
    render(<AttentionRequestAction status="success" onRequestAttention={vi.fn()} />)

    expect(
      screen.getByText('Hemos avisado a tu mesero. En un momento te atenderá.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/minuto|segundo|en camino/i)).not.toBeInTheDocument()
  })

  it('renders throttled feedback using the approved SGEB-4014 copy, never the raw code', () => {
    render(<AttentionRequestAction status="throttled" onRequestAttention={vi.fn()} />)

    expect(
      screen.getByText('Tu mesero ya fue avisado. Dale un momento para atenderte.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('SGEB-4014')).not.toBeInTheDocument()
  })

  it('renders the supplied error message without exposing technical detail', () => {
    render(
      <AttentionRequestAction
        status="error"
        message="No pudimos enviar tu solicitud."
        onRequestAttention={vi.fn()}
      />,
    )

    expect(screen.getByText('No pudimos enviar tu solicitud.')).toBeInTheDocument()
    expect(screen.queryByText(/technical_message/i)).not.toBeInTheDocument()
  })

  it('renders genuinely disabled with a pending explanation when onRequestAttention is not supplied', () => {
    render(<AttentionRequestAction status="idle" />)

    const button = screen.getByRole('button', { name: 'Llamar al mesero' })
    expect(button).toBeDisabled()
    expect(
      screen.getByText('La solicitud de atención todavía no está disponible.'),
    ).toBeInTheDocument()
  })
})
