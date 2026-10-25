import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type ModalSize = 'medium' | 'large'

type ModalProps = {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  size?: ModalSize
}

const sizeClasses: Record<ModalSize, string> = {
  medium: 'sm:w-[620px] sm:h-[620px]',
  large: 'sm:w-[720px] sm:h-[760px]',
}

export function Modal({ open, title, children, onClose, size = 'large' }: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    requestAnimationFrame(() => {
      const focusable = dialogRef.current?.querySelector<HTMLElement>('[data-modal-body] input:not(:disabled), [data-modal-body] button:not(:disabled), [data-modal-body] textarea:not(:disabled), [data-modal-body] [tabindex="0"]')
      focusable?.focus()
    })
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose, open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(9,28,31,.62)] p-2 backdrop-blur-[3px] sm:p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        className={`flex h-[calc(100dvh-16px)] w-[calc(100vw-16px)] flex-col overflow-hidden rounded-lg border border-white/60 bg-white shadow-[0_28px_90px_rgba(8,24,27,.35)] sm:max-h-[calc(100dvh-32px)] sm:max-w-[calc(100vw-32px)] ${sizeClasses[size]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
      >
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#e2e7e3] bg-white px-5 sm:h-[72px] sm:px-6">
          <h2 className="m-0 truncate font-display text-[22px] font-medium text-[#183137] sm:text-[25px]" id={titleId}>{title}</h2>
          <button className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-[#dce3df] bg-[#f2f5f3] text-[#5f706d] transition-colors hover:bg-[#e5ebe7] hover:text-[#23464b]" type="button" onClick={onClose} aria-label="Close modal"><X className="size-[18px]" aria-hidden /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6" data-modal-body>
          {children}
        </div>
      </section>
    </div>,
    document.body,
  )
}
