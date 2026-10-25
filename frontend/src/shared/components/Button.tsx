import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
}

export function Button({ children, variant = 'primary', className = '', ...props }: ButtonProps) {
  const variantClasses = variant === 'primary'
    ? 'border border-[#c79a4b] bg-gradient-to-r from-[#dfc477] to-[#c99a49] text-[#17383d] shadow-[0_6px_16px_rgba(130,94,34,.18)] hover:brightness-105'
    : variant === 'danger'
      ? 'border border-[#9b4038] bg-[#a94b42] text-white shadow-[0_5px_14px_rgba(139,47,39,.18)] hover:bg-[#8f3b34]'
      : 'border border-[#bfd2ca] bg-[#e8f1ed] text-[#244247] hover:bg-[#dceae4]'
  return (
    <button className={`cursor-pointer rounded-lg px-[17px] py-[11px] font-normal transition disabled:cursor-not-allowed disabled:opacity-65 ${variantClasses} ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}
