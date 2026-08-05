import { IconPlus } from '@tabler/icons-react'

import { Button, Text } from '@/shared/components'

export interface EventsPageHeaderProps {
  /**
   * Invoked when the header's create action is activated. Must not
   * imply an event was created or that navigation to a real screen
   * occurred — see `EventsPage` for how this is currently wired (no
   * `/eventos/nuevo` route is registered yet).
   */
  onCreate?: (() => void) | undefined
}

/**
 * No heading is rendered here — `AppShell`'s `Topbar` already renders
 * "Eventos" as the page's `<h1>` (docs/FrontendArchitecture.md's
 * established `AppShell` convention); repeating it here would be a
 * redundant duplicate heading.
 */
export function EventsPageHeader({ onCreate }: EventsPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Text size="sm" className="text-muted-foreground">
        Consulta y filtra los eventos registrados.
      </Text>
      {onCreate ? (
        <Button icon={<IconPlus aria-hidden="true" />} onClick={onCreate}>
          Crear evento
        </Button>
      ) : null}
    </div>
  )
}
