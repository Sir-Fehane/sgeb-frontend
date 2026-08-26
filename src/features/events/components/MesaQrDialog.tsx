import { useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'

import { buildMesaPublicaUrl } from '@/features/events/utils/mesaQrUrl'
import type { MesaViewModel } from '@/features/events/services/mesasApi'
import { Button, Dialog, Input, Text } from '@/shared/components'

export interface MesaQrDialogProps {
  mesa: MesaViewModel
  onClose: () => void
}

const QR_SIZE_PX = 200

/**
 * The one approved surface for `MesaViewModel.codigoQr` (see
 * `EventDetailMesasSection`'s own comment for why the row itself never
 * renders it directly): a QR encoding the public diner URL, a copyable
 * link, and a PNG download — nothing else. The backend remains the only
 * generator/owner of `codigoQr` itself; this only ever renders the value
 * already returned by `fetchMesas`/`createMesa`.
 */
export function MesaQrDialog({ mesa, onClose }: MesaQrDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)
  const publicUrl = buildMesaPublicaUrl(mesa.codigoQr)

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `mesa-${String(mesa.idMesa)}-qr.png`
    link.click()
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
    } catch {
      // Clipboard access can fail (permissions, insecure context) — the
      // link stays visible and selectable in the input either way, so the
      // user can still copy it manually.
    }
  }

  return (
    <Dialog open onClose={onClose} title={`QR de ${mesa.etiqueta}`}>
      <div className="flex flex-col items-center gap-4">
        <div className="border-border rounded-lg border p-4">
          <QRCodeCanvas
            ref={canvasRef}
            value={publicUrl}
            size={QR_SIZE_PX}
            title={`Código QR de ${mesa.etiqueta}`}
          />
        </div>

        <div className="flex w-full flex-col gap-1">
          <Text size="sm" className="text-muted-foreground">
            Enlace público
          </Text>
          <Input readOnly value={publicUrl} onFocus={(event) => event.target.select()} />
        </div>

        <div className="flex w-full gap-2">
          <Button type="button" size="sm" onClick={handleDownload}>
            Descargar QR
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleCopy()}
          >
            {copied ? 'Copiado' : 'Copiar enlace'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
