import { useEffect } from 'react'
import type { ToastMessage } from '../context/ToastContext'

type ToastProps = ToastMessage & { onDismiss: (id: string) => void }

export function Toast({ id, type, title, message, onDismiss }: ToastProps) {
  useEffect(() => {
    const timeout = window.setTimeout(() => onDismiss(id), 5000)
    return () => window.clearTimeout(timeout)
  }, [id, onDismiss])

  const tone = type === 'success' ? 'border-[#8bc9a9]' : 'border-[#e3a09a]'
  const iconTone = type === 'success' ? 'bg-[#54aa7b]' : 'bg-[#d75d55]'
  return <article className={`pointer-events-auto grid animate-[toast-enter_.22s_ease-out] grid-cols-[28px_1fr_28px] items-start gap-3 rounded-[11px] border bg-white px-[14px] py-[15px] shadow-[0_12px_36px_rgba(18,43,46,.18)] ${tone}`} role={type === 'error' ? 'alert' : 'status'}>
    <span className={`grid size-6 place-items-center rounded-full text-sm font-medium text-white ${iconTone}`} aria-hidden="true">{type === 'success' ? '✓' : '!'}</span>
    <div><strong className="block text-[15px] text-[#203236]">{title}</strong><p className="mt-1 mb-0 text-[13px] leading-[1.45] text-[#687976]">{message}</p></div>
    <button type="button" className="size-[26px] cursor-pointer rounded-full border-0 bg-transparent p-0 text-[19px] leading-none text-[#64736f] hover:bg-[#edf0ed]" onClick={() => onDismiss(id)} aria-label="Dismiss notification">×</button>
  </article>
}
