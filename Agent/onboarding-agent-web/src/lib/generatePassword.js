export const PASSWORD_MIN_LENGTH = 6

export const PASSWORD_STRENGTH_MESSAGE =
  'Password must be at least 6 characters, and contain at least one uppercase letter, one lowercase letter, one number, and one special character (e.g. !@#$%).'

export function validateServantPassword(password) {
  const trimmed = String(password || '').trim()
  if (trimmed.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, error: 'Password must be at least 6 characters' }
  }
  if (!/[A-Z]/.test(trimmed)) {
    return { ok: false, error: 'Password must contain at least one uppercase letter' }
  }
  if (!/[a-z]/.test(trimmed)) {
    return { ok: false, error: 'Password must contain at least one lowercase letter' }
  }
  if (!/[0-9]/.test(trimmed)) {
    return { ok: false, error: 'Password must contain at least one number' }
  }
  if (!/[^A-Za-z0-9]/.test(trimmed)) {
    return { ok: false, error: 'Password must contain at least one special character (e.g. !@#$%)' }
  }
  return { ok: true, password: trimmed }
}

/** Client-side preview password; server can also generate on verify. */
export function generateServantPassword() {
  const spec = '!@#$%^&*'
  const num = '0123456789'
  const letters = 'abcdefghijklmnopqrstuvwxyz'
  const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  
  const r = (chars, len) => {
    const bytes = new Uint8Array(len)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => chars.charAt(b % chars.length)).join('')
  }
  
  return 'St' + r(letters, 2) + r(uppers, 2) + r(num, 2) + r(spec, 2)
}

export function checkPasswordStrength(password) {
  const val = String(password || '')
  if (!val) return { score: 0, label: '', color: 'text-gray-400' }
  if (val.length < PASSWORD_MIN_LENGTH) {
    return { score: 0, label: 'Too short', color: 'text-error' }
  }
  
  let criteriaMet = 0
  if (/[A-Z]/.test(val)) criteriaMet++
  if (/[a-z]/.test(val)) criteriaMet++
  if (/[0-9]/.test(val)) criteriaMet++
  if (/[^A-Za-z0-9]/.test(val)) criteriaMet++
  
  if (criteriaMet <= 2) {
    return { score: 1, label: 'Weak', color: 'text-error' }
  } else if (criteriaMet === 3) {
    return { score: 2, label: 'Medium', color: 'text-amber-500' }
  } else {
    return { score: 3, label: 'Strong', color: 'text-emerald-500' }
  }
}
