import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Button, type ButtonProps } from '@/shared/components/ui/button'

describe('Button', () => {
  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(<Button onClick={onClick}>Guardar</Button>)
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(
      <Button disabled onClick={onClick}>
        Guardar
      </Button>,
    )
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(onClick).not.toHaveBeenCalled()
  })

  it('shows a spinner, marks itself busy, and blocks clicks while loading', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(
      <Button loading onClick={onClick}>
        Guardar
      </Button>,
    )
    // The spinner's own accessible label changes the button's computed
    // name while loading, so match by role only here.
    const button = screen.getByRole('button')

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toBeInTheDocument()

    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('darkens the primary variant on hover via a brightness filter, never an opacity blend that would lighten it against the page background', () => {
    render(<Button>Guardar</Button>)

    const button = screen.getByRole('button', { name: 'Guardar' })
    expect(button.className).toContain('hover:brightness-90')
    expect(button.className).not.toContain('hover:bg-primary/90')
  })

  it('renders asChild normally, styling the single child element', () => {
    render(
      <Button asChild>
        <a href="/destino">Ir</a>
      </Button>,
    )

    const link = screen.getByRole('link', { name: 'Ir' })
    expect(link).toHaveAttribute('href', '/destino')
    expect(link.className).toContain('bg-primary')
  })

  it('never forwards disabled/loading onto an asChild link, and warns in dev', async () => {
    // `disabled`/`loading` combined with `asChild` is a compile-time type
    // error by design (see the comment on `Button`). This simulates a
    // consumer bypassing that contract at runtime (e.g. via a cast or
    // plain-JS usage) to verify the defensive backstop still holds: the
    // child must never receive `disabled`, and a click must still work
    // like a normal, unblocked link.
    const user = userEvent.setup()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const onClick = vi.fn()

    const unsafeProps = {
      asChild: true,
      disabled: true,
      loading: true,
      onClick,
      children: <a href="/destino">Ir</a>,
    } as unknown as ButtonProps

    render(createElement(Button, unsafeProps))

    const link = screen.getByRole('link', { name: 'Ir' })
    expect(link).not.toHaveAttribute('disabled')
    expect(link).not.toHaveAttribute('aria-busy')
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('asChild'))

    await user.click(link)
    expect(onClick).toHaveBeenCalledOnce()

    consoleError.mockRestore()
  })
})
