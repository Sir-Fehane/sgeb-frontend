import { IconUserCircle } from '@tabler/icons-react'

import { cn } from '@/shared/utils/cn'

/**
 * Placeholder for the future account/user menu. Rendered `disabled` on
 * purpose — authentication and the real account menu are not part of
 * this foundation (docs/FrontendArchitecture.md §10.1) — so this must
 * not appear interactive.
 */
export function AccountMenuPlaceholder() {
  return (
    <button
      type="button"
      disabled
      aria-label="Cuenta — pendiente de implementar"
      title="Cuenta (pendiente)"
      className={cn(
        'text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full',
        'disabled:cursor-not-allowed disabled:opacity-60',
      )}
    >
      <IconUserCircle aria-hidden="true" className="size-6" />
    </button>
  )
}
