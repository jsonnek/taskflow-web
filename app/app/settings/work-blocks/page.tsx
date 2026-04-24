'use client'

import { useState } from 'react'
import { Plus, Trash2, Clock } from 'lucide-react'
import { useStore } from '@/hooks/use-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { WorkBlock } from '@/types'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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
  const [selectedDays, setSelectedDays] = useState<number[]>([2]) // Monday default
  const [startTime, setStartTime] = useState('15:00')
  const [endTime, setEndTime] = useState('17:00')

  function resetForm() {
    setName('')
    setSelectedDays([2])
    setStartTime('15:00')
    setEndTime('17:00')
    setAdding(false)
    setEditId(null)
  }

  function openEdit(b: WorkBlock) {
    setEditId(b.id)
    setName(b.name)
    setSelectedDays([b.dayOfWeek])
    setStartTime(
      `${b.startHour.toString().padStart(2, '0')}:${b.startMinute.toString().padStart(2, '0')}`
    )
    setEndTime(
      `${b.endHour.toString().padStart(2, '0')}:${b.endMinute.toString().padStart(2, '0')}`
    )
    setAdding(true)
  }

  function toggleDay(dayNum: number) {
    setSelectedDays((prev) =>
      prev.includes(dayNum) ? prev.filter((d) => d !== dayNum) : [...prev, dayNum]
    )
  }

  function handleSave() {
    if (selectedDays.length === 0) return
    const start = parseTo24(startTime)
    const end = parseTo24(endTime)

    if (editId) {
      // Editing — update the single existing block's time/name, keep its day
      const existing = workBlocks.find((b) => b.id === editId)
      if (existing) {
        updateWorkBlock({
          ...existing,
          name: name || `${DAY_LABELS[existing.dayOfWeek - 1]} block`,
          startHour: start.hour,
          startMinute: start.minute,
          endHour: end.hour,
          endMinute: end.minute,
        })
      }
    } else {
      // Creating — one block per selected day
      for (const dayNum of selectedDays) {
        addWorkBlock({
          name: name || `${DAY_LABELS[dayNum - 1]} block`,
          dayOfWeek: dayNum,
          startHour: start.hour,
          startMinute: start.minute,
          endHour: end.hour,
          endMinute: end.minute,
        })
      }
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
        <div className="rounded-lg border border-border bg-card p-4 mb-4 space-y-4">
          <p className="text-sm font-medium">{editId ? 'Edit Work Block' : 'New Work Block'}</p>

          {/* Day picker — multi-select when creating */}
          <div className="space-y-1.5">
            <Label>
              {editId ? 'Day' : 'Days'}
              {!editId && (
                <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                  Select one or more
                </span>
              )}
            </Label>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map((day, i) => {
                const dayNum = i + 1
                const selected = selectedDays.includes(dayNum)
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => !editId && toggleDay(dayNum)}
                    disabled={!!editId}
                    className={`w-10 h-10 rounded-full text-xs font-medium transition-colors ${
                      selected
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border hover:bg-muted'
                    } ${editId ? 'opacity-60 cursor-default' : ''}`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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

          <div className="space-y-1.5">
            <Label htmlFor="block-name">
              Name
              <span className="ml-1.5 text-xs text-muted-foreground font-normal">optional</span>
            </Label>
            <Input
              id="block-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Study session"
            />
          </div>

          {!editId && selectedDays.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Will create {selectedDays.length} blocks:{' '}
              {selectedDays
                .sort((a, b) => a - b)
                .map((d) => DAY_LABELS[d - 1])
                .join(', ')}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              size="sm"
              className="flex-1"
              disabled={selectedDays.length === 0}
            >
              {editId ? 'Save' : `Add ${selectedDays.length > 1 ? `${selectedDays.length} Blocks` : 'Block'}`}
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
                <div className="w-8 text-center shrink-0">
                  <span className="text-xs font-medium text-muted-foreground">
                    {DAYS[b.dayOfWeek - 1]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{b.name || DAY_LABELS[b.dayOfWeek - 1]}</span>
                  <div className="text-xs mono-nums text-muted-foreground">
                    {formatTime(b.startHour, b.startMinute)} – {formatTime(b.endHour, b.endMinute)}
                    {' · '}{duration}m
                  </div>
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
