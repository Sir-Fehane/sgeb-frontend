import axios from 'axios'

import { env } from '@/shared/config/env'

/**
 * Axios instance for the SGEB business API (docs/api/).
 *
 * Foundation-only: this does not attach an Authorization header, does not
 * implement token refresh, and does not assume a token storage mechanism —
 * that is still an open decision (docs/FrontendArchitecture.md §10.1).
 * Do not add an auth interceptor here until it is resolved.
 */
export const sgebClient = axios.create({
  baseURL: env.VITE_SGEB_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})
