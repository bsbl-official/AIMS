import type { ReactNode } from 'react'

type TableActionButtonProps = {
  label: string
  children: ReactNode
  onClick: () => void
  tone?: 'default' | 'danger'
  disabled?: boolean
}

export function TableActionButton({ label, children, onClick, tone = 'default', disabled = false }: TableActionButtonProps) {
  return <button
    className={`mx-auto grid size-8 cursor-pointer place-items-center rounded-md border-0 bg-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${tone === 'danger' ? 'text-[#d64545] hover:bg-[#fff0ef] hover:text-[#a92727]' : 'text-[#2f716d] hover:bg-[#dfeee8] hover:text-[#194e4b]'}`}
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
}
