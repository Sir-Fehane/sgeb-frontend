import axios from 'axios'

/**
 * Axios instance for Mapbox's own public REST API (geocoding today; the
 * map tiles themselves are fetched by `mapbox-gl` directly, not through
 * this client). `api.mapbox.com` is Mapbox's fixed service host — unlike
 * `VITE_SGEB_API_URL`/`VITE_SSO_API_URL` this never varies per SGEB
 * environment, so it is not an env var (same reasoning as the hardcoded
 * Google Fonts origins already in `index.html`).
 *
 * Carries no Authorization header and no SGEB envelope handling — every
 * request must pass its own `access_token` query param (see
 * `mapboxGeocodingApi.ts`).
 */
export const mapboxClient = axios.create({
  baseURL: 'https://api.mapbox.com',
})
