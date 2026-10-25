import { Check, ChevronDown, Search } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

export type SelectOption = {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

type SearchableSelectProps = {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  ariaLabel?: string
  className?: string
  required?: boolean
}

export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search options...',
  emptyMessage = 'No matching options.',
  disabled = false,
  ariaLabel,
  className = '',
  required = false,
}: SearchableSelectProps) {
  const listboxId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const selected = options.find((option) => option.value === value)
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    if (!term) return options
    return options.filter((option) => `${option.label} ${option.description ?? ''}`.toLocaleLowerCase().includes(term))
  }, [options, query])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActiveIndex(0)
    requestAnimationFrame(() => searchRef.current?.focus())
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const choose = (option: SelectOption) => {
    if (option.disabled) return
    onChange(option.value)
    setOpen(false)
  }

  const move = (direction: 1 | -1) => {
    if (filtered.length === 0) return
    let next = activeIndex
    do next = (next + direction + filtered.length) % filtered.length
    while (filtered[next]?.disabled && next !== activeIndex)
    setActiveIndex(next)
  }

  return <div className={`relative w-full ${className}`} ref={rootRef}>
      <button
      aria-controls={listboxId}
      aria-expanded={open}
      aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-required={required}
      className="flex min-h-[43px] w-full items-center justify-between gap-3 rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-left text-[13px] text-[#203236] outline-none transition-[border-color,box-shadow] hover:border-[#9eaeaa] focus:border-[#347077] focus:shadow-[0_0_0_3px_rgba(52,112,119,.12)] disabled:cursor-not-allowed disabled:bg-[#eef2f0] disabled:text-[#64736f]"
      disabled={disabled}
      onClick={() => setOpen((current) => !current)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          if (!open) setOpen(true)
          else move(event.key === 'ArrowDown' ? 1 : -1)
        }
      }}
      type="button"
    >
      <span className={`min-w-0 flex-1 truncate ${selected ? '' : 'text-[#87938f]'}`}>{selected?.label ?? placeholder}</span>
      <ChevronDown className={`size-4 shrink-0 text-[#667773] transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
    </button>

    {open && <div className="absolute right-0 z-50 mt-1.5 w-full min-w-[260px] overflow-hidden rounded-xl border border-[#d5ded9] bg-white p-1.5 shadow-[0_16px_42px_rgba(17,44,46,.18)]">
      <div className="mb-1 flex items-center gap-2 rounded-lg bg-[#f2f5f3] px-2.5">
        <Search className="size-4 shrink-0 text-[#778783]" aria-hidden />
        <input
          aria-label="Search options"
          className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-[13px] text-[#203236] outline-none placeholder:text-[#899691]"
          onChange={(event) => { setQuery(event.target.value); setActiveIndex(0) }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); move(event.key === 'ArrowDown' ? 1 : -1) }
            if (event.key === 'Enter' && filtered[activeIndex]) { event.preventDefault(); choose(filtered[activeIndex]) }
            if (event.key === 'Escape') { event.preventDefault(); setOpen(false) }
          }}
          placeholder={searchPlaceholder}
          ref={searchRef}
          value={query}
        />
      </div>
      <div className="max-h-60 overflow-y-auto" id={listboxId} role="listbox">
        {filtered.map((option, index) => <button
          aria-selected={option.value === value}
          className={`flex w-full items-center gap-2 rounded-lg border-0 px-2.5 py-2.5 text-left text-[13px] transition-colors ${option.disabled ? 'cursor-not-allowed text-[#a0aaa7]' : index === activeIndex ? 'cursor-pointer bg-[#eaf1ee] text-[#183f45]' : 'cursor-pointer bg-white text-[#314744] hover:bg-[#f2f5f3]'}`}
          disabled={option.disabled}
          key={option.value}
          onClick={() => choose(option)}
          onMouseEnter={() => setActiveIndex(index)}
          role="option"
          type="button"
        >
          <span className="min-w-0 flex-1"><span className="block truncate font-medium">{option.label}</span>{option.description && <span className="mt-0.5 block truncate text-[11px] font-normal text-[#7b8986]">{option.description}</span>}</span>
          {option.value === value && <Check className="size-4 shrink-0 text-[#347077]" aria-hidden />}
        </button>)}
        {filtered.length === 0 && <p className="m-0 px-3 py-5 text-center text-[13px] text-[#7b8986]">{emptyMessage}</p>}
      </div>
    </div>}
  </div>
}
