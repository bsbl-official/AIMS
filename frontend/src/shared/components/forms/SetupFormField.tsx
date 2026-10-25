import type { InputHTMLAttributes, ReactNode } from 'react'

export const setupInputClass = 'w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-[11px] text-[#203236] outline-none focus:border-[#347077] focus:shadow-[0_0_0_3px_rgba(52,112,119,.12)] disabled:cursor-not-allowed disabled:bg-[#f3f5f3]'

type SetupFormFieldProps = {
  label: string
  children: ReactNode
  fullWidth?: boolean
}

export function SetupFormField({ label, children, fullWidth = false }: SetupFormFieldProps) {
  return <label className={`grid gap-[7px] text-[13px] font-medium text-[#405653] ${fullWidth ? 'md:col-span-2' : ''}`}>
    {label}
    {children}
  </label>
}

export function SetupInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={setupInputClass} {...props} />
}
