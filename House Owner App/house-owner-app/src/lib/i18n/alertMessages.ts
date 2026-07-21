import i18n from '@/lib/i18n';

/** English-only strings for validation, auth, and error alerts/toasts/inline errors. */
export function te(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, { ...options, lng: 'en' });
}

const matches = (value: string, patterns: string[]) =>
  patterns.some((pattern) => value.includes(pattern));

/** Map backend/API text to consistent English validation and auth messages. */
export function normalizeApiErrorMessage(raw?: string | null): string {
  const msg = raw?.trim() ?? '';
  if (!msg) return te('auth.tryAgain');

  const lower = msg.toLowerCase();

  if (
    matches(lower, [
      'account is inactive',
      'please contact the administrator',
      'application is under review',
      'user not found or inactive',
    ])
  ) {
    return te('auth.accountInactive');
  }

  if (
    matches(lower, [
      'invalid email',
      'invalid email address',
      'valid email',
      'valid username',
      'email address',
    ])
  ) {
    return te('validation.emailInvalid');
  }

  if (
    matches(lower, [
      'invalid credentials',
      'email or password',
      'username or password',
      'unauthorized',
      'login failed',
    ])
  ) {
    return te('auth.invalidCredentials');
  }

  if (
    matches(lower, [
      'email and password are required',
      'username and password are required',
    ])
  ) {
    return te('validation.credentialsRequired');
  }

  if (matches(lower, ['passwords do not match', 'password mismatch'])) {
    return te('auth.passwordMismatch');
  }

  if (
    matches(lower, [
      'mobile number must be at least 10',
      'phone number must be at least 10',
      '10-digit phone',
      '10 digit phone',
    ])
  ) {
    return te('validation.phoneInvalid');
  }

  if (matches(lower, ['name must be at least'])) {
    return te('validation.nameMin');
  }

  if (
    matches(lower, [
      'service category is required',
      'service category cannot be empty',
      'select what type of help',
    ])
  ) {
    return te('bookings.categoryRequired');
  }

  if (
    matches(lower, [
      'session bookings require',
      'at least one time slot',
      'invalid session start time',
      'invalid session end time',
      'end time must be after start time',
      'invalid time slot',
    ])
  ) {
    return te('bookings.timeSlotRequired');
  }

  if (
    matches(lower, [
      'live location',
      'latitude and longitude',
      'address is required',
    ])
  ) {
    return te('bookings.visitLocationRequired');
  }

  if (matches(lower, ['password must be at least 6'])) {
    return te('validation.passwordMin');
  }

  if (matches(lower, ['email is already in use', 'phone number is already in use'])) {
    return msg.endsWith('.') ? msg : `${msg}.`;
  }

  return msg.endsWith('.') ? msg : `${msg}.`;
}
