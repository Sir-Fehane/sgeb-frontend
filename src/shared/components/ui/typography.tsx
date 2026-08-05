import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/shared/utils/cn'

/**
 * Typography primitives mapped to the scale documented in
 * docs/branding/branding.pdf ("Escala tipográfica"):
 *
 *   H1 32–44px / 600–700  -> PageTitle
 *   H2 24–28px / 600      -> SectionHeading
 *   H3 16–18px / 600      -> CardHeading
 *   Body 14–16px / 400    -> Text
 *   Small 12–13px / 400   -> Caption, HelperText, ErrorText
 *
 * Headings use Poppins (`font-heading`); everything else uses Inter
 * (`font-sans`), per the branding guide.
 */

export type PageTitleProps = ComponentPropsWithoutRef<'h1'>

export function PageTitle({ className, ...props }: PageTitleProps) {
  return (
    <h1
      className={cn('font-heading text-display text-foreground font-bold', className)}
      {...props}
    />
  )
}

export type SectionHeadingProps = ComponentPropsWithoutRef<'h2'>

export function SectionHeading({ className, ...props }: SectionHeadingProps) {
  return (
    <h2
      className={cn('font-heading text-heading text-foreground font-semibold', className)}
      {...props}
    />
  )
}

export type CardHeadingProps = ComponentPropsWithoutRef<'h3'>

export function CardHeading({ className, ...props }: CardHeadingProps) {
  return (
    <h3
      className={cn(
        'font-heading text-subheading text-foreground font-semibold',
        className,
      )}
      {...props}
    />
  )
}

export interface TextProps extends ComponentPropsWithoutRef<'p'> {
  /** `md` (16px) is the default body size; `sm` (14px) is for denser copy. */
  size?: 'md' | 'sm'
}

export function Text({ size = 'md', className, ...props }: TextProps) {
  return (
    <p
      className={cn(
        'font-sans text-foreground',
        size === 'sm' ? 'text-body-sm' : 'text-body',
        className,
      )}
      {...props}
    />
  )
}

export type CaptionProps = ComponentPropsWithoutRef<'span'>

export function Caption({ className, ...props }: CaptionProps) {
  return (
    <span
      className={cn('font-sans text-caption text-muted-foreground', className)}
      {...props}
    />
  )
}

export type HelperTextProps = ComponentPropsWithoutRef<'p'>

/** Neutral helper copy under a form field. Not an error — see `ErrorText`. */
export function HelperText({ className, ...props }: HelperTextProps) {
  return (
    <p
      className={cn('font-sans text-label text-muted-foreground', className)}
      {...props}
    />
  )
}

export type ErrorTextProps = ComponentPropsWithoutRef<'p'>

/**
 * Form field error copy. Uses `role="alert"` so assistive technology
 * announces validation errors as they appear.
 */
export function ErrorText({ className, ...props }: ErrorTextProps) {
  return (
    <p
      role="alert"
      className={cn('font-sans text-label text-destructive font-medium', className)}
      {...props}
    />
  )
}
