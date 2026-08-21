import { useId, type ReactNode } from 'react'

import { cn } from '@/shared/utils/cn'

/**
 * Minimal, dependency-free tab switcher — no `@radix-ui/react-tabs` is
 * installed, and `Dialog` (`ui/dialog.tsx`) already establishes the
 * convention of hand-rolling a primitive over adding a new package for one
 * interaction pattern. Manages only which panel is visible; each panel's
 * own content decides its own loading/error/empty state.
 */
export interface TabItem {
  value: string
  label: string
}

export interface TabsProps {
  items: readonly TabItem[]
  value: string
  onChange: (value: string) => void
  children: ReactNode
  className?: string
}

export function Tabs({ items, value, onChange, children, className }: TabsProps) {
  const baseId = useId()

  return (
    <div className={className}>
      <div role="tablist" className="border-border flex gap-1 overflow-x-auto border-b">
        {items.map((item) => {
          const selected = item.value === value
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.value}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.value}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(item.value)}
              className={cn(
                'shrink-0 rounded-t-lg px-4 py-2.5 font-sans text-body-sm font-medium',
                'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                selected
                  ? 'border-primary text-foreground border-b-2'
                  : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent',
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-${value}`}
        aria-labelledby={`${baseId}-tab-${value}`}
        className="pt-4"
      >
        {children}
      </div>
    </div>
  )
}
