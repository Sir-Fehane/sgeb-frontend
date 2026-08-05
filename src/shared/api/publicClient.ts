import axios from 'axios'

import { env } from '@/shared/config/env'

/**
 * Axios instance for the anonymous comensal (`/publico/*`) endpoints of the
 * SGEB API — docs/FrontendArchitecture.md §2.2 and §12.
 *
 * This client must NEVER attach an Authorization header or read from the
 * authenticated session store. It is the only HTTP client the comensal
 * feature is allowed to import.
 */
export const publicClient = axios.create({
  baseURL: env.VITE_SGEB_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})
