import {Menu} from 'lucide-react'
import {useAuth} from '../../modules/auth/hooks/useAuth'

export function TopHeader({onMenuToggle}: { onMenuToggle: () => void }) {
    const {user} = useAuth()
    const organization = user?.organizations[0]
    const initials = user?.displayName
        .split(/\s+/)
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()

    return <header
        className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#dde2dd] bg-white/90 px-4 backdrop-blur-lg sm:px-5 lg:h-[72px] lg:px-7 xl:px-9 2xl:px-10">
        <div className="flex min-w-0 items-center gap-3">
            <button
                className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg border border-[#d7dfda] bg-white text-[#294e52] shadow-sm lg:hidden"
                type="button" onClick={onMenuToggle} aria-label="Open navigation"><Menu className="size-5" aria-hidden/>
            </button>
            <div className="min-w-0">
                <small
                    className="mt-0.5 block text-[11px] tracking-[.08em] text-[#778784] uppercase">Organization</small>
                <strong className="block truncate">{organization?.organizationName ?? 'Account BM'}</strong>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="text-right max-sm:hidden">
                <strong className="block">{user?.displayName}</strong>
                <span className="text-xs text-[#54706f]">{user?.email}</span>
            </div>
            <div className="grid size-9 place-items-center rounded-full bg-[#9b7043] text-xs font-medium text-white"
                 aria-hidden>{initials}</div>
        </div>
    </header>
}
