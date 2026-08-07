import { describe, expect, it, vi } from 'vitest'

import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateNonce,
  generatePkcePair,
  generateState,
} from '@/features/oidc-client/protocol/pkce'

const UNRESERVED_CHARS = /^[A-Za-z0-9\-._~]+$/
const BASE64URL_CHARS = /^[A-Za-z0-9\-_]+$/
const NO_PADDING = /=/

describe('generateCodeVerifier', () => {
  it('produces a string between 43 and 128 characters', () => {
    const verifier = generateCodeVerifier()

    expect(verifier.length).toBeGreaterThanOrEqual(43)
    expect(verifier.length).toBeLessThanOrEqual(128)
  })

  it('only uses RFC 7636 unreserved characters', () => {
    const verifier = generateCodeVerifier()

    expect(verifier).toMatch(UNRESERVED_CHARS)
  })

  it('produces different values on each call', () => {
    expect(generateCodeVerifier()).not.toBe(generateCodeVerifier())
  })

  it('uses the injected random-bytes provider instead of a hidden default', () => {
    const fixedBytes = new Uint8Array(32).fill(7)
    const provider = vi.fn().mockReturnValue(fixedBytes)

    const first = generateCodeVerifier(provider)
    const second = generateCodeVerifier(provider)

    expect(provider).toHaveBeenCalledWith(32)
    expect(first).toBe(second)
  })
})

describe('generateState', () => {
  it('produces a string between 16 and 128 characters', () => {
    const state = generateState()

    expect(state.length).toBeGreaterThanOrEqual(16)
    expect(state.length).toBeLessThanOrEqual(128)
  })

  it('produces different values on each call', () => {
    expect(generateState()).not.toBe(generateState())
  })
})

describe('generateNonce', () => {
  it('produces a string between 16 and 128 characters', () => {
    const nonce = generateNonce()

    expect(nonce.length).toBeGreaterThanOrEqual(16)
    expect(nonce.length).toBeLessThanOrEqual(128)
  })

  it('produces different values on each call', () => {
    expect(generateNonce()).not.toBe(generateNonce())
  })
})

describe('generateCodeChallenge', () => {
  it('derives a base64url string with no padding from the verifier', async () => {
    const challenge = await generateCodeChallenge(generateCodeVerifier())

    expect(challenge).toMatch(BASE64URL_CHARS)
    expect(challenge).not.toMatch(NO_PADDING)
  })

  it('is deterministic for the same verifier (SHA-256 is a pure function)', async () => {
    const verifier = generateCodeVerifier()

    const first = await generateCodeChallenge(verifier)
    const second = await generateCodeChallenge(verifier)

    expect(first).toBe(second)
  })

  it('produces different challenges for different verifiers', async () => {
    const first = await generateCodeChallenge(generateCodeVerifier())
    const second = await generateCodeChallenge(generateCodeVerifier())

    expect(first).not.toBe(second)
  })

  it('matches the known RFC 7636 appendix B test vector', async () => {
    const challenge = await generateCodeChallenge(
      'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
    )

    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })
})

describe('generatePkcePair', () => {
  it('always sets code_challenge_method to S256', async () => {
    const pair = await generatePkcePair()

    expect(pair.codeChallengeMethod).toBe('S256')
  })

  it('derives code_challenge from its own code_verifier', async () => {
    const pair = await generatePkcePair()
    const expectedChallenge = await generateCodeChallenge(pair.codeVerifier)

    expect(pair.codeChallenge).toBe(expectedChallenge)
  })
})
