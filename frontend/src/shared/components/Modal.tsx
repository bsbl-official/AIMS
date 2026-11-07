import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type ModalSize = 'medium' | 'large' | 'batch' | 'xlarge'

type ModalProps = {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  size?: ModalSize
  description?: string
}

const sizeClasses: Record<ModalSize, string> = {
  medium: 'sm:w-[560px]',
  large: 'sm:w-[720px]',
  batch: 'sm:w-[920px]',
  xlarge: 'h-[calc(100dvh-16px)] sm:h-[calc(100dvh-32px)] sm:max-h-[820px] sm:w-[1180px]',
}

export function ModalActions({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`col-span-full -mx-5 -mb-5 mt-2 flex flex-wrap items-center justify-end gap-2.5 border-t border-[#d9e4df] bg-[#f4f8f6] px-5 py-4 sm:-mx-6 sm:-mb-6 sm:px-6 ${className}`.trim()}>{children}</div>
}

export function Modal({ open, title, children, onClose, size = 'large', description }: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onCloseRef.current()
    window.addEventListener('keydown', closeOnEscape)
    requestAnimationFrame(() => {
      const focusable = dialogRef.current?.querySelector<HTMLElement>('[data-modal-body] input:not(:disabled), [data-modal-body] button:not(:disabled), [data-modal-body] textarea:not(:disabled), [data-modal-body] [tabindex="0"]')
      focusable?.focus()
    })
    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(9,28,31,.62)] p-2 backdrop-blur-[3px] sm:p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        className={`flex max-h-[calc(100dvh-16px)] w-[calc(100vw-16px)] flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_28px_90px_rgba(8,24,27,.38)] sm:max-h-[calc(100dvh-32px)] sm:max-w-[calc(100vw-32px)] ${sizeClasses[size]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
      >
        <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-[#193a3f] bg-[#23464b] px-5 py-4 shadow-[0_8px_24px_rgba(18,48,52,.22)] sm:min-h-[76px] sm:px-6">
          <div className="min-w-0"><h2 className="m-0 truncate font-display text-[22px] font-bold text-white sm:text-[24px]" id={titleId}>{title}</h2>{description && <p className="m-0 mt-1 text-xs text-white/70 sm:text-[13px]">{description}</p>}</div>
          <button className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-white/20 bg-white/5 text-white/85 transition-colors hover:bg-white/15 hover:text-white" type="button" onClick={onClose} aria-label="Close modal"><X className="size-[19px]" aria-hidden /></button>
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain bg-[linear-gradient(145deg,#dff1eb_0%,#eef7f2_42%,#f8efd9_100%)] px-5 py-5 sm:px-6 sm:py-6" data-modal-body>
          {children}
        </div>
      </section>
    </div>,
    document.body,
  )
}
