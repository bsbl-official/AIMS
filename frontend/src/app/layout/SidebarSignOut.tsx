import { LogOut } from 'lucide-react'
import { useAuth } from '../../modules/auth/hooks/useAuth'
import { useToast } from '../../modules/toast/hooks/useToast'

export function SidebarSignOut({ onSignedOut }: { onSignedOut?: () => void }) {
  const { logout } = useAuth()
  const toast = useToast()

  async function handleSignOut() {
    await logout()
    onSignedOut?.()
    toast.success('Your session has ended safely.', 'Signed out')
  }

  return <div className="mt-auto border-t border-[#2a4449] pt-4 max-md:mt-5">
    <button
      className="flex w-full cursor-pointer items-center gap-3 rounded-lg border-0 bg-transparent px-[13px] py-[11px] text-left text-sm font-medium text-[#b9c8c6] transition-colors hover:bg-[#1a383e] hover:text-white"
      type="button"
      onClick={() => void handleSignOut()}
    >
      <LogOut className="size-[18px] shrink-0" aria-hidden />
      <span>Sign out</span>
    </button>
  </div>
}
