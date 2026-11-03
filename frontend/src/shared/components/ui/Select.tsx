import { Check, ChevronDown, Search } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type SelectOption = {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export type SelectProps = {
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
  searchable?: boolean
}

export function Select({
  value, options, onChange, placeholder = 'Select an option', searchPlaceholder = 'Search options...',
  emptyMessage = 'No matching options.', disabled = false, ariaLabel, className = '', required = false,
  searchable = true,
}: SelectProps) {
  const listboxId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [position, setPosition] = useState<{ left: number; top: number; width: number } | null>(null)
  const selected = options.find((option) => option.value === value)
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    if (!term) return options
    return options.filter((option) => `${option.label} ${option.description ?? ''}`.toLocaleLowerCase().includes(term))
  }, [options, query])

  useEffect(() => {
    if (!open) return
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.max(rect.width, 260)
      setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)), top: rect.bottom + 6, width })
    }
    const close = (event: PointerEvent) => {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !contentRef.current?.contains(target)) setOpen(false)
    }
    setQuery('')
    setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)))
    updatePosition()
    document.addEventListener('pointerdown', close)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    if (searchable) requestAnimationFrame(() => searchRef.current?.focus())
    return () => {
      document.removeEventListener('pointerdown', close)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, options, searchable, value])

  const choose = (option: SelectOption) => {
    if (option.disabled) return
    onChange(option.value)
    setOpen(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }
  const move = (direction: 1 | -1) => {
    if (filtered.length === 0) return
    let next = activeIndex
    do next = (next + direction + filtered.length) % filtered.length
    while (filtered[next]?.disabled && next !== activeIndex)
    setActiveIndex(next)
  }

  const menu = open && position && <div className="fixed z-[100] overflow-hidden rounded-xl border border-[#d5ded9] bg-white p-1.5 shadow-[0_16px_42px_rgba(17,44,46,.18)]" data-select-popover ref={contentRef} style={position}>
    {searchable && <div className="mb-1 flex items-center gap-2 rounded-lg bg-[#f2f5f3] px-2.5">
      <Search className="size-4 shrink-0 text-[#778783]" aria-hidden />
      <input aria-label={`Search ${ariaLabel ?? 'options'}`} className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-[13px] text-[#203236] outline-none placeholder:text-[#899691]"
        onChange={(event) => { setQuery(event.target.value); setActiveIndex(0) }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); move(event.key === 'ArrowDown' ? 1 : -1) }
          if (event.key === 'Enter' && filtered[activeIndex]) { event.preventDefault(); choose(filtered[activeIndex]) }
          if (event.key === 'Escape') { event.preventDefault(); setOpen(false); triggerRef.current?.focus() }
        }} placeholder={searchPlaceholder} ref={searchRef} value={query} />
    </div>}
    <div className="max-h-60 overflow-y-auto" id={listboxId} role="listbox">
      {filtered.map((option, index) => <button aria-selected={option.value === value}
        className={`flex w-full items-center gap-2 rounded-lg border-0 px-2.5 py-2.5 text-left text-[13px] transition-colors ${option.disabled ? 'cursor-not-allowed text-[#a0aaa7]' : index === activeIndex ? 'cursor-pointer bg-[#eaf1ee] text-[#183f45]' : 'cursor-pointer bg-white text-[#314744] hover:bg-[#f2f5f3]'}`}
        disabled={option.disabled} key={option.value} onClick={() => choose(option)} onMouseEnter={() => setActiveIndex(index)} role="option" type="button">
        <span className="min-w-0 flex-1"><span className="block truncate font-medium">{option.label}</span>{option.description && <span className="mt-0.5 block truncate text-[11px] font-normal text-[#7b8986]">{option.description}</span>}</span>
        {option.value === value && <Check className="size-4 shrink-0 text-[#347077]" aria-hidden />}
      </button>)}
      {filtered.length === 0 && <p className="m-0 px-3 py-5 text-center text-[13px] text-[#7b8986]">{emptyMessage}</p>}
    </div>
  </div>

  return <div className={`relative w-full ${className}`}>
    <button aria-controls={open ? listboxId : undefined} aria-expanded={open} aria-haspopup="listbox" aria-label={ariaLabel} aria-required={required}
      className="flex min-h-[43px] w-full items-center justify-between gap-3 rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-left text-[13px] text-[#203236] outline-none transition-[border-color,box-shadow] hover:border-[#9eaeaa] focus:border-[#347077] focus:shadow-[0_0_0_3px_rgba(52,112,119,.12)] disabled:cursor-not-allowed disabled:bg-[#eef2f0] disabled:text-[#64736f]"
      disabled={disabled} onClick={() => setOpen((current) => !current)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (!open) setOpen(true); else move(event.key === 'ArrowDown' ? 1 : -1) }
        if (event.key === 'Enter' && open && filtered[activeIndex]) { event.preventDefault(); choose(filtered[activeIndex]) }
        if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false) }
      }} ref={triggerRef} type="button">
      <span className={`min-w-0 flex-1 truncate ${selected ? '' : 'text-[#87938f]'}`}>{selected?.label ?? placeholder}</span>
      <ChevronDown className={`size-4 shrink-0 text-[#667773] transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
    </button>
    {menu && createPortal(menu, document.body)}
  </div>
}
