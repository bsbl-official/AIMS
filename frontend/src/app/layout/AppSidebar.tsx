import {LayoutDashboard, ReceiptText, Settings, UsersRound, X} from 'lucide-react'
import {NavLink} from 'react-router-dom'
import {useAuth} from '../../modules/auth/hooks/useAuth'
import {Brand} from '../../shared/components/Brand'
import {SidebarMenuGroup, type SidebarMenuItem} from './SidebarMenuGroup'
import {SidebarSignOut} from './SidebarSignOut'

const transactionItems: SidebarMenuItem[] = [
    {to: '/journals', label: 'Journal vouchers'},
]

export function AppSidebar({open, onClose}: { open: boolean; onClose: () => void }) {
    const {can} = useAuth()
    const setupItems: SidebarMenuItem[] = [
        ...(can('companies.read') || can('companies.manage') ? [{to: '/setup/company', label: 'Company setup'}] : []),
        ...(can('branches.read') || can('branches.manage') ? [{to: '/setup/branches', label: 'Branch setup'}] : []),
        ...(can('project_codes.read') || can('project_codes.manage') ? [{
            to: '/setup/project-codes',
            label: 'Project setup'
        }] : []),
        ...(can('finance_codes.read') || can('finance_codes.manage') ? [{
            to: '/setup/finance-codes',
            label: 'Finance setup'
        }] : []),
        ...(can('component_codes.read') || can('component_codes.manage') ? [{
            to: '/setup/component-codes',
            label: 'Component setup'
        }] : []),
        ...(can('coa.read') || can('coa.manage') ? [{to: '/accounts', label: 'COA setup'}] : []),
        ...(can('financial_statements.read') || can('financial_statements.manage') ? [{
            to: '/setup/financial-statements',
            label: 'Financial Statement setup'
        }] : []),
    ]
    const userManagementItems: SidebarMenuItem[] = [
        ...(can('users.read') || can('users.manage') ? [{to: '/user-management/users', label: 'Users'}] : []),
        ...(can('roles.read') || can('roles.manage') ? [{
            to: '/user-management/roles',
            label: 'Roles & permissions'
        }] : []),
    ]

    return <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col overflow-y-auto bg-[#132a2f] px-5 pt-6 pb-5 text-[#eef3ed] shadow-[18px_0_48px_rgba(8,28,31,.24)] transition-transform duration-200 lg:static lg:z-auto lg:w-auto lg:min-h-screen lg:translate-x-0 lg:pt-8 lg:shadow-none ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-start justify-between px-2.5 pb-7">
            <Brand/>
            <button
                className="grid size-9 cursor-pointer place-items-center rounded-lg border border-[#355157] bg-transparent text-[#b9c8c6] hover:bg-[#1a383e] hover:text-white lg:hidden"
                type="button" onClick={onClose} aria-label="Close navigation"><X className="size-5" aria-hidden/>
            </button>
        </div>

        <nav className="grid gap-1.5" aria-label="Primary navigation">
            <NavLink
                to="/"
                end
                onClick={onClose}
                className={({isActive}) => `flex items-center gap-3 rounded-lg px-[13px] py-[11px] text-sm font-medium no-underline transition-colors ${isActive ? 'bg-[#23464b] text-white shadow-[inset_3px_0_#d7b66d]' : 'text-[#b9c8c6] hover:bg-[#1a383e] hover:text-white'}`}
            >
                <LayoutDashboard className="size-[18px] shrink-0" aria-hidden/>
                <span>Dashboard</span>
            </NavLink>

            {userManagementItems.length > 0 &&
                <SidebarMenuGroup label="User Management" icon={UsersRound} items={userManagementItems}
                                  onNavigate={onClose}/>}
            <SidebarMenuGroup label="Transactions" icon={ReceiptText} items={transactionItems} onNavigate={onClose}/>
            <SidebarMenuGroup label="Setup" icon={Settings} items={setupItems} onNavigate={onClose}/>
        </nav>

        <SidebarSignOut onSignedOut={onClose}/>
    </aside>
}
