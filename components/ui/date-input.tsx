'use client'

import { useRef } from 'react'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DateInputProps {
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  id?: string
  className?: string
  placeholder?: string
}

function formatDisplay(val: string): string {
  if (!val) return ''
  // Parse as local date (avoid UTC offset shifting the day)
  const [y, m, d] = val.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function DateInput({
  value, onChange, min, max, id, className, placeholder = 'Pick a date…',
}: DateInputProps) {
  const ref = useRef<HTMLInputElement>(null)

  function open() {
    // showPicker() is supported in modern browsers; fall back to focus+click
    try { ref.current?.showPicker() } catch { ref.current?.click() }
  }

  return (
    <div className={cn('relative', className)}>
      {/* Hidden native input handles the actual date picking */}
      <input
        ref={ref}
        id={id}
        type="date"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Visible styled trigger */}
      <button
        type="button"
        onClick={open}
        className="flex items-center justify-between w-full h-8 px-3 rounded border border-border bg-input text-sm hover:border-primary/50 hover:bg-input/80 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <span className={value ? 'text-foreground font-mono text-xs' : 'text-muted-foreground text-xs'}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <Calendar className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />
      </button>
    </div>
  )
}
