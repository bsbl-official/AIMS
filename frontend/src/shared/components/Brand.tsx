import aimsLoginLogo from '../../assets/AIMS_Logo .png'
import aimsSidebarLogo from '../../assets/AIMS_Sidebar.png'

type BrandProps = {
  placement?: 'sidebar' | 'login'
}

export function Brand({ placement = 'sidebar' }: BrandProps) {
  const login = placement === 'login'
  return <img
    className={login ? 'h-auto w-full max-w-[360px]' : 'h-auto w-auto max-h-10 max-w-[138px] object-contain'}
    src={login ? aimsLoginLogo : aimsSidebarLogo}
    alt="AIMS — Accounting Information Management System"
  />
}
