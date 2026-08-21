import { useState } from 'react'

import { CubaitorFleetSection } from '@/features/cubaitor/components/CubaitorFleetSection'
import { BebidasSection } from '@/features/menu/components/BebidasSection'
import { EnvasesSection } from '@/features/menu/components/EnvasesSection'
import { InsumosSection } from '@/features/menu/components/InsumosSection'
import { PageTitle, Tabs, Text, type TabItem } from '@/shared/components'

const MENU_TABS: readonly TabItem[] = [
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'insumos', label: 'Insumos' },
  { value: 'envases', label: 'Envases' },
  { value: 'cubaitor', label: 'Cubaitor' },
]

/**
 * Routed at /menu (routing wiring owned elsewhere — see this branch's task
 * spec). The GLOBAL catalog screen: bebidas/insumos/envases and the
 * Cubaitor device fleet, all scoped catalog-wide, never to a specific
 * event — distinct from `features/events/cubaitor/`'s event-scoped live bar
 * operation (dispensing, pin configuration, orders), which lives on the
 * event's own dashboard instead. Only the active tab's section mounts, so
 * switching tabs is what triggers that domain's query — not all four on
 * page load.
 */
export function MenuPage() {
  const [activeTab, setActiveTab] = useState<string>('bebidas')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <PageTitle className="text-heading">Bebidas y Cubaitor</PageTitle>
        <Text size="sm" className="text-muted-foreground">
          Catálogo global de bebidas, insumos y envases, y la flota de dispositivos
          Cubaitor — independiente de la operación de barra de cualquier evento en
          particular.
        </Text>
      </div>

      <Tabs items={MENU_TABS} value={activeTab} onChange={setActiveTab}>
        {activeTab === 'bebidas' ? <BebidasSection /> : null}
        {activeTab === 'insumos' ? <InsumosSection /> : null}
        {activeTab === 'envases' ? <EnvasesSection /> : null}
        {activeTab === 'cubaitor' ? <CubaitorFleetSection /> : null}
      </Tabs>
    </div>
  )
}
