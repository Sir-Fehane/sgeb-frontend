import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest'

import {
  EventDetailComandaSection,
  type EventDetailComandaSectionProps,
} from '@/features/events/components/EventDetailComandaSection'
import type { ComandaMetadataViewModel } from '@/features/events/types/comanda'
import { SgebApplicationError } from '@/shared/api/sgebApiError'

const COMANDA: ComandaMetadataViewModel = {
  idComanda: 7,
  nombreOriginal: 'XV de María.pdf',
  tipoMime: 'application/pdf',
  tamanoBytes: 512_000,
  activo: true,
  creadoEn: '2026-09-01T10:00:00Z',
}

function baseProps(
  overrides: Partial<EventDetailComandaSectionProps> = {},
): EventDetailComandaSectionProps {
  return {
    idEvento: 1001,
    comanda: null,
    isLoading: false,
    canManage: false,
    onOpen: vi.fn().mockResolvedValue(undefined),
    onUpload: vi.fn().mockResolvedValue(undefined),
    onRetire: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function pdfFile(name = 'comanda.pdf', sizeBytes = 1024) {
  return new File([new Uint8Array(sizeBytes)], name, { type: 'application/pdf' })
}

/** A minimal fake `Window` — enough to prove this component's own orchestration (open synchronously, pass the reference on, sever opener), never a claim about real popup-blocking policy. */
function fakeTab() {
  return { closed: false, opener: {}, location: { href: '' }, close: vi.fn() }
}

let windowOpenSpy: MockInstance<typeof window.open>

beforeEach(() => {
  windowOpenSpy = vi
    .spyOn(window, 'open')
    .mockImplementation(() => fakeTab() as unknown as Window)
})

afterEach(() => {
  windowOpenSpy.mockRestore()
})

describe('EventDetailComandaSection — loading / error', () => {
  it('shows a loading indicator and nothing else while isLoading', () => {
    render(<EventDetailComandaSection {...baseProps({ isLoading: true })} />)

    expect(screen.getByText('Cargando comanda…')).toBeInTheDocument()
    expect(screen.queryByText(/No hay una comanda/)).not.toBeInTheDocument()
  })

  it('shows a safe error message and never renders technical_message', () => {
    render(
      <EventDetailComandaSection
        {...baseProps({ errorMessage: 'No pudimos comunicarnos con el servidor.' })}
      />,
    )

    expect(
      screen.getByText('No pudimos comunicarnos con el servidor.'),
    ).toBeInTheDocument()
    expect(document.body.textContent ?? '').not.toMatch(/technical_message/i)
  })
})

describe('EventDetailComandaSection — empty state', () => {
  it('shows the honest empty state text when there is no active comanda', () => {
    render(<EventDetailComandaSection {...baseProps()} />)

    expect(
      screen.getByText('No hay una comanda disponible para este evento.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Abrir comanda/ }),
    ).not.toBeInTheDocument()
  })

  it('hides the upload control entirely when canManage is false', () => {
    render(<EventDetailComandaSection {...baseProps({ canManage: false })} />)

    expect(screen.queryByLabelText('Subir comanda')).not.toBeInTheDocument()
  })

  it('shows the upload control when canManage is true', () => {
    render(<EventDetailComandaSection {...baseProps({ canManage: true })} />)

    expect(screen.getByLabelText('Subir comanda')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subir comanda' })).toBeInTheDocument()
  })
})

describe('EventDetailComandaSection — active comanda metadata', () => {
  it('renders the stable metadata fields, never a raw storage key or any href/src for the comanda file', () => {
    render(<EventDetailComandaSection {...baseProps({ comanda: COMANDA })} />)

    expect(screen.getByText('XV de María.pdf')).toBeInTheDocument()
    expect(screen.getByText(/PDF/)).toBeInTheDocument()
    expect(screen.getByText(/500 KB/)).toBeInTheDocument()
    // "Abrir comanda" is a plain action button, never an <a href>/<img src> —
    // there is structurally no way for this section to leak a storage key
    // or a stale signed URL into the DOM as a navigable attribute.
    const openButton = screen.getByRole('button', { name: /Abrir comanda/ })
    expect(openButton).not.toHaveAttribute('href')
    expect(document.querySelectorAll('a[href]')).toHaveLength(0)
  })

  it('never renders history or restore controls', () => {
    render(
      <EventDetailComandaSection {...baseProps({ comanda: COMANDA, canManage: true })} />,
    )

    expect(screen.queryByText(/historial/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/restaurar/i)).not.toBeInTheDocument()
  })

  it('labels the upload control "Reemplazar comanda" once one already exists', () => {
    render(
      <EventDetailComandaSection {...baseProps({ comanda: COMANDA, canManage: true })} />,
    )

    expect(screen.getByLabelText('Reemplazar comanda')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reemplazar comanda' })).toBeInTheDocument()
  })
})

describe('EventDetailComandaSection — open action (popup-blocking safety)', () => {
  it('opens a blank tab SYNCHRONOUSLY before onOpen is ever called, and passes that tab through', async () => {
    const user = userEvent.setup()
    const callOrder: string[] = []
    windowOpenSpy.mockImplementation(() => {
      callOrder.push('window.open')
      return fakeTab() as unknown as Window
    })
    const onOpen = vi.fn().mockImplementation(() => {
      callOrder.push('onOpen')
      return Promise.resolve()
    })
    render(<EventDetailComandaSection {...baseProps({ comanda: COMANDA, onOpen })} />)

    await user.click(screen.getByRole('button', { name: /Abrir comanda/ }))

    // window.open ran before onOpen's async body ever started — proving
    // the tab is opened as part of the synchronous click handler, not
    // after any await.
    expect(callOrder).toEqual(['window.open', 'onOpen'])
    expect(windowOpenSpy).toHaveBeenCalledWith('', '_blank')
    expect(onOpen).toHaveBeenCalledOnce()
    expect(onOpen.mock.calls[0]![0]).toBeInstanceOf(AbortSignal)
    expect(onOpen.mock.calls[0]![1]).toMatchObject({ closed: false })
  })

  it('severs the opener reference on the newly-opened tab (reverse-tabnabbing protection), without using the noopener flag that would null the reference', async () => {
    const user = userEvent.setup()
    const tab = fakeTab()
    windowOpenSpy.mockReturnValue(tab as unknown as Window)
    render(<EventDetailComandaSection {...baseProps({ comanda: COMANDA })} />)

    await user.click(screen.getByRole('button', { name: /Abrir comanda/ }))

    // window.open itself is called WITHOUT 'noopener'/'noreferrer' in the
    // features string — those flags make window.open return null, which
    // would make navigating the tab later impossible.
    expect(windowOpenSpy.mock.calls[0]).toEqual(['', '_blank'])
    // The opener link is severed by this component instead, immediately
    // after opening.
    expect(tab.opener).toBeNull()
  })

  it('shows a safe error message when onOpen rejects', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn().mockRejectedValue(
      new SgebApplicationError(403, {
        code: 'SGEB-1004',
        message: 'No tienes permisos.',
      }),
    )
    render(<EventDetailComandaSection {...baseProps({ comanda: COMANDA, onOpen })} />)

    await user.click(screen.getByRole('button', { name: /Abrir comanda/ }))

    await waitFor(() =>
      expect(screen.getByText('No tienes permisos.')).toBeInTheDocument(),
    )
  })

  it('disables the button (real duplicate-click protection) while a click is still pending, so a second click during that window never opens a second tab', async () => {
    const user = userEvent.setup()
    let resolveFirst!: () => void
    const onOpen = vi
      .fn()
      .mockImplementationOnce(
        () => new Promise<void>((resolve) => (resolveFirst = resolve)),
      )
    render(<EventDetailComandaSection {...baseProps({ comanda: COMANDA, onOpen })} />)

    const button = screen.getByRole('button', { name: /Abrir comanda/ })
    await user.click(button)
    expect(button).toBeDisabled()

    // A disabled native button never dispatches a click — userEvent
    // respects that, so this is a no-op, not a second real attempt.
    await user.click(button)
    expect(windowOpenSpy).toHaveBeenCalledOnce()
    expect(onOpen).toHaveBeenCalledOnce()

    resolveFirst()
    await waitFor(() => expect(button).not.toBeDisabled())
  })

  it('does not open a second tab for the local/dev binary fallback path — same tab, one window.open call per click', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn().mockResolvedValue(undefined)
    render(<EventDetailComandaSection {...baseProps({ comanda: COMANDA, onOpen })} />)

    await user.click(screen.getByRole('button', { name: /Abrir comanda/ }))

    expect(windowOpenSpy).toHaveBeenCalledOnce()
  })
})

describe('EventDetailComandaSection — upload', () => {
  it('prevalidates an unsupported MIME type and disables submit', () => {
    render(<EventDetailComandaSection {...baseProps({ canManage: true })} />)

    const input = screen.getByLabelText('Subir comanda')
    const file = new File(['x'], 'comanda.zip', { type: 'application/zip' })
    // `userEvent.upload` itself enforces the input's own `accept`
    // attribute and silently refuses a non-matching file before it ever
    // reaches this component — real, useful browser-level behavior, but
    // it means it can't exercise this component's OWN prevalidation logic
    // for the rejected-type case. `fireEvent.change` sets the file
    // directly, bypassing that browser-level gate, the same precedent
    // `EventCreateForm.test.tsx` already established for its
    // `maxLength`-bypassing Zod defense-in-depth test.
    fireEvent.change(input, { target: { files: [file] } })

    expect(screen.getByText(/Formato no permitido/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subir comanda' })).toBeDisabled()
  })

  it('prevalidates an oversized file and disables submit', async () => {
    const user = userEvent.setup()
    render(<EventDetailComandaSection {...baseProps({ canManage: true })} />)

    const input = screen.getByLabelText('Subir comanda')
    await user.upload(input, pdfFile('comanda.pdf', 11 * 1024 * 1024))

    expect(screen.getByText(/10 MB/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subir comanda' })).toBeDisabled()
  })

  it('calls onUpload with the selected File once a valid file is chosen', async () => {
    const user = userEvent.setup()
    const onUpload = vi.fn().mockResolvedValue(undefined)
    render(<EventDetailComandaSection {...baseProps({ canManage: true, onUpload })} />)

    const file = pdfFile()
    await user.upload(screen.getByLabelText('Subir comanda'), file)
    await user.click(screen.getByRole('button', { name: 'Subir comanda' }))

    expect(onUpload).toHaveBeenCalledWith(file)
  })

  it('shows a distinct success message for a first upload (no prior comanda)', async () => {
    const user = userEvent.setup()
    render(
      <EventDetailComandaSection {...baseProps({ canManage: true, comanda: null })} />,
    )

    await user.upload(screen.getByLabelText('Subir comanda'), pdfFile())
    await user.click(screen.getByRole('button', { name: 'Subir comanda' }))

    expect(await screen.findByText('Comanda subida')).toBeInTheDocument()
    expect(screen.getByText('La comanda se guardó correctamente.')).toBeInTheDocument()
    expect(screen.queryByText(/reemplazada/)).not.toBeInTheDocument()
  })

  it('shows a distinct success message for a replace (a comanda already existed)', async () => {
    const user = userEvent.setup()
    render(
      <EventDetailComandaSection {...baseProps({ canManage: true, comanda: COMANDA })} />,
    )

    await user.upload(screen.getByLabelText('Reemplazar comanda'), pdfFile())
    await user.click(screen.getByRole('button', { name: 'Reemplazar comanda' }))

    expect(await screen.findByText('Comanda reemplazada')).toBeInTheDocument()
    expect(
      screen.getByText('La nueva comanda se guardó correctamente.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Comanda subida')).not.toBeInTheDocument()
  })

  it('renders the success feedback as a viewport-fixed toast, not inline in the comanda content flow', async () => {
    const user = userEvent.setup()
    render(
      <EventDetailComandaSection {...baseProps({ canManage: true, comanda: null })} />,
    )

    await user.upload(screen.getByLabelText('Subir comanda'), pdfFile())
    await user.click(screen.getByRole('button', { name: 'Subir comanda' }))
    const title = await screen.findByText('Comanda subida')

    // A polite, non-interrupting status region (not `role="alert"`) whose
    // nearest ancestor with a `fixed` class is the toast's own outer
    // wrapper, not the comanda section's normal `EventDetailSection` flow.
    const statusRegion = title.closest('[role="status"]')
    expect(statusRegion).not.toBeNull()
    expect(statusRegion?.closest('.fixed')).not.toBeNull()
  })

  it('clears the upload success message once a new file is selected', async () => {
    const user = userEvent.setup()
    render(
      <EventDetailComandaSection {...baseProps({ canManage: true, comanda: null })} />,
    )

    await user.upload(screen.getByLabelText('Subir comanda'), pdfFile())
    await user.click(screen.getByRole('button', { name: 'Subir comanda' }))
    await screen.findByText('Comanda subida')

    await user.upload(screen.getByLabelText('Subir comanda'), pdfFile('otra.pdf'))

    expect(screen.queryByText('Comanda subida')).not.toBeInTheDocument()
  })

  it('does not leave a stale success message behind after a later failed upload', async () => {
    const user = userEvent.setup()
    const onUpload = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(
        new SgebApplicationError(409, {
          code: 'SGEB-4013',
          message: 'El evento no está en la etapa requerida para esta operación.',
        }),
      )
    render(
      <EventDetailComandaSection
        {...baseProps({ canManage: true, comanda: null, onUpload })}
      />,
    )

    await user.upload(screen.getByLabelText('Subir comanda'), pdfFile())
    await user.click(screen.getByRole('button', { name: 'Subir comanda' }))
    await screen.findByText('Comanda subida')

    await user.upload(screen.getByLabelText('Subir comanda'), pdfFile('otra.pdf'))
    await user.click(screen.getByRole('button', { name: 'Subir comanda' }))

    await waitFor(() =>
      expect(
        screen.getByText('El evento no está en la etapa requerida para esta operación.'),
      ).toBeInTheDocument(),
    )
    expect(screen.queryByText('Comanda subida')).not.toBeInTheDocument()
  })

  it('surfaces the real backend validation message (e.g. SGEB-4013 wrong event state) without technical_message', async () => {
    const user = userEvent.setup()
    const onUpload = vi.fn().mockRejectedValue(
      new SgebApplicationError(409, {
        code: 'SGEB-4013',
        message: 'El evento no está en la etapa requerida para esta operación.',
        technical_message: 'estado=finalizado',
      }),
    )
    render(<EventDetailComandaSection {...baseProps({ canManage: true, onUpload })} />)

    await user.upload(screen.getByLabelText('Subir comanda'), pdfFile())
    await user.click(screen.getByRole('button', { name: 'Subir comanda' }))

    await waitFor(() =>
      expect(
        screen.getByText('El evento no está en la etapa requerida para esta operación.'),
      ).toBeInTheDocument(),
    )
    expect(document.body.textContent ?? '').not.toContain('estado=finalizado')
  })
})

describe('EventDetailComandaSection — retire', () => {
  it('requires confirmation before calling onRetire', async () => {
    const user = userEvent.setup()
    const onRetire = vi.fn().mockResolvedValue(undefined)
    render(
      <EventDetailComandaSection
        {...baseProps({ comanda: COMANDA, canManage: true, onRetire })}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Retirar comanda' }))
    expect(onRetire).not.toHaveBeenCalled()
    expect(screen.getByText('¿Retirar la comanda vigente?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirmar retiro' }))
    expect(onRetire).toHaveBeenCalledOnce()
  })

  it('cancel dismisses the confirmation without calling onRetire', async () => {
    const user = userEvent.setup()
    const onRetire = vi.fn()
    render(
      <EventDetailComandaSection
        {...baseProps({ comanda: COMANDA, canManage: true, onRetire })}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Retirar comanda' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onRetire).not.toHaveBeenCalled()
    expect(screen.queryByText('¿Retirar la comanda vigente?')).not.toBeInTheDocument()
  })

  it('hides the retire control entirely when canManage is false', () => {
    render(
      <EventDetailComandaSection
        {...baseProps({ comanda: COMANDA, canManage: false })}
      />,
    )

    expect(
      screen.queryByRole('button', { name: 'Retirar comanda' }),
    ).not.toBeInTheDocument()
  })

  it('shows a success message once the comanda is retired', async () => {
    const user = userEvent.setup()
    render(
      <EventDetailComandaSection {...baseProps({ comanda: COMANDA, canManage: true })} />,
    )

    await user.click(screen.getByRole('button', { name: 'Retirar comanda' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar retiro' }))

    expect(await screen.findByText('Comanda retirada')).toBeInTheDocument()
  })

  it('keeps the retire success message visible once the caller’s query invalidation flips comanda to null (the real empty state)', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <EventDetailComandaSection {...baseProps({ comanda: COMANDA, canManage: true })} />,
    )

    await user.click(screen.getByRole('button', { name: 'Retirar comanda' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar retiro' }))
    await screen.findByText('Comanda retirada')

    // Mirrors what `EventDetailPage` really does after `onRetire` resolves:
    // `useRetireComandaMutation`'s `onSuccess` invalidates the comanda
    // query, which refetches into `comanda: null` and re-renders this
    // section with that new prop.
    rerender(
      <EventDetailComandaSection {...baseProps({ comanda: null, canManage: true })} />,
    )

    expect(screen.getByText('Comanda retirada')).toBeInTheDocument()
    expect(
      screen.getByText('No hay una comanda disponible para este evento.'),
    ).toBeInTheDocument()
  })

  it('does not leave a stale retire success message after a later failed retire attempt', async () => {
    const user = userEvent.setup()
    const onRetire = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(
        new SgebApplicationError(409, {
          code: 'SGEB-4013',
          message: 'El evento no está en la etapa requerida para esta operación.',
        }),
      )
    const { rerender } = render(
      <EventDetailComandaSection
        {...baseProps({ comanda: COMANDA, canManage: true, onRetire })}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Retirar comanda' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar retiro' }))
    await screen.findByText('Comanda retirada')

    // A second comanda now exists (server truth, via the parent's own
    // query) — re-render with it present so "Retirar comanda" is offered
    // again for the failing attempt.
    rerender(
      <EventDetailComandaSection
        {...baseProps({ comanda: COMANDA, canManage: true, onRetire })}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Retirar comanda' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar retiro' }))

    await waitFor(() =>
      expect(
        screen.getByText('El evento no está en la etapa requerida para esta operación.'),
      ).toBeInTheDocument(),
    )
    expect(screen.queryByText('Comanda retirada')).not.toBeInTheDocument()
  })
})

describe('EventDetailComandaSection — success feedback lifecycle across events', () => {
  it('clears a success message once this section is reused for a different event', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <EventDetailComandaSection
        {...baseProps({ idEvento: 1001, canManage: true, comanda: null })}
      />,
    )

    await user.upload(screen.getByLabelText('Subir comanda'), pdfFile())
    await user.click(screen.getByRole('button', { name: 'Subir comanda' }))
    await screen.findByText('Comanda subida')

    rerender(
      <EventDetailComandaSection
        {...baseProps({ idEvento: 1002, canManage: true, comanda: null })}
      />,
    )

    expect(screen.queryByText('Comanda subida')).not.toBeInTheDocument()
  })
})
