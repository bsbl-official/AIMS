import type { ReactNode } from 'react'
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb'
import { PageHeader } from './PageHeader'

type PageContainerProps = {
  breadcrumbs: BreadcrumbItem[]
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function PageContainer({ breadcrumbs, title, action, children, className = '' }: PageContainerProps) {
  return <section className={`relative min-h-[calc(100vh-132px)] w-full rounded-xl border border-[#c2d9d0] bg-[linear-gradient(145deg,#dff1eb_0%,#eef7f2_42%,#f8efd9_100%)] px-6 pt-5 pb-8 shadow-[0_16px_42px_rgba(29,82,77,.10),inset_0_1px_0_rgba(255,255,255,.72)] before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-[#d7b66d] before:to-transparent max-md:min-h-[calc(100vh-116px)] max-md:rounded-lg max-md:px-4 max-md:pt-4 max-md:pb-6 ${className}`.trim()}>
    <div className="relative z-[1]">
      <Breadcrumb items={breadcrumbs} />
      <PageHeader title={title} action={action} />
      <div className="min-w-0">{children}</div>
    </div>
  </section>
}
