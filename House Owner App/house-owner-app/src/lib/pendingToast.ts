import type { ToastType } from '@/providers/ToastProvider';

type PendingToast = {
  message: string;
  type: ToastType;
};

let pending: PendingToast | null = null;

export function setPendingToast(message: string, type: ToastType = 'success') {
  pending = { message, type };
}

export function takePendingToast(): PendingToast | null {
  const next = pending;
  pending = null;
  return next;
}
