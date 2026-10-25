import { createContext } from 'react'

export type ToastType = 'success' | 'error'

export type ToastMessage = {
  id: string
  type: ToastType
  title: string
  message: string
}

export type ToastContextValue = {
  success: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
  dismiss: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
