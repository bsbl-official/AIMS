import {LayoutDashboard, ReceiptText, Settings, UsersRound, X} from 'lucide-react'
import {NavLink} from 'react-router-dom'
import {useAuth} from '../../modules/auth/hooks/useAuth'
import {Brand} from '../../shared/components/Brand'
import {SidebarMenuGroup, type SidebarMenuItem} from './SidebarMenuGroup'
import {SidebarSignOut} from './SidebarSignOut'

export function AppSidebar({open, onClose}: { open: boolean; onClose: () => void }) {
    const {can, user} = useAuth()
    const isFinancialYearAdmin = Boolean(user?.superAdmin || user?.organizations.some((organization) => organization.roles.includes('COMPANY_ADMIN')))
    const transactionItems: SidebarMenuItem[] = can('journal.read') || can('journal.create') ? [
        {to: '/transactions/debit-vouchers', label: 'Debit Voucher'},
        {to: '/transactions/credit-vouchers', label: 'Credit Voucher'},
        {to: '/transactions/journal-vouchers', label: 'Journal Voucher'},
        {to: '/transactions/vouchers', label: 'Voucher List'},
    ] : []
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
        ...(can('coa.read') || can('coa.manage') ? [{to: '/setup/initial-coa', label: 'Initial COA setup'}] : []),
        ...(can('financial_statements.read') || can('financial_statements.manage') ? [{
            to: '/setup/financial-statements',
            label: 'Financial Statement setup'
        }] : []),
        ...(can('coa.read') || can('coa.manage') ? [{to: '/setup/chart-of-accounts', label: 'Chart of Account setup'}] : []),
        ...(isFinancialYearAdmin ? [{
            to: '/setup/financial-year',
            label: 'Financial year setup'
        }] : []),
        ...(can('initial_data.read') || can('initial_data.manage') ? [{
            to: '/setup/initial-data',
            label: 'Initial Data Setup'
        }] : []),
        ...(can('voucher_setup.read') || can('voucher_setup.manage') ? [{
            to: '/setup/voucher-setup',
            label: 'Voucher Setup'
        }, {
            to: '/setup/voucher-control',
            label: 'Voucher Control Setup'
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
        className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col overflow-y-auto overscroll-contain bg-[#132a2f] px-5 pt-6 pb-5 text-[#eef3ed] shadow-[18px_0_48px_rgba(8,28,31,.24)] transition-transform duration-200 lg:sticky lg:inset-y-auto lg:top-0 lg:z-auto lg:h-screen lg:w-auto lg:self-start lg:translate-x-0 lg:pt-8 lg:shadow-none ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="relative -mx-5 -mt-6 mb-2 flex h-14 items-center justify-center bg-[#132a2f] px-5 lg:-mt-8">
            <Brand/>
            <button
                className="absolute top-3 right-3 grid size-9 cursor-pointer place-items-center rounded-lg border border-[#d1d9d5] bg-white text-[#29474c] hover:bg-[#edf3f0] lg:hidden"
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
            {transactionItems.length > 0 && <SidebarMenuGroup label="Transactions" icon={ReceiptText} items={transactionItems} onNavigate={onClose}/>}
            <SidebarMenuGroup label="Setup" icon={Settings} items={setupItems} onNavigate={onClose}/>
        </nav>

        <SidebarSignOut onSignedOut={onClose}/>
    </aside>
}
