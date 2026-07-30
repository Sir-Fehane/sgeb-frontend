import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges Tailwind class lists safely (last-wins on conflicting utilities).
 * Standard shadcn/ui utility — required by any generated shadcn component.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
