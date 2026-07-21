const INACTIVE_ACCOUNT_MESSAGE =
  'Your account is inactive. Please contact the administrator.';

const matches = (value, patterns) => patterns.some((pattern) => value.includes(pattern));

export function normalizeLoginErrorMessage(raw) {
  const msg = String(raw ?? '').trim();
  if (!msg) return 'Please try again.';

  const lower = msg.toLowerCase();

  if (
    matches(lower, [
      'account is inactive',
      'please contact the administrator',
      'application is under review',
      'user not found or inactive',
    ])
  ) {
    return INACTIVE_ACCOUNT_MESSAGE;
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
    return 'Invalid username or password. Please try again.';
  }

  if (
    matches(lower, [
      'email and password are required',
      'username and password are required',
    ])
  ) {
    return 'Username and password are required.';
  }

  return msg.endsWith('.') ? msg : `${msg}.`;
}
