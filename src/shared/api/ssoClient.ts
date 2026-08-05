import axios from 'axios'

import { env } from '@/shared/config/env'

/**
 * Axios instance for the independent SSO service (docs/sso/).
 *
 * Foundation-only: no login, refresh, or token storage behavior is
 * implemented here. Those contracts are still pending team decisions —
 * see docs/FrontendArchitecture.md §10.1 and §18.
 */
export const ssoClient = axios.create({
  baseURL: env.VITE_SSO_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})
