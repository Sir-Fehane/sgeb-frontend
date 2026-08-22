import { IconHistoryOff } from '@tabler/icons-react'

import { Text } from '@/shared/components'

export function AuditLogEmptyState() {
  return (
    <div className="border-border flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
      <IconHistoryOff aria-hidden="true" className="text-muted-foreground size-10" />
      <Text size="sm" className="text-muted-foreground">
        No hay movimientos que coincidan con los filtros actuales.
      </Text>
    </div>
  )
}
