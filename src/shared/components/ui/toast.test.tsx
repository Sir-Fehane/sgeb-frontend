import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Toast } from '@/shared/components/ui/toast'

describe('Toast — structure and positioning', () => {
  it('is fixed to the viewport, anchored upper-right on wider screens, full-width with side margins on narrow ones', () => {
    render(
      <Toast title="Título" onDismiss={vi.fn()}>
        Cuerpo.
      </Toast>,
    )

    const status = screen.getByRole('status')
    const fixedContainer = status.closest('.fixed')
    expect(fixedContainer).not.toBeNull()
    expect(fixedContainer).toHaveClass('fixed', 'z-50')
    // Mobile: margins on both sides (`inset-x-4`), no horizontal overflow.
    expect(fixedContainer).toHaveClass('inset-x-4')
    // Desktop/tablet: anchored to the right edge with a fixed width instead.
    expect(fixedContainer).toHaveClass('sm:right-4', 'sm:left-auto', 'sm:w-96')
  })

  it('uses a polite, non-interrupting status role by default (success tone) — never role="alert"', () => {
    render(
      <Toast title="Salón creado" onDismiss={vi.fn()}>
        Cuerpo.
      </Toast>,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Salón creado')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('never moves focus on mount (does not steal keyboard focus)', () => {
    const before = document.activeElement
    render(
      <Toast title="Título" onDismiss={vi.fn()}>
        Cuerpo.
      </Toast>,
    )

    expect(document.activeElement).toBe(before)
  })

  it('respects prefers-reduced-motion by disabling its entrance animation classes', () => {
    render(
      <Toast title="Título" onDismiss={vi.fn()}>
        Cuerpo.
      </Toast>,
    )

    const animatedWrapper = screen.getByRole('status').parentElement
    expect(animatedWrapper).toHaveClass('motion-reduce:animate-none')
  })

  it('paints an opaque backdrop directly behind the alert surface, so arbitrary page content behind this fixed overlay cannot bleed through its soft tone tint', () => {
    render(
      <Toast title="Título" onDismiss={vi.fn()}>
        Cuerpo.
      </Toast>,
    )

    // `Alert`'s own tone background (`bg-success/10`, unchanged — correct
    // for its normal inline usage) sits on TOP of this opaque `bg-card`
    // wrapper, the same solid surface token `Card` uses elsewhere. Asserted
    // on the wrapper directly around the status region, not `Alert`
    // itself — `Alert`'s own styling/tests stay untouched.
    const backdrop = screen.getByRole('status').parentElement
    expect(backdrop).toHaveClass('bg-card')
  })
})

describe('Toast — dismissal', () => {
  it('provides an accessibly-labeled manual dismiss control that calls onDismiss', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(
      <Toast title="Título" onDismiss={onDismiss}>
        Cuerpo.
      </Toast>,
    )

    await user.click(screen.getByRole('button', { name: 'Cerrar notificación' }))

    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('auto-dismisses after the default ~4.5s delay', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    try {
      render(
        <Toast title="Título" onDismiss={onDismiss}>
          Cuerpo.
        </Toast>,
      )

      expect(onDismiss).not.toHaveBeenCalled()
      vi.advanceTimersByTime(4500)
      expect(onDismiss).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not auto-dismiss before the delay elapses', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    try {
      render(
        <Toast title="Título" onDismiss={onDismiss}>
          Cuerpo.
        </Toast>,
      )

      vi.advanceTimersByTime(4000)
      expect(onDismiss).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('never auto-dismisses when autoDismissMs is null (manual dismiss only)', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    try {
      render(
        <Toast title="Título" onDismiss={onDismiss} autoDismissMs={null}>
          Cuerpo.
        </Toast>,
      )

      vi.advanceTimersByTime(60_000)
      expect(onDismiss).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('clears its auto-dismiss timer on unmount, so a stale onDismiss never fires afterward', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    try {
      const { unmount } = render(
        <Toast title="Título" onDismiss={onDismiss}>
          Cuerpo.
        </Toast>,
      )
      unmount()

      vi.advanceTimersByTime(10_000)
      expect(onDismiss).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('Toast — icon/tone conventions', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the established success icon (IconCheck) for the default success tone', () => {
    render(
      <Toast title="Título" onDismiss={vi.fn()}>
        Cuerpo.
      </Toast>,
    )

    // `Alert` renders the icon inside an aria-hidden span — assert via the
    // Tabler icon's own class rather than any role/label (it is decorative).
    const status = screen.getByRole('status')
    expect(status.querySelector('svg.tabler-icon-check')).not.toBeNull()
  })

  it('shows the established dismiss icon (IconX) inside the manual dismiss control', () => {
    render(
      <Toast title="Título" onDismiss={vi.fn()}>
        Cuerpo.
      </Toast>,
    )

    const dismissButton = screen.getByRole('button', { name: 'Cerrar notificación' })
    expect(dismissButton.querySelector('svg.tabler-icon-x')).not.toBeNull()
  })
})
