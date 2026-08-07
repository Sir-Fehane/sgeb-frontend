/**
 * PKCE (RFC 7636) and OIDC random-value generation for the Authorization
 * Code + PKCE flow. Built exclusively on the Web Crypto API
 * (`crypto.getRandomValues`, `crypto.subtle.digest`) — no `Math.random`,
 * no Node-only `node:crypto` import. `crypto` is a browser global in
 * production and a global in the Node ≥22 test runtime, so no polyfill or
 * environment-specific branch is needed.
 */

export type RandomBytesProvider = (byteLength: number) => Uint8Array

/** 32 random bytes base64url-encode (unpadded) to exactly 43 characters — RFC 7636's own recommended verifier entropy, and comfortably within every length requirement used here (verifier 43–128, state/nonce 16–128). */
const RANDOM_BYTE_LENGTH = 32

function defaultRandomBytesProvider(byteLength: number): Uint8Array {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return bytes
}

/** Base64url per RFC 4648 §5, with padding stripped — never plain base64. */
function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * A `code_verifier` per RFC 7636 §4.1: an unreserved-character string of
 * 43–128 characters. Base64url's alphabet (`[A-Za-z0-9\-_]`) is a subset
 * of RFC 7636's allowed unreserved set (`[A-Za-z0-9\-._~]`), so encoding
 * random bytes this way is always valid.
 */
export function generateCodeVerifier(
  randomBytesProvider: RandomBytesProvider = defaultRandomBytesProvider,
): string {
  return base64UrlEncode(randomBytesProvider(RANDOM_BYTE_LENGTH))
}

/** `state` per `GET /authorize` — 16–128 characters, CSRF protection. */
export function generateState(
  randomBytesProvider: RandomBytesProvider = defaultRandomBytesProvider,
): string {
  return base64UrlEncode(randomBytesProvider(RANDOM_BYTE_LENGTH))
}

/** `nonce` per `GET /authorize` — 16–128 characters, id_token replay protection. */
export function generateNonce(
  randomBytesProvider: RandomBytesProvider = defaultRandomBytesProvider,
): string {
  return base64UrlEncode(randomBytesProvider(RANDOM_BYTE_LENGTH))
}

/**
 * `code_challenge` = base64url(SHA-256(code_verifier)), per RFC 7636 §4.2.
 * Always paired with `code_challenge_method=S256` — the provider rejects
 * `plain` outright (`docs/sso/openapi-sso.yaml`).
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(codeVerifier),
  )
  return base64UrlEncode(new Uint8Array(digest))
}

export interface PkcePair {
  codeVerifier: string
  codeChallenge: string
  codeChallengeMethod: 'S256'
}

export async function generatePkcePair(
  randomBytesProvider: RandomBytesProvider = defaultRandomBytesProvider,
): Promise<PkcePair> {
  const codeVerifier = generateCodeVerifier(randomBytesProvider)
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  return { codeVerifier, codeChallenge, codeChallengeMethod: 'S256' }
}
