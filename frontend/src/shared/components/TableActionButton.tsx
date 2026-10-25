import type { ReactNode } from 'react'

type TableActionButtonProps = {
  label: string
  children: ReactNode
  onClick: () => void
  tone?: 'default' | 'danger'
}

export function TableActionButton({ label, children, onClick, tone = 'default' }: TableActionButtonProps) {
  return <button
    className={`inline-grid size-8 cursor-pointer place-items-center rounded-md border-0 bg-transparent transition-colors ${tone === 'danger' ? 'text-[#d64545] hover:bg-[#fff0ef] hover:text-[#a92727]' : 'text-[#2f716d] hover:bg-[#dfeee8] hover:text-[#194e4b]'}`}
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
  >
    {children}
  </button>
}
