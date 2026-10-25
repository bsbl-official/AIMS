import type { ToastMessage } from '../context/ToastContext'
import { Toast } from './Toast'

type ToastViewportProps = { toasts: ToastMessage[]; onDismiss: (id: string) => void }

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return <div className="pointer-events-none fixed top-[22px] right-[22px] z-[200] grid w-[min(420px,calc(100vw-32px))] gap-3 max-sm:top-3 max-sm:right-4" aria-live="polite" aria-atomic="false">
    {toasts.map((toast) => <Toast key={toast.id} {...toast} onDismiss={onDismiss} />)}
  </div>
}
