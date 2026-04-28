'use client'

import { useState } from 'react'
import { Timer } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { DateInput } from '@/components/ui/date-input'

interface LogTimeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskTitle: string
  estimatedMinutes: number
  alreadyLoggedMinutes: number
  onSave: (minutes: number, endedAt: string) => void
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
function toISO(dateStr: string, timeStr: string): string {
  if (!dateStr) return new Date().toISOString()
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(dateStr + 'T00:00:00')
  d.setHours(h ?? 0, m ?? 0, 0, 0)
  return d.toISOString()
}

export function LogTimeDialog({
  open, onOpenChange, taskTitle, estimatedMinutes, alreadyLoggedMinutes, onSave,
}: LogTimeDialogProps) {
  const remaining = Math.max(estimatedMinutes - alreadyLoggedMinutes, 0)
  const [minutes, setMinutes] = useState(remaining || estimatedMinutes)
  const [dateStr, setDateStr] = useState(nowDateStr)
  const [timeStr, setTimeStr] = useState(nowTimeStr)

  function handleSave() {
    const endedAt = toISO(dateStr, timeStr)
    onSave(Math.max(1, minutes), endedAt)
    onOpenChange(false)
  }

  const totalAfter = alreadyLoggedMinutes + minutes
  const overEstimate = totalAfter > estimatedMinutes

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Timer className="w-4 h-4 text-primary" />
            Log time
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          <p className="text-xs text-muted-foreground truncate">{taskTitle}</p>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
              <span>{alreadyLoggedMinutes}m logged</span>
              <span>{estimatedMinutes}m est.</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min((alreadyLoggedMinutes / estimatedMinutes) * 100, 100)}%`,
                  background: 'oklch(0.82 0.12 207)',
                }}
              />
            </div>
          </div>

          {/* When */}
          <div className="space-y-1.5">
            <Label>Date</Label>
            <DateInput value={dateStr} onChange={setDateStr} max={nowDateStr()} placeholder="Pick date…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="log-time-end">Finished at</Label>
            <Input
              id="log-time-end"
              type="time"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <Label htmlFor="log-mins">Time spent (minutes)</Label>
            <Input
              id="log-mins"
              type="number"
              min={1}
              max={480}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            {overEstimate && (
              <p className="text-[10px] font-mono text-amber-400">
                {totalAfter}m total — {totalAfter - estimatedMinutes}m over estimate
              </p>
            )}
            {!overEstimate && remaining > 0 && (
              <p className="text-[10px] font-mono text-muted-foreground">
                ~{remaining - minutes}m remaining after this
              </p>
            )}
          </div>

          <Button onClick={handleSave} className="w-full" size="sm">
            Save session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
