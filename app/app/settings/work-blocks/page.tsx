'use client'

import { useState } from 'react'
import { Plus, Trash2, Clock } from 'lucide-react'
import { useStore } from '@/hooks/use-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { WorkBlock } from '@/types'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatTime(hour: number, minute: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h = hour % 12 || 12
  return `${h}:${minute.toString().padStart(2, '0')} ${ampm}`
}

function parseTo24(timeStr: string): { hour: number; minute: number } {
  const [h, m] = timeStr.split(':').map(Number)
  return { hour: h, minute: m }
}

export default function WorkBlocksPage() {
  const { workBlocks, addWorkBlock, updateWorkBlock, deleteWorkBlock } = useStore()

  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [day, setDay] = useState('2') // Monday
  const [startTime, setStartTime] = useState('15:00')
  const [endTime, setEndTime] = useState('17:00')

  function resetForm() {
    setName('')
    setDay('2')
    setStartTime('15:00')
    setEndTime('17:00')
    setAdding(false)
    setEditId(null)
  }

  function openEdit(b: WorkBlock) {
    setEditId(b.id)
    setName(b.name)
    setDay(String(b.dayOfWeek))
    setStartTime(
      `${b.startHour.toString().padStart(2, '0')}:${b.startMinute.toString().padStart(2, '0')}`
    )
    setEndTime(
      `${b.endHour.toString().padStart(2, '0')}:${b.endMinute.toString().padStart(2, '0')}`
    )
    setAdding(true)
  }

  function handleSave() {
    const start = parseTo24(startTime)
    const end = parseTo24(endTime)
    const data = {
      name: name || `${DAYS[Number(day) - 1]} block`,
      dayOfWeek: Number(day),
      startHour: start.hour,
      startMinute: start.minute,
      endHour: end.hour,
      endMinute: end.minute,
    }

    if (editId) {
      const existing = workBlocks.find((b) => b.id === editId)
      if (existing) updateWorkBlock({ ...existing, ...data })
    } else {
      addWorkBlock(data)
    }
    resetForm()
  }

  const sorted = [...workBlocks].sort(
    (a, b) =>
      a.dayOfWeek - b.dayOfWeek ||
      a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute)
  )

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Work Blocks</h1>
          <p className="text-sm text-muted-foreground">
            Define your recurring weekly availability for tasks.
          </p>
        </div>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Block
          </Button>
        )}
      </div>

      {/* Add/Edit form */}
      {adding && (
        <div className="rounded-lg border border-border bg-card p-4 mb-4 space-y-3">
          <p className="text-sm font-medium">{editId ? 'Edit Work Block' : 'New Work Block'}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Day</Label>
              <Select value={day} onValueChange={(v) => setDay(v ?? "2")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => (
                    <SelectItem key={i} value={String(i + 1)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="block-name">Name</Label>
              <Input
                id="block-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Study session"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="start-time">Start</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="end-time">End</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm" className="flex-1">
              {editId ? 'Save' : 'Add Block'}
            </Button>
            <Button variant="outline" size="sm" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Block list */}
      {sorted.length === 0 && !adding ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">No work blocks</p>
          <p className="text-xs text-muted-foreground">
            Add time blocks when you&apos;re available to work on tasks.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {sorted.map((b) => {
            const duration = b.endHour * 60 + b.endMinute - (b.startHour * 60 + b.startMinute)
            return (
              <div
                key={b.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{b.name || DAYS[b.dayOfWeek - 1]}</span>
                    <span className="text-xs text-muted-foreground">{DAYS[b.dayOfWeek - 1]}</span>
                  </div>
                  <span className="text-xs mono-nums text-muted-foreground">
                    {formatTime(b.startHour, b.startMinute)} – {formatTime(b.endHour, b.endMinute)}
                    {' · '}{duration}m
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(b)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteWorkBlock(b.id)}
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
