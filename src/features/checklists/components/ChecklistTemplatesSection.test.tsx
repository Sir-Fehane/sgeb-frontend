import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ChecklistTemplatesSection } from '@/features/checklists/components/ChecklistTemplatesSection'
import { SgebApplicationError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ChecklistTemplatesSection />
    </QueryClientProvider>,
  )
}

/**
 * End-to-end regression test for the real, reproduced bug: submitting the
 * "Nueva plantilla" form (fill Nombre + one item's Descripción, leave
 * Cantidad esperada/Orden at their defaults, click Guardar) used to send
 * `cantidad_esperada` and get rejected by the pinned backend's
 * `checklist_validator.ts` (which requires camelCase `cantidadEsperada`)
 * with `SGEB-2001` — "Faltan datos obligatorios. Completa los campos
 * marcados." This drives the exact same form/RHF/Zod/API-mapper pipeline a
 * real captain would, not just the API function in isolation.
 */
describe('ChecklistTemplatesSection — create form submission (regression: SGEB-2001)', () => {
  it('POSTs the exact wire payload with camelCase cantidadEsperada when creating a minimal checklist', async () => {
    vi.mocked(requestSgeb).mockImplementation((config) => {
      if (config.url === '/checklists' && config.method === undefined) {
        return Promise.resolve({
          result: { code: 'SGEB-0002', message: 'sin resultados' },
          data: [],
        })
      }
      if (config.url === '/checklists' && config.method === 'POST') {
        return Promise.resolve({
          result: { code: 'SGEB-0001', message: 'creado' },
          data: {
            id_checklist: 1,
            nombre: 'Montaje de salón',
            tipo: 'montaje',
            activo: true,
            items: [
              {
                id_item: 10,
                id_checklist: 1,
                descripcion: 'Colocar mantelería',
                cantidad_esperada: 1,
                orden: 1,
                activo: true,
              },
            ],
          },
        })
      }
      return Promise.reject(new Error(`Unexpected request: ${String(config.url)}`))
    })

    const user = userEvent.setup()
    renderSection()

    await user.click(await screen.findByRole('button', { name: 'Nueva plantilla' }))
    await user.type(await screen.findByLabelText(/^Nombre/), 'Montaje de salón')
    await user.type(screen.getByLabelText(/^Descripción 1/), 'Colocar mantelería')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(requestSgeb).toHaveBeenCalledWith({
        url: '/checklists',
        method: 'POST',
        data: {
          nombre: 'Montaje de salón',
          tipo: 'montaje',
          items: [{ descripcion: 'Colocar mantelería', cantidadEsperada: 1, orden: 1 }],
        },
      })
    })

    // The dialog closes only on a real success — proves the request was
    // actually accepted, not merely sent.
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
    })
  })

  it('surfaces the backend SGEB-2001 message inline instead of silently failing, if the payload were ever wrong again', async () => {
    vi.mocked(requestSgeb).mockImplementation((config) => {
      if (config.url === '/checklists' && config.method === undefined) {
        return Promise.resolve({
          result: { code: 'SGEB-0002', message: 'sin resultados' },
          data: [],
        })
      }
      if (config.url === '/checklists' && config.method === 'POST') {
        return Promise.reject(
          new SgebApplicationError(400, {
            code: 'SGEB-2001',
            message: 'Faltan datos obligatorios. Completa los campos marcados.',
          }),
        )
      }
      return Promise.reject(new Error(`Unexpected request: ${String(config.url)}`))
    })

    const user = userEvent.setup()
    renderSection()

    await user.click(await screen.findByRole('button', { name: 'Nueva plantilla' }))
    await user.type(await screen.findByLabelText(/^Nombre/), 'Montaje de salón')
    await user.type(screen.getByLabelText(/^Descripción 1/), 'Colocar mantelería')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(
      await screen.findByText('Faltan datos obligatorios. Completa los campos marcados.'),
    ).toBeInTheDocument()
  })
})
