import brandMark from '@/assets/branding/logo-default.svg'
import { cn } from '@/shared/utils/cn'

export interface BrandLogoProps {
  className?: string
  /**
   * Accessible name. Leave unset (renders `alt=""`, decorative) when
   * visible adjacent text already identifies the brand — e.g. the "SGEB"
   * label next to it in the expanded Sidebar/MobileNavDrawer. Set it when
   * this is the only brand identification on screen (e.g. `AuthLayout`).
   */
  alt?: string
}

/**
 * The single authoritative SGEB mark (`src/assets/branding/logo-default.svg`)
 * for light-surface UI chrome — every current surface (Sidebar, Topbar,
 * MobileNavDrawer, AuthLayout) sits on `--background`/`--card` (#fafaf8), so
 * one dark-ink variant covers all of them (docs: no dark-surface chrome
 * exists yet). `logo-light`/`logo-dark`/`logo-tinted` stay available in
 * `src/assets/branding/` for surfaces that need them later, unimported here.
 */
export function BrandLogo({ className, alt = '' }: BrandLogoProps) {
  return <img src={brandMark} alt={alt} className={cn('shrink-0', className)} />
}
