import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { Spinner } from '@/shared/components/ui/spinner'
import { cn } from '@/shared/utils/cn'

/**
 * `sm`/`md` sizes suit the desktop-first admin/capitán console. Prefer
 * `lg` (44px) wherever this button appears in the mobile-first comensal
 * experience, for a comfortable touch target.
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg',
    'font-sans text-body-sm font-medium transition-[color,background-color,filter]',
    'disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
    '[&_svg]:size-4 [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        /**
         * `hover:brightness-90` (a filter, not `hover:bg-primary/90`
         * opacity): `--primary` (`#c44d25`) already sits at a
         * deliberately thin 4.53:1 against `--primary-foreground`
         * (`#fafaf8` — see `globals.css`'s own audited derivation).
         * `/90` opacity blends the background *toward whatever sits
         * behind it* — the page's `--background` (`#fafaf8`, near-white)
         * — which *lightens* an already-dark fill and measurably drops
         * the hover state to ~3.9:1, failing WCAG AA for normal text
         * (confirmed against real manual smoke testing: the label
         * visibly loses contrast on hover). `brightness-90` instead
         * darkens the rendered color in place, independent of backdrop,
         * landing at ~5.4:1 — comfortably passing, and the conventional
         * "hover = darker" affordance besides. Reuses the same
         * `--primary`/`--primary-foreground` tokens throughout; nothing
         * here is a new hardcoded color.
         */
        primary: 'bg-primary text-primary-foreground hover:brightness-90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border-border bg-background text-foreground hover:bg-accent border',
        ghost: 'text-foreground hover:bg-accent',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-10 px-4',
        lg: 'h-11 px-6 text-body',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

type ButtonVariantProps = VariantProps<typeof buttonVariants>

export interface ButtonAsButtonProps
  extends ComponentPropsWithoutRef<'button'>, ButtonVariantProps {
  asChild?: false
  /** Shows a spinner and blocks interaction, independent of `disabled`. */
  loading?: boolean
  /**
   * Decorative-by-default leading icon. If this button has no visible text
   * (icon-only, `size="icon"`), pass an `aria-label` on the button itself —
   * the icon alone is never an accessible name.
   */
  icon?: ReactNode
}

export interface ButtonAsChildProps
  extends Omit<ComponentPropsWithoutRef<'button'>, 'disabled'>, ButtonVariantProps {
  asChild: true
}

export type ButtonProps = ButtonAsButtonProps | ButtonAsChildProps

const ASYNC_CHILD_WARNING =
  '[Button] `asChild` cannot be combined with `disabled` or `loading` — ' +
  'see the comment above `Button` in src/shared/components/ui/button.tsx.'

/**
 * Strips `disabled`/`loading` before they reach the child `Slot` renders
 * onto, and warns in development if either was present.
 *
 * This exists because `asChild`'s type (`ButtonAsChildProps`) already
 * excludes both props — this is a *runtime* backstop for a consumer that
 * bypasses the type contract (e.g. via a cast), not the primary defense.
 */
function stripUnsafeChildProps<T extends object>(props: T): T {
  const unsafe = props as Record<string, unknown>

  if (import.meta.env.DEV && (Boolean(unsafe.disabled) || Boolean(unsafe.loading))) {
    console.error(ASYNC_CHILD_WARNING)
  }

  const { disabled: _disabled, loading: _loading, ...safe } = unsafe
  return safe as T
}

/**
 * `asChild` cannot be combined with `disabled`/`loading` — enforced by the
 * `ButtonProps` union above (a type error to try) and, defensively, by
 * `stripUnsafeChildProps` at runtime. The rendered child is arbitrary —
 * most commonly a router `Link`/`<a>` — and there is no reliable, generic
 * way to block its activation/navigation the way a native
 * `<button disabled>` blocks clicks and keyboard activation:
 * `preventDefault`-ing a merged `onClick` doesn't stop a router's
 * imperative `navigate()` call, and anchors have no native `disabled`
 * attribute at all. Rather than ship a half-working guard, this is
 * disallowed outright: render a plain `<Button disabled>`/`<Button
 * loading>`, or decide whether to render the link at all, instead of
 * reaching for `asChild` here.
 */
export function Button(props: ButtonProps) {
  if (props.asChild) {
    const { className, variant, size, children, asChild: _asChild, ...rest } = props
    const slotProps = stripUnsafeChildProps(rest)

    return (
      <Slot className={cn(buttonVariants({ variant, size, className }))} {...slotProps}>
        {children}
      </Slot>
    )
  }

  const {
    className,
    variant,
    size,
    asChild: _asChild,
    loading = false,
    disabled = false,
    icon,
    children,
    ...rest
  } = props

  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <Spinner size="sm" label="Cargando" />
      ) : icon ? (
        <span aria-hidden="true">{icon}</span>
      ) : null}
      {children}
    </button>
  )
}
