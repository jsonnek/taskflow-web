'use client'

import { useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { nanoid } from 'nanoid'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/hooks/use-store'
import { useKeyboard } from '@/hooks/use-keyboard'

export function QuickCapture() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [subject, setSubject] = useState('')
  const { addAssignment, groups } = useStore()

  const openModal = useCallback(() => setOpen(true), [])
  useKeyboard('k', openModal, { meta: true })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    addAssignment({
      title: title.trim(),
      subject: subject || 'General',
      dueDate: dueDate
        ? new Date(dueDate).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      estimatedMinutes: 30,
      difficulty: 3,
      importance: 3,
      isCompleted: false,
      isPriority: false,
      isSplittable: true,
      prerequisiteIds: [],
    })

    setTitle('')
    setDueDate('')
    setSubject('')
    setOpen(false)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <>
      {/* Floating button */}
      <button
        onClick={openModal}
        className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded border border-primary/40 bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 hover:border-primary/70 transition-all ring-glow"
        aria-label="Quick capture (⌘K)"
      >
        <Plus className="w-4 h-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Quick Capture
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 mt-1">
            <div className="space-y-1.5">
              <Label htmlFor="qc-title">Task</Label>
              <Input
                id="qc-title"
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qc-due">Due date</Label>
              <Input
                id="qc-due"
                type="date"
                min={today}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={(v) => setSubject(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a subject…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.name}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="submit" className="flex-1" disabled={!title.trim()}>
                Add Task
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
