import { createContext, useContext } from 'react';

export type ToastTone = 'success' | 'danger' | 'info';

export interface ToastInput {
  tone?: ToastTone;
  message: string;
}

export const ToastContext = createContext<(toast: ToastInput) => void>(() => {
  // A no-op default keeps components usable in isolation, without a provider.
});

/** Shows a short, self-dismissing confirmation. Announced to screen readers. */
export function useToast(): (toast: ToastInput) => void {
  return useContext(ToastContext);
}
