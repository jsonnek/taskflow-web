'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_HEADERS = ['S','M','T','W','T','F','S']

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay() }
function pad(n: number) { return String(n).padStart(2, '0') }
function toStr(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}` }
function fmtDisplay(val: string) {
  if (!val) return ''
  const [y, m, d] = val.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Theme tokens — inlined so they work regardless of CSS variable resolution
const T = {
  bg:         '#0d1117',
  border:     'rgba(255,255,255,0.1)',
  text:       '#d0d8e4',
  muted:      'rgba(180,196,210,0.35)',
  dimmed:     'rgba(180,196,210,0.1)',
  primary:    '#22d3ee',
  primaryBg:  'rgba(34,211,238,0.15)',
  hoverBg:    'rgba(255,255,255,0.06)',
  selectedBg: '#22d3ee',
  selectedFg: '#0d1117',
  shadow:     '0 24px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)',
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

export function DateInput({ value, onChange, min, max, id, className, placeholder = 'Pick a date…' }: DateInputProps) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const today = new Date()
  const todayStr = toStr(today.getFullYear(), today.getMonth(), today.getDate())
  const initD = value ? new Date(value + 'T00:00:00') : today
  const [vy, setVy] = useState(initD.getFullYear())
  const [vm, setVm] = useState(initD.getMonth())

  useEffect(() => { setMounted(true) }, [])

  const measure = useCallback(() => {
    if (buttonRef.current) setRect(buttonRef.current.getBoundingClientRect())
  }, [])

  function handleOpen() {
    const d = value ? new Date(value + 'T00:00:00') : today
    setVy(d.getFullYear()); setVm(d.getMonth())
    measure()
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const cal = document.getElementById('__datepicker_portal__')
      if (!buttonRef.current?.contains(e.target as Node) && !cal?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onScroll = () => measure()
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', measure)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', measure)
    }
  }, [open, measure])

  function prevMonth() { vm === 0 ? (setVm(11), setVy(y => y - 1)) : setVm(m => m - 1) }
  function nextMonth() { vm === 11 ? (setVm(0), setVy(y => y + 1)) : setVm(m => m + 1) }

  // Build 42-cell grid
  type Cell = { day: number; cur: boolean; disabled: boolean; ds: string }
  const cells: Cell[] = []
  const first = getFirstDay(vy, vm)
  const dCur = getDaysInMonth(vy, vm)
  const pm = vm === 0 ? 11 : vm - 1; const py = vm === 0 ? vy - 1 : vy
  const nm = vm === 11 ? 0 : vm + 1; const ny = vm === 11 ? vy + 1 : vy
  const dPrev = getDaysInMonth(py, pm)

  for (let i = first - 1; i >= 0; i--) {
    const d = dPrev - i
    cells.push({ day: d, cur: false, disabled: true, ds: toStr(py, pm, d) })
  }
  for (let d = 1; d <= dCur; d++) {
    const ds = toStr(vy, vm, d)
    cells.push({ day: d, cur: true, disabled: (!!min && ds < min) || (!!max && ds > max), ds })
  }
  let nDay = 1
  while (cells.length < 42) cells.push({ day: nDay++, cur: false, disabled: true, ds: toStr(ny, nm, nDay) })

  // Calendar position
  const calTop = rect ? (() => {
    const spaceBelow = window.innerHeight - rect.bottom
    return spaceBelow < 300 ? rect.top - 308 : rect.bottom + 6
  })() : 0
  const calLeft = rect ? Math.min(rect.left, window.innerWidth - 252) : 0

  const calendar = open && rect && (
    <div
      id="__datepicker_portal__"
      style={{
        position: 'fixed',
        top: calTop,
        left: calLeft,
        width: 248,
        zIndex: 99999,
        backgroundColor: T.bg,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        padding: '12px',
        boxShadow: T.shadow,
        fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
        color: T.text,
        userSelect: 'none',
      }}
    >
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button type="button" onClick={prevMonth}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, padding: '4px', borderRadius: 4, lineHeight: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = T.text)}
          onMouseLeave={e => (e.currentTarget.style.color = T.muted)}>
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.02em' }}>
          {MONTHS[vm]} {vy}
        </span>
        <button type="button" onClick={nextMonth}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, padding: '4px', borderRadius: 4, lineHeight: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = T.text)}
          onMouseLeave={e => (e.currentTarget.style.color = T.muted)}>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {DAY_HEADERS.map((h, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 9, color: T.dimmed, padding: '2px 0', textTransform: 'uppercase' }}>{h}</div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: 2 }}>
        {cells.map((cell, i) => {
          const sel = cell.cur && cell.ds === value
          const tod = cell.cur && cell.ds === todayStr
          return (
            <button
              key={i}
              type="button"
              disabled={cell.disabled}
              onClick={() => { if (cell.cur && !cell.disabled) { onChange(cell.ds); setOpen(false) } }}
              style={{
                height: 28,
                width: '100%',
                borderRadius: 5,
                border: tod && !sel ? `1px solid ${T.primary}60` : 'none',
                fontSize: 11,
                fontFamily: 'inherit',
                cursor: cell.disabled ? 'default' : 'pointer',
                backgroundColor: sel ? T.selectedBg : 'transparent',
                color: sel ? T.selectedFg : tod ? T.primary : !cell.cur ? T.dimmed : cell.disabled ? T.dimmed : T.text,
                fontWeight: sel ? 700 : 400,
                transition: 'background 0.1s, color 0.1s',
              }}
              onMouseEnter={e => { if (!sel && cell.cur && !cell.disabled) { e.currentTarget.style.backgroundColor = T.primaryBg; e.currentTarget.style.color = T.primary } }}
              onMouseLeave={e => { if (!sel) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = tod ? T.primary : !cell.cur || cell.disabled ? T.dimmed : T.text } }}
            >
              {cell.day}
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
        <button type="button" onClick={() => { onChange(''); setOpen(false) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit', color: T.muted }}
          onMouseEnter={e => (e.currentTarget.style.color = T.text)}
          onMouseLeave={e => (e.currentTarget.style.color = T.muted)}>
          clear
        </button>
        <button type="button" onClick={() => { onChange(todayStr); setOpen(false) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit', color: T.primary }}
          onMouseEnter={e => (e.currentTarget.style.color = T.text)}
          onMouseLeave={e => (e.currentTarget.style.color = T.primary)}>
          today
        </button>
      </div>
    </div>
  )

  return (
    <div className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        id={id}
        onClick={handleOpen}
        className="flex items-center justify-between w-full h-8 px-3 rounded border border-border bg-input text-sm hover:border-primary/50 hover:bg-input/80 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <span className={cn('text-xs font-mono', value ? 'text-foreground' : 'text-muted-foreground')}>
          {value ? fmtDisplay(value) : placeholder}
        </span>
        <Calendar className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />
      </button>

      {/* Portal: renders into document.body, escapes ALL overflow/z-index constraints */}
      {mounted && calendar && createPortal(calendar, document.body)}
    </div>
  )
}
