import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export type BreadcrumbItem = {
  label: string
  to?: string
}

type BreadcrumbProps = {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return <nav className="mb-2.5" aria-label="Breadcrumb">
    <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0 text-xs">
      {items.map((item, index) => {
        const current = index === items.length - 1
        return <li className="flex items-center gap-1.5" key={`${item.label}-${index}`}>
          {index > 0 && <ChevronRight className="size-3.5 text-[#9aa6a3]" aria-hidden />}
          {item.to && !current
            ? <Link className="font-medium text-[#657976] no-underline transition-colors hover:text-[#1d4a50]" to={item.to}>{item.label}</Link>
            : <span className={current ? 'font-medium text-[#9b7043]' : 'font-medium text-[#657976]'} aria-current={current ? 'page' : undefined}>{item.label}</span>}
        </li>
      })}
    </ol>
  </nav>
}
