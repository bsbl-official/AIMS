import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ToastViewport } from '../components/ToastViewport'
import { ToastContext, type ToastContextValue, type ToastMessage, type ToastType } from '../context/ToastContext'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const dismiss = useCallback((id: string) => setToasts((current) => current.filter((toast) => toast.id !== id)), [])
  const show = useCallback((type: ToastType, message: string, title: string) => {
    const id = crypto.randomUUID()
    setToasts((current) => [...current.slice(-3), { id, type, title, message }])
  }, [])
  const value = useMemo<ToastContextValue>(() => ({
    success: (message, title = 'Success') => show('success', message, title),
    error: (message, title = 'Something went wrong') => show('error', message, title),
    dismiss,
  }), [dismiss, show])

  return <ToastContext.Provider value={value}>{children}<ToastViewport toasts={toasts} onDismiss={dismiss} /></ToastContext.Provider>
}
