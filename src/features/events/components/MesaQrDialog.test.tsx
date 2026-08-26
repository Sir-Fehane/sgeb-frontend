import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MesaQrDialog } from '@/features/events/components/MesaQrDialog'
import type { MesaViewModel } from '@/features/events/services/mesasApi'

const MESA: MesaViewModel = {
  idMesa: 501,
  etiqueta: 'Mesa 1',
  estado: 'libre',
  codigoQr: '3f2a9c14-1234-4abc-89ab-000000000000',
}

const EXPECTED_URL = `${window.location.origin}/publico/mesas/3f2a9c14-1234-4abc-89ab-000000000000`

afterEach(() => {
  vi.restoreAllMocks()
})

describe('MesaQrDialog', () => {
  it('renders the mesa etiqueta and the QR canvas', () => {
    render(<MesaQrDialog mesa={MESA} onClose={vi.fn()} />)
    expect(screen.getByText('QR de Mesa 1')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Código QR de Mesa 1' })).toBeInTheDocument()
  })

  it('shows the exact public diner URL for the mesa codigoQr, never the raw code alone', () => {
    render(<MesaQrDialog mesa={MESA} onClose={vi.fn()} />)
    expect(screen.getByDisplayValue(EXPECTED_URL)).toBeInTheDocument()
  })

  it('downloads the QR as a deterministic PNG filename without crashing', async () => {
    const user = userEvent.setup()
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,fake',
    )
    let downloadedAs: string | undefined
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadedAs = this.download
      })

    render(<MesaQrDialog mesa={MESA} onClose={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Descargar QR' }))

    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(downloadedAs).toBe('mesa-501-qr.png')
  })

  it('copies the public URL to the clipboard', async () => {
    const user = userEvent.setup()
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined)

    render(<MesaQrDialog mesa={MESA} onClose={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Copiar enlace' }))

    expect(writeText).toHaveBeenCalledWith(EXPECTED_URL)
    expect(await screen.findByRole('button', { name: 'Copiado' })).toBeInTheDocument()
  })
})
