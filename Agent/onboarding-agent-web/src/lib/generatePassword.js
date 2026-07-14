export const PASSWORD_MIN_LENGTH = 6

export const PASSWORD_TOO_SHORT_MESSAGE =
  'Enter a password with at least 6 characters, or tap Generate password.'

export function validateServantPassword(password) {
  const trimmed = password.trim()
  if (trimmed.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, error: PASSWORD_TOO_SHORT_MESSAGE }
  }
  return { ok: true, password: trimmed }
}

/** Client-side preview password; server can also generate on verify. */
export function generateServantPassword() {
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `St${hex}1`
}
