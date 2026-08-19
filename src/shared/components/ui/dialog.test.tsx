import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Dialog } from '@/shared/components/ui/dialog'

function OutsideButton() {
  return <button type="button">outside button</button>
}

function OpenableDialog() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
        }}
      >
        abrir
      </button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false)
        }}
        title="Crear salón"
      >
        <p>contenido</p>
      </Dialog>
    </>
  )
}

describe('Dialog', () => {
  it('renders nothing when closed', () => {
    render(
      <Dialog open={false} onClose={vi.fn()} title="Título">
        <p>contenido</p>
      </Dialog>,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders an accessible dialog with title, description and content when open', () => {
    render(
      <Dialog
        open
        onClose={vi.fn()}
        title="Crear salón"
        description="Descripción del diálogo"
      >
        <p>contenido del formulario</p>
      </Dialog>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Crear salón' })
    expect(dialog).toHaveAccessibleDescription('Descripción del diálogo')
    expect(screen.getByText('contenido del formulario')).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose} title="Crear salón">
        <p>contenido</p>
      </Dialog>,
    )

    await user.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose on Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose} title="Crear salón">
        <p>contenido</p>
      </Dialog>,
    )

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose} title="Crear salón">
        <p>contenido</p>
      </Dialog>,
    )

    await user.click(screen.getByTestId('dialog-backdrop'))

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('makes the rest of the page inert while open, and restores it on close', () => {
    render(<OutsideButton />)
    const outsideButton = screen.getByRole('button', { name: 'outside button' })

    const { rerender } = render(
      <Dialog open={false} onClose={vi.fn()} title="Crear salón">
        <p>contenido</p>
      </Dialog>,
    )
    expect(outsideButton.closest('[inert]')).toBeNull()

    rerender(
      <Dialog open onClose={vi.fn()} title="Crear salón">
        <p>contenido</p>
      </Dialog>,
    )
    expect(outsideButton.closest('[inert]')).not.toBeNull()

    rerender(
      <Dialog open={false} onClose={vi.fn()} title="Crear salón">
        <p>contenido</p>
      </Dialog>,
    )
    expect(outsideButton.closest('[inert]')).toBeNull()
  })

  it('moves focus into the dialog on open and restores it on close', async () => {
    const user = userEvent.setup()
    render(<OpenableDialog />)
    const openButton = screen.getByRole('button', { name: 'abrir' })
    openButton.focus()

    await user.click(openButton)
    expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(openButton).toHaveFocus()
  })
})
