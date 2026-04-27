'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { DateInput } from '@/components/ui/date-input'

interface TimePromptDialogProps {
  open: boolean
  taskTitle: string
  estimatedMinutes: number
  /** Called with actual minutes logged AND the ISO completedAt string */
  onSave: (actualMinutes: number, completedAt: string) => void
  onSkip: () => void
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function nowDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function nowTimeStr() {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Combine a YYYY-MM-DD date string and HH:MM time string into an ISO string */
function toISO(dateStr: string, timeStr: string): string {
  if (!dateStr) return new Date().toISOString()
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(dateStr + 'T00:00:00')
  d.setHours(h ?? 0, m ?? 0, 0, 0)
  return d.toISOString()
}

export function TimePromptDialog({
  open,
  taskTitle,
  estimatedMinutes,
  onSave,
  onSkip,
}: TimePromptDialogProps) {
  const [minutes, setMinutes] = useState(estimatedMinutes)
  const [dateStr, setDateStr] = useState(nowDateStr)
  const [timeStr, setTimeStr] = useState(nowTimeStr)

  function handleSave() {
    const completedAt = toISO(dateStr, timeStr)
    onSave(Math.max(1, minutes), completedAt)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onSkip() }}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4" />
            Mark complete
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          <p className="text-xs text-muted-foreground truncate">{taskTitle}</p>

          {/* Completion date + time */}
          <div className="space-y-1.5">
            <Label>Completed on</Label>
            <DateInput
              value={dateStr}
              onChange={setDateStr}
              max={nowDateStr()}
              placeholder="Pick date…"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="done-time">Time</Label>
            <Input
              id="done-time"
              type="time"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          {/* Time spent */}
          <div className="space-y-1.5">
            <Label htmlFor="actual-time">Time spent (minutes)</Label>
            <Input
              id="actual-time"
              type="number"
              min={1}
              max={480}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <p className="text-xs text-muted-foreground">Estimated: {estimatedMinutes}m</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1" size="sm">
              Save
            </Button>
            <Button variant="outline" onClick={onSkip} size="sm">
              Skip
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
