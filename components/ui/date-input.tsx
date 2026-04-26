'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAY_HEADERS = ['S','M','T','W','T','F','S']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDay(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}
function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
function formatDisplay(val: string) {
  if (!val) return ''
  const [y, m, d] = val.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

interface DateInputProps {
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  id?: string
  className?: string
  placeholder?: string
}

export function DateInput({
  value, onChange, min, max, id, className, placeholder = 'Pick a date…',
}: DateInputProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  const today = new Date()
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  const initFrom = value ? new Date(value + 'T00:00:00') : today
  const [viewYear, setViewYear] = useState(initFrom.getFullYear())
  const [viewMonth, setViewMonth] = useState(initFrom.getMonth())

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        !buttonRef.current?.contains(e.target as Node) &&
        !calendarRef.current?.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Reposition if window scrolls/resizes while open
  const reposition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    // Flip above if not enough space below
    const spaceBelow = window.innerHeight - rect.bottom
    const calH = 280
    const top = spaceBelow < calH ? rect.top - calH - 6 : rect.bottom + 6
    setPos({ top, left: rect.left, width: rect.width })
  }, [])

  function handleOpen() {
    const d = value ? new Date(value + 'T00:00:00') : today
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
    reposition()
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, reposition])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function selectDay(day: number) {
    onChange(toDateStr(viewYear, viewMonth, day))
    setOpen(false)
  }

  // Build 6×7 grid
  type Cell = { day: number; cur: boolean; disabled: boolean; dateStr: string }
  const cells: Cell[] = []
  const firstDay = getFirstDay(viewYear, viewMonth)
  const daysInCur = getDaysInMonth(viewYear, viewMonth)
  const prevM = viewMonth === 0 ? 11 : viewMonth - 1
  const prevY = viewMonth === 0 ? viewYear - 1 : viewYear
  const nextM = viewMonth === 11 ? 0 : viewMonth + 1
  const nextY = viewMonth === 11 ? viewYear + 1 : viewYear

  for (let i = firstDay - 1; i >= 0; i--) {
    const day = getDaysInMonth(prevY, prevM) - i
    cells.push({ day, cur: false, disabled: true, dateStr: toDateStr(prevY, prevM, day) })
  }
  for (let d = 1; d <= daysInCur; d++) {
    const ds = toDateStr(viewYear, viewMonth, d)
    const disabled = (!!min && ds < min) || (!!max && ds > max)
    cells.push({ day: d, cur: true, disabled, dateStr: ds })
  }
  while (cells.length < 42) {
    const day = cells.length - firstDay - daysInCur + 1
    cells.push({ day, cur: false, disabled: true, dateStr: toDateStr(nextY, nextM, day) })
  }

  return (
    <div className={cn('relative', className)}>
      {/* Trigger */}
      <button
        ref={buttonRef}
        type="button"
        id={id}
        onClick={handleOpen}
        className="flex items-center justify-between w-full h-8 px-3 rounded border border-border bg-input text-sm hover:border-primary/50 hover:bg-input/80 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <span className={cn('text-xs font-mono', value ? 'text-foreground' : 'text-muted-foreground')}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <Calendar className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />
      </button>

      {/* Calendar — rendered via fixed positioning to escape overflow:hidden parents */}
      {open && (
        <div
          ref={calendarRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, minWidth: 240, zIndex: 9999 }}
          className="rounded-lg border border-border bg-card shadow-2xl shadow-black/70 p-3 select-none"
        >
          {/* Month nav */}
          <div className="flex items-center justify-between mb-2.5">
            <button type="button" onClick={prevMonth}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono font-semibold tracking-wide">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_HEADERS.map((h, i) => (
              <div key={i} className="text-center text-[9px] font-mono text-muted-foreground/50 py-0.5 uppercase">
                {h}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((cell, i) => {
              const isSelected = cell.cur && cell.dateStr === value
              const isToday = cell.cur && cell.dateStr === todayStr
              return (
                <button
                  key={i}
                  type="button"
                  disabled={cell.disabled}
                  onClick={() => cell.cur && !cell.disabled && selectDay(cell.day)}
                  className={cn(
                    'h-7 w-full rounded text-[11px] font-mono transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground font-bold'
                      : isToday
                      ? 'border border-primary/60 text-primary'
                      : !cell.cur
                      ? 'text-muted-foreground/15 cursor-default'
                      : cell.disabled
                      ? 'text-muted-foreground/25 cursor-not-allowed'
                      : 'text-foreground hover:bg-primary/15 hover:text-primary cursor-pointer'
                  )}
                >
                  {cell.day}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border">
            <button type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className="text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors px-1">
              clear
            </button>
            <button type="button"
              onClick={() => { onChange(todayStr); setOpen(false) }}
              className="text-[10px] font-mono text-primary hover:text-primary/70 transition-colors px-1">
              today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
