import { IconUserSearch } from '@tabler/icons-react'

import { Text } from '@/shared/components'

export function UsersEmptyState() {
  return (
    <div className="border-border flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
      <IconUserSearch aria-hidden="true" className="text-muted-foreground size-10" />
      <Text size="sm" className="text-muted-foreground">
        No hay usuarios que coincidan con los filtros actuales.
      </Text>
    </div>
  )
}
