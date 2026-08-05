import { IconInfoCircle } from '@tabler/icons-react'
import { useLocation } from 'react-router-dom'

import {
  Alert,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  SectionHeading,
  Text,
} from '@/shared/components'
import { NAV_ITEMS } from '@/shared/components/layout'

/**
 * Development-only placeholder rendered for every top-level nav
 * destination. Demonstrates `AppShell` (active nav item, topbar title,
 * content spacing, scroll behavior) — NOT a real dashboard. No KPI data,
 * charts, or backend calls: every block below is static filler text.
 */
export function AppShellPreviewPage() {
  const location = useLocation()
  const activeItem = NAV_ITEMS.find((item) => item.href === location.pathname)
  const label = activeItem?.label ?? location.pathname

  return (
    <div className="flex flex-col gap-6">
      <Alert
        tone="info"
        icon={<IconInfoCircle aria-hidden="true" />}
        title="Vista de desarrollo"
      >
        <Text size="sm">
          «{label}» no está implementada en esta base — esta página existe únicamente para
          demostrar el AppShell (barra lateral, encabezado, indicación de ruta activa y
          desplazamiento del contenido), no una pantalla de negocio real.
        </Text>
      </Alert>

      <SectionHeading>Contenido de ejemplo</SectionHeading>

      {Array.from({ length: 12 }, (_, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle>Bloque de contenido {index + 1}</CardTitle>
            <CardDescription>
              Relleno para demostrar el desplazamiento del contenedor principal — no
              representa datos reales.
            </CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
