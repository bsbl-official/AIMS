import type { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return <section className={`rounded-xl border border-[#c9dcd4] bg-[linear-gradient(135deg,rgba(255,255,255,.86),rgba(237,247,242,.82))] p-[22px] shadow-[0_8px_26px_rgba(29,72,67,.07)] ${className}`.trim()}>{children}</section>
}
