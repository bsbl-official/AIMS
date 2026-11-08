import { Plus } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type AddRowButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  children: ReactNode
}

export function AddRowButton({ children, className = '', type = 'button', ...props }: AddRowButtonProps) {
  return <button
    className={`flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-[#173d42] bg-[linear-gradient(105deg,#173d42_0%,#23464b_52%,#315f5c_100%)] px-4 py-2.5 text-sm font-medium text-[#fffaf0] shadow-[0_5px_14px_rgba(23,61,66,.22),inset_0_1px_0_rgba(255,255,255,.1)] transition hover:border-[#d7b66d] hover:bg-[linear-gradient(105deg,#1d4b50_0%,#2b5659_52%,#3b6d68_100%)] hover:shadow-[0_7px_18px_rgba(23,61,66,.28)] focus:outline-none focus:ring-3 focus:ring-[#d7b66d]/35 disabled:cursor-not-allowed disabled:border-[#8da39f] disabled:bg-[#6f8581] disabled:text-white/75 disabled:shadow-none disabled:opacity-65 ${className}`.trim()}
    type={type}
    {...props}
  >
    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#d7b66d] text-[#173d42] shadow-[0_2px_6px_rgba(6,31,34,.3)]" aria-hidden><Plus className="size-3.5" /></span>
    <span>{children}</span>
  </button>
}
