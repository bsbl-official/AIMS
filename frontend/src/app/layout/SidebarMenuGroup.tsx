import { useState, type ComponentType } from 'react'
import { ChevronDown } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'

export type SidebarMenuItem = {
  to: string
  label: string
}

type SidebarMenuGroupProps = {
  label: string
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  items: SidebarMenuItem[]
  defaultOpen?: boolean
  onNavigate?: () => void
}

export function SidebarMenuGroup({ label, icon: Icon, items, defaultOpen = false, onNavigate }: SidebarMenuGroupProps) {
  const location = useLocation()
  const containsActiveRoute = items.some((item) => location.pathname === item.to)
  const [isOpen, setIsOpen] = useState(defaultOpen || containsActiveRoute)

  return <div>
    <button
      type="button"
      className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border-0 px-[13px] py-[11px] text-left text-sm font-medium transition-colors ${containsActiveRoute ? 'bg-[#23464b] text-white shadow-[inset_3px_0_#d7b66d]' : 'bg-transparent text-[#b9c8c6] hover:bg-[#1a383e] hover:text-white'}`}
      onClick={() => setIsOpen((current) => !current)}
      aria-expanded={isOpen}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden />
      <span className="flex-1">{label}</span>
      <ChevronDown className={`size-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
    </button>

    {isOpen && <div className="relative mt-1 ml-[21px] grid gap-0.5 border-l border-[#355157] pl-[21px]">
      {items.map((item) => <NavLink
        key={item.to}
        to={item.to}
        onClick={onNavigate}
        className={({ isActive }) => `relative rounded-md px-3 py-2.5 text-[13px] font-medium no-underline transition-colors before:absolute before:top-1/2 before:-left-[22px] before:h-px before:w-3 before:bg-[#355157] ${isActive ? 'bg-[#23464b] text-white' : 'text-[#9fb2b0] hover:bg-[#1a383e] hover:text-white'}`}
      >
        {item.label}
      </NavLink>)}
    </div>}
  </div>
}
