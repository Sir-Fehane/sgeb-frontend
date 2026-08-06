import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RatingForm } from '@/features/public-diner/components/RatingForm'

describe('RatingForm', () => {
  it('requires a score before submission', async () => {
    const user = userEvent.setup()
    const onSubmitRating = vi.fn()
    render(<RatingForm status="idle" onSubmitRating={onSubmitRating} />)

    await user.click(screen.getByRole('button', { name: 'Enviar calificación' }))

    expect(await screen.findAllByRole('alert')).not.toHaveLength(0)
    expect(onSubmitRating).not.toHaveBeenCalled()
  })

  it('renders exactly 5 selectable score values with radiogroup semantics', () => {
    render(<RatingForm status="idle" onSubmitRating={vi.fn()} />)

    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(5)
  })

  it('gives 1 and 5 their documented extreme labels, and keeps 2-4 neutral', () => {
    render(<RatingForm status="idle" onSubmitRating={vi.fn()} />)

    expect(screen.getByRole('radio', { name: '1 de 5 — Pésimo' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '5 de 5 — Excelente' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '2 de 5' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '3 de 5' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '4 de 5' })).toBeInTheDocument()
  })

  it('is keyboard operable — the labeled radio can be selected without a mouse', async () => {
    const user = userEvent.setup()
    render(<RatingForm status="idle" onSubmitRating={vi.fn()} />)

    const fiveStars = screen.getByRole('radio', { name: '5 de 5 — Excelente' })
    fiveStars.focus()
    await user.keyboard(' ')

    expect(fiveStars).toBeChecked()
  })

  it('invokes the callback with only puntuacion and comentario — never tokenComensal', async () => {
    const user = userEvent.setup()
    const onSubmitRating = vi.fn()
    render(<RatingForm status="idle" onSubmitRating={onSubmitRating} />)

    await user.click(screen.getByRole('radio', { name: '4 de 5' }))
    await user.click(screen.getByRole('button', { name: 'Enviar calificación' }))

    expect(onSubmitRating).toHaveBeenCalledOnce()
    const [values] = onSubmitRating.mock.calls[0] as [Record<string, unknown>]
    expect(values).toEqual({ puntuacion: 4, comentario: undefined })
    expect(values).not.toHaveProperty('tokenComensal')
    expect(values).not.toHaveProperty('token_comensal')
  })

  it('accepts an empty optional comment', async () => {
    const user = userEvent.setup()
    const onSubmitRating = vi.fn()
    render(<RatingForm status="idle" onSubmitRating={onSubmitRating} />)

    await user.click(screen.getByRole('radio', { name: '3 de 5' }))
    await user.click(screen.getByRole('button', { name: 'Enviar calificación' }))

    expect(onSubmitRating).toHaveBeenCalledWith({ puntuacion: 3, comentario: undefined })
  })

  it('accepts a comment of exactly 255 characters', async () => {
    const user = userEvent.setup()
    const onSubmitRating = vi.fn()
    render(<RatingForm status="idle" onSubmitRating={onSubmitRating} />)

    const comentario = 'a'.repeat(255)
    await user.click(screen.getByRole('radio', { name: '5 de 5 — Excelente' }))
    await user.click(screen.getByLabelText('Comentario (opcional)'))
    await user.paste(comentario)
    await user.click(screen.getByRole('button', { name: 'Enviar calificación' }))

    expect(onSubmitRating).toHaveBeenCalledWith({ puntuacion: 5, comentario })
  })

  it('prevents typing more than 255 characters via the maxLength attribute', () => {
    render(<RatingForm status="idle" onSubmitRating={vi.fn()} />)

    expect(screen.getByLabelText('Comentario (opcional)')).toHaveAttribute(
      'maxLength',
      '255',
    )
  })

  it('shows a thank-you message and no active submit action on success', () => {
    render(<RatingForm status="success" onSubmitRating={vi.fn()} />)

    expect(screen.getByText('¡Gracias por tu calificación!')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Enviar calificación' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })

  it('shows an already-submitted message and no form when already-submitted', () => {
    render(<RatingForm status="already-submitted" onSubmitRating={vi.fn()} />)

    expect(
      screen.getByText('Ya registraste tu calificación para esta mesa. ¡Gracias!'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Enviar calificación' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('SGEB-4010')).not.toBeInTheDocument()
  })

  it('shows the supplied error message without exposing technical detail', () => {
    render(
      <RatingForm
        status="error"
        message="No pudimos registrar tu calificación."
        onSubmitRating={vi.fn()}
      />,
    )

    expect(screen.getByText('No pudimos registrar tu calificación.')).toBeInTheDocument()
    expect(screen.queryByText(/technical_message/i)).not.toBeInTheDocument()
  })

  it('disables the submit action while submitting', () => {
    render(<RatingForm status="submitting" onSubmitRating={vi.fn()} />)

    // The accessible name includes the loading spinner's own "Cargando"
    // label while submitting, so match by role alone — this is the only
    // button this form renders.
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('renders no name, email, or phone field', () => {
    render(<RatingForm status="idle" onSubmitRating={vi.fn()} />)

    expect(screen.queryByLabelText(/nombre/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/correo|email/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/teléfono|phone/i)).not.toBeInTheDocument()
  })

  it('renders the submit action genuinely disabled when onSubmitRating is not supplied', () => {
    render(<RatingForm status="idle" />)

    expect(screen.getByRole('button', { name: 'Enviar calificación' })).toBeDisabled()
  })
})
