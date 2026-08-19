import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EventCreateSalonDialog } from '@/features/events/components/EventCreateSalonDialog'

vi.mock('@/features/events/components/SalonLocationPicker', () => ({
  SalonLocationPicker: () => <div data-testid="salon-location-picker-stub" />,
}))

describe('EventCreateSalonDialog', () => {
  it('renders nothing when closed', () => {
    render(<EventCreateSalonDialog open={false} onSubmit={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the Salón form inside an accessible dialog when open', () => {
    render(<EventCreateSalonDialog open onSubmit={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByRole('dialog', { name: 'Crear salón' })).toBeInTheDocument()
    expect(screen.getByLabelText(/^Nombre/)).toBeInTheDocument()
    expect(screen.getByTestId('salon-location-picker-stub')).toBeInTheDocument()
  })

  it('calls onCancel when the dialog is closed', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<EventCreateSalonDialog open onSubmit={vi.fn()} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('forwards isSubmitting/errorMessage to the underlying form', () => {
    render(
      <EventCreateSalonDialog
        open
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isSubmitting
        errorMessage="No se pudo crear."
      />,
    )

    expect(screen.getByText('No se pudo crear.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Crear salón/ })).toBeDisabled()
  })
})
