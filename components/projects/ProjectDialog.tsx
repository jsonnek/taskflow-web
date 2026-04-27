'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { DateInput } from '@/components/ui/date-input'
import { useStore } from '@/hooks/use-store'
import type { Project } from '@/types'

interface ProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pass an existing project to edit; omit to create */
  editProject?: Project
  /** Pre-select a group when creating from a class page */
  defaultGroupId?: string
}

export function ProjectDialog({ open, onOpenChange, editProject, defaultGroupId }: ProjectDialogProps) {
  const { groups, addProject, updateProject } = useStore()
  const today = new Date().toISOString().split('T')[0]

  const [name, setName]       = useState(editProject?.name ?? '')
  const [notes, setNotes]     = useState(editProject?.notes ?? '')
  const [dueDate, setDueDate] = useState(editProject?.dueDate ? editProject.dueDate.split('T')[0] : '')
  const [groupId, setGroupId] = useState(editProject?.groupId ?? defaultGroupId ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const data = {
      name: name.trim(),
      notes: notes.trim() || undefined,
      dueDate: dueDate ? new Date(dueDate + 'T00:00:00').toISOString() : undefined,
      groupId: groupId || undefined,
    }
    if (editProject) {
      updateProject({ ...editProject, ...data })
    } else {
      addProject(data)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">
            {editProject ? 'edit project' : 'new project'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="proj-name">Name</Label>
            <Input
              id="proj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proj-notes">Notes</Label>
            <Input
              id="proj-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Due Date</Label>
            <DateInput min={today} value={dueDate} onChange={setDueDate} />
          </div>

          {groups.length > 0 && (
            <div className="space-y-1.5">
              <Label>Class / Group</Label>
              <Select value={groupId} onValueChange={(v) => setGroupId(v ?? '')}>
                <SelectTrigger>
                  <span className="text-sm">
                    {groupId
                      ? (groups.find((g) => g.id === groupId)?.name ?? 'No group')
                      : <span className="text-muted-foreground">No group</span>
                    }
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No group</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full inline-block shrink-0"
                          style={{ background: g.colorHex }}
                        />
                        {g.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="submit" className="flex-1" disabled={!name.trim()}>
              {editProject ? 'Save' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
