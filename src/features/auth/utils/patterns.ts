/**
 * Regexes copied verbatim from docs/sso/openapi-sso (1).yaml and
 * docs/sso/Diccionario_Datos_Auth_SGEB_v3.md — do not generalize or
 * "clean up" these; they must stay byte-identical to the documented
 * source so client-side validation matches the server exactly.
 */

/** `correo` field pattern, identical across every SSO endpoint that takes it. */
export const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

/** POST /auth/verificacion `codigo` field (S3). */
export const VERIFICATION_CODE_PATTERN = /^\d{6}$/

/**
 * Password policy enforced at registro/restablecer (SSO-2006) and
 * documented in the data dictionary's TOKEN_RECUPERACION business rules
 * (S6): minimum 8 characters, at least one uppercase letter (including
 * accented Spanish vowels and Ñ), one digit, and one symbol. NOT enforced
 * at login — POST /auth/login only checks password length (8-72).
 */
export const PASSWORD_POLICY_PATTERN =
  /^(?=.*[A-ZÁÉÍÓÚÑ])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/
