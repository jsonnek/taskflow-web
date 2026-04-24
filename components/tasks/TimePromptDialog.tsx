'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface TimePromptDialogProps {
  open: boolean
  taskTitle: string
  estimatedMinutes: number
  onSave: (actualMinutes: number) => void
  onSkip: () => void
}

export function TimePromptDialog({
  open,
  taskTitle,
  estimatedMinutes,
  onSave,
  onSkip,
}: TimePromptDialogProps) {
  const [minutes, setMinutes] = useState(estimatedMinutes)

  function handleSave() {
    onSave(Math.max(1, minutes))
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onSkip() }}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4" />
            How long did it take?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          <p className="text-xs text-muted-foreground truncate">
            {taskTitle}
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="actual-time">Actual time (minutes)</Label>
            <Input
              id="actual-time"
              type="number"
              min={1}
              max={480}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <p className="text-xs text-muted-foreground">
              Estimated: {estimatedMinutes}m
            </p>
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
