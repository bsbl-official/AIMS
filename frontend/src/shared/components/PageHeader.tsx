import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  action?: ReactNode
}

export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <header className="mb-4 flex min-h-10 flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-6">
      <h1 className="m-0 font-display text-[clamp(24px,2vw,30px)] leading-tight font-normal text-[#183137]">{title}</h1>
      {action && <div>{action}</div>}
    </header>
  )
}
