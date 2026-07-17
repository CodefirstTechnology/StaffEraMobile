import type { TFunction } from 'i18next';
import type { ToastType } from '@/providers/ToastProvider';

export type WorkOtpFeedbackKind = 'success' | 'invalid' | 'expired' | 'error';

export function classifyWorkOtpError(message: string): WorkOtpFeedbackKind {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('expired') ||
    normalized.includes('not requested') ||
    normalized.includes('no active otp') ||
    normalized.includes('too many wrong attempts')
  ) {
    return 'expired';
  }

  if (normalized.includes('incorrect otp') || normalized.includes('4-digit')) {
    return 'invalid';
  }

  return 'error';
}

export function workOtpFeedback(
  kind: WorkOtpFeedbackKind,
  t: TFunction,
  apiMessage?: string,
): { message: string; type: ToastType } {
  switch (kind) {
    case 'success':
      return { message: t('workOtp.successBody'), type: 'success' };
    case 'invalid':
      return {
        message:
          apiMessage && apiMessage.toLowerCase().includes('incorrect')
            ? apiMessage
            : t('workOtp.invalidBody'),
        type: 'error',
      };
    case 'expired':
      return { message: t('workOtp.expiredBody'), type: 'error' };
    default:
      return { message: apiMessage || t('auth.tryAgain'), type: 'error' };
  }
}

export function workOtpVerifyErrorFeedback(
  t: TFunction,
  apiMessage?: string,
): { message: string; type: ToastType } {
  return workOtpFeedback(classifyWorkOtpError(apiMessage || ''), t, apiMessage);
}
