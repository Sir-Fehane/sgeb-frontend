/**
 * Semantic tone contract shared by Badge and Alert.
 *
 * This intentionally does NOT model `disabled` or `loading` — those are
 * interaction states, not color tones, and are typed as boolean props on
 * the components that need them (Button, Input, Textarea) instead of being
 * folded into this union.
 *
 * Mapped 1:1 to the 5 accent colors in docs/branding/branding.pdf
 * ("Colores de acento y estados"). Do not add a tone that isn't backed by
 * a documented brand color, and do not map undocumented business statuses
 * here — that mapping belongs in the feature that owns the status
 * (e.g. `features/eventos` mapping `EVENTO.estado` to a `Tone`).
 */
export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

/**
 * Solid background + foreground pair — matches the branding guide's badge
 * examples exactly (colored pill, white text).
 */
export const TONE_SOLID_CLASSES: Record<Tone, string> = {
  neutral: 'bg-secondary text-secondary-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  danger: 'bg-destructive text-destructive-foreground',
  info: 'bg-info text-info-foreground',
}

/**
 * Soft tinted background + colored border/icon, dark foreground text.
 * The branding guide does not show alert/banner examples (only badges),
 * so this softer treatment — standard for longer-form feedback copy — is
 * a deliberate, disclosed choice distinct from the badge's solid fill.
 */
export const TONE_SOFT_CLASSES: Record<Tone, string> = {
  neutral: 'bg-muted border-border [&_svg]:text-muted-foreground',
  success: 'bg-success/10 border-success/30 [&_svg]:text-success',
  warning: 'bg-warning/10 border-warning/30 [&_svg]:text-warning',
  danger: 'bg-destructive/10 border-destructive/30 [&_svg]:text-destructive',
  info: 'bg-info/10 border-info/30 [&_svg]:text-info',
}
