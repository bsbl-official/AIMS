import { DayPicker } from '@daypicker/react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

type CalendarPickerProps = {
  value: string
  onChange?: (value: string) => void
  precision?: 'day' | 'month'
  disabled?: boolean
  readOnly?: boolean
  ariaLabel?: string
  placeholder?: string
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function parseDay(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return year && month && day ? new Date(year, month - 1, day) : undefined
}

function dayValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function display(value: string, precision: CalendarPickerProps['precision']) {
  const date = precision === 'month' ? parseDay(`${value}-01`) : parseDay(value)
  if (!date) return ''
  return new Intl.DateTimeFormat('en-US', precision === 'month'
    ? { month: 'long', year: 'numeric' }
    : { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

export function CalendarPicker({ value, onChange, precision = 'day', disabled = false, readOnly = false, ariaLabel, placeholder }: CalendarPickerProps) {
  const popoverId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const selectedDay = parseDay(precision === 'month' ? `${value}-01` : value)
  const [open, setOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(selectedDay ?? new Date())

  useEffect(() => {
    if (selectedDay) setCalendarMonth(selectedDay)
  }, [value])

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', close)
    window.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', close); window.removeEventListener('keydown', escape) }
  }, [open])

  const chooseMonth = (month: number) => {
    onChange?.(`${calendarMonth.getFullYear()}-${String(month + 1).padStart(2, '0')}`)
    setOpen(false)
  }

  return <div className="relative w-full" ref={rootRef}>
    <button
      type="button"
      aria-label={ariaLabel}
      aria-controls={popoverId}
      aria-expanded={open}
      className="flex min-h-[43px] w-full items-center justify-between gap-3 rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-left text-[13px] text-[#203236] outline-none transition-[border-color,box-shadow] hover:border-[#9eaeaa] focus:border-[#347077] focus:shadow-[0_0_0_3px_rgba(52,112,119,.12)] disabled:cursor-not-allowed disabled:bg-[#eef2f0] disabled:text-[#64736f]"
      disabled={disabled || readOnly}
      onClick={() => setOpen((current) => !current)}
    >
      <span className={value ? '' : 'text-[#87938f]'}>{display(value, precision) || placeholder || (precision === 'month' ? 'Select month and year' : 'Select date')}</span>
      <CalendarDays className="size-4 shrink-0 text-[#52706b]" aria-hidden />
    </button>
    {open && <div id={popoverId} className="aims-calendar absolute left-0 z-[80] mt-1.5 rounded-xl border border-[#cddbd5] bg-white p-3 shadow-[0_18px_48px_rgba(17,44,46,.22)]">
      {precision === 'day' ? <DayPicker
        animate
        mode="single"
        month={calendarMonth}
        onMonthChange={setCalendarMonth}
        selected={selectedDay}
        showOutsideDays
        onSelect={(date) => { if (date) { onChange?.(dayValue(date)); setOpen(false) } }}
      /> : <div className="w-[292px]">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" className="grid size-9 cursor-pointer place-items-center rounded-lg border-0 bg-[#eef4f1] text-[#315f5c] hover:bg-[#dfece7]" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear() - 1, calendarMonth.getMonth(), 1))} aria-label="Previous year"><ChevronLeft className="size-4" /></button>
          <span className="text-sm text-[#203c40]">{calendarMonth.getFullYear()}</span>
          <button type="button" className="grid size-9 cursor-pointer place-items-center rounded-lg border-0 bg-[#eef4f1] text-[#315f5c] hover:bg-[#dfece7]" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear() + 1, calendarMonth.getMonth(), 1))} aria-label="Next year"><ChevronRight className="size-4" /></button>
        </div>
        <div className="grid grid-cols-3 gap-2">{MONTHS.map((month, index) => {
          const active = selectedDay?.getFullYear() === calendarMonth.getFullYear() && selectedDay.getMonth() === index
          return <button type="button" key={month} onClick={() => chooseMonth(index)} className={`cursor-pointer rounded-lg border px-2 py-2.5 text-[13px] transition-colors ${active ? 'border-[#2f716d] bg-[#2f716d] text-white' : 'border-[#d9e4df] bg-white text-[#334b47] hover:border-[#98b5aa] hover:bg-[#eaf3ef]'}`}>{month.slice(0, 3)}</button>
        })}</div>
      </div>}
    </div>}
  </div>
}
