import { useState, type InputHTMLAttributes } from 'react'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
  hint?: string
}

export function PasswordInput({ label, hint, ...inputProps }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return <label className="grid gap-[7px] text-[13px] font-medium text-[#405653]">
    {label}
    <span className="relative block">
      <input className="w-full rounded-lg border border-[#ccd5d0] bg-white py-[11px] pr-[46px] pl-3 text-[#203236] outline-none focus:border-[#347077] focus:shadow-[0_0_0_3px_rgba(52,112,119,.12)]" {...inputProps} type={visible ? 'text' : 'password'} />
      <button
        className="absolute top-1/2 right-[7px] grid size-[34px] -translate-y-1/2 cursor-pointer place-items-center rounded-[7px] border-0 bg-transparent p-0 text-[#6b7b78] hover:bg-[#edf2ef] hover:text-[#1d4a50] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#347077]"
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </span>
    {hint && <small className="font-normal text-[#7b8986]">{hint}</small>}
  </label>
}

function EyeIcon() {
  return <svg className="size-5 fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.75" /></svg>
}

function EyeOffIcon() {
  return <svg className="size-5 fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18M10.6 6.15A10.7 10.7 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.3 3.05M6.05 6.05C3.75 7.65 2.5 12 2.5 12s3.5 6 9.5 6c1.25 0 2.4-.26 3.42-.68M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
}
