import aimsLogo from '../../assets/AIMS_LOGO.png'
import aimsWordmark from '../../assets/AIMS.png'

type BrandProps = {
  tone?: 'light' | 'dark'
  placement?: 'sidebar' | 'login'
}

export function Brand({ tone = 'light', placement = 'sidebar' }: BrandProps) {
  const login = placement === 'login'
  const gap = login ? 'gap-3' : 'gap-1.5'
  const logoFrame = login ? 'h-[42px] w-[51px]' : 'h-5 w-[25px]'
  const logoImage = login
    ? 'h-[58px] -top-[14px] -left-[14px]'
    : 'h-7 -top-[7px] -left-[7px]'
  const wordmarkFrame = login ? 'h-[42px] w-[163px]' : 'h-5 w-[78px]'
  const wordmarkImage = login
    ? 'h-[81px] -top-[19px] -left-[18px]'
    : 'h-[38px] -top-[9px] -left-2'

  return <div className={`flex items-center ${gap}`}>
    <span className={`${logoFrame} relative shrink-0 overflow-hidden`}>
      <img className={`${logoImage} absolute w-auto max-w-none`} src={aimsLogo} alt="AIMS logo" />
    </span>
    <span className={`${wordmarkFrame} relative shrink-0 overflow-hidden`}>
      <img
        className={`${wordmarkImage} absolute w-auto max-w-none ${tone === 'dark' ? 'brightness-0 opacity-80' : ''}`}
        src={aimsWordmark}
        alt="AIMS"
      />
    </span>
  </div>
}
