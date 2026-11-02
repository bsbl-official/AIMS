type SwitchProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  ariaLabel: string
}

export function Switch({ checked, onCheckedChange, disabled = false, ariaLabel }: SwitchProps) {
  return <button
    aria-checked={checked}
    aria-label={ariaLabel}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors focus:outline-none focus:ring-3 focus:ring-[#347077]/20 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-[#347077]' : 'bg-[#aebbb7]'}`}
    disabled={disabled}
    onClick={() => onCheckedChange(!checked)}
    role="switch"
    type="button"
  >
    <span className={`pointer-events-none block size-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
  </button>
}
