'use client'

import { useState } from 'react'
import { nanoid } from 'nanoid'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useStore } from '@/hooks/use-store'
import { predictionStore } from '@/lib/store'
import type { Assignment, RecurrenceRule, Template } from '@/types'

interface AddTaskSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editTask?: Assignment
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function DotRating({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (v: number) => void
  label: string
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-6 h-6 rounded-full border-2 transition-colors ${
              n <= value
                ? 'bg-primary border-primary'
                : 'border-border hover:border-primary/50'
            }`}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1 self-center mono-nums">{value}/5</span>
      </div>
    </div>
  )
}

export function AddTaskSheet({ open, onOpenChange, editTask }: AddTaskSheetProps) {
  const { groups, projects, assignments, templates, addAssignment, updateAssignment, addTemplate } =
    useStore()

  const [title, setTitle] = useState(editTask?.title ?? '')
  const [subject, setSubject] = useState(editTask?.subject ?? '')
  const [dueDate, setDueDate] = useState(
    editTask?.dueDate ? editTask.dueDate.split('T')[0] : ''
  )
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    editTask?.estimatedMinutes ?? 30
  )
  const [difficulty, setDifficulty] = useState(editTask?.difficulty ?? 3)
  const [importance, setImportance] = useState(editTask?.importance ?? 3)
  const [isPriority, setIsPriority] = useState(editTask?.isPriority ?? false)
  const [isSplittable, setIsSplittable] = useState(editTask?.isSplittable ?? true)
  const [projectId, setProjectId] = useState(editTask?.projectId ?? '')
  const [prerequisiteIds, setPrerequisiteIds] = useState<string[]>(
    editTask?.prerequisiteIds ?? []
  )
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')

  // Recurrence
  const [hasRecurrence, setHasRecurrence] = useState(!!editTask?.recurrenceRuleData)
  const [recFrequency, setRecFrequency] = useState<RecurrenceRule['frequency']>(
    editTask?.recurrenceRuleData?.frequency ?? 'weekly'
  )
  const [recInterval, setRecInterval] = useState(editTask?.recurrenceRuleData?.interval ?? 1)
  const [recDays, setRecDays] = useState<number[]>(
    editTask?.recurrenceRuleData?.daysOfWeek ?? []
  )
  const [recEndDate, setRecEndDate] = useState(editTask?.recurrenceRuleData?.endDate ?? '')

  // Smart prediction
  const predictionFactor = subject ? predictionStore.getForSubject(subject) : undefined
  const predictedMinutes = predictionFactor
    ? Math.round(estimatedMinutes * predictionFactor.factor)
    : null

  const today = new Date().toISOString().split('T')[0]

  function loadTemplate(t: Template) {
    if (t.subject) setSubject(t.subject)
    if (t.estimatedMinutes) setEstimatedMinutes(t.estimatedMinutes)
    if (t.difficulty) setDifficulty(t.difficulty)
    if (t.importance) setImportance(t.importance)
    if (t.isSplittable !== undefined) setIsSplittable(t.isSplittable)
    if (t.recurrenceRuleData) {
      setHasRecurrence(true)
      setRecFrequency(t.recurrenceRuleData.frequency)
      setRecInterval(t.recurrenceRuleData.interval)
      setRecDays(t.recurrenceRuleData.daysOfWeek)
      setRecEndDate(t.recurrenceRuleData.endDate ?? '')
    }
  }

  function toggleDay(day: number) {
    setRecDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  function togglePrereq(id: string) {
    setPrerequisiteIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    const recurrenceRuleData: RecurrenceRule | undefined = hasRecurrence
      ? {
          frequency: recFrequency,
          daysOfWeek: recDays,
          interval: recInterval,
          endDate: recEndDate || undefined,
        }
      : undefined

    const data: Omit<Assignment, 'id' | 'createdAt'> = {
      title: title.trim(),
      subject: subject || 'General',
      dueDate: dueDate
        ? new Date(dueDate).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      estimatedMinutes,
      difficulty,
      importance,
      isCompleted: false,
      isPriority,
      isSplittable,
      projectId: projectId || undefined,
      prerequisiteIds,
      recurrenceRuleData,
    }

    if (editTask) {
      updateAssignment({ ...editTask, ...data })
    } else {
      addAssignment(data)
    }

    if (saveAsTemplate && templateName.trim()) {
      addTemplate({
        name: templateName.trim(),
        subject: subject || undefined,
        estimatedMinutes,
        difficulty,
        importance,
        isSplittable,
        recurrenceRuleData,
      })
    }

    onOpenChange(false)
  }

  const otherTasks = assignments.filter(
    (a) => a.id !== editTask?.id && !a.isCompleted
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto" side="right">
        <SheetHeader>
          <SheetTitle>{editTask ? 'Edit Task' : 'Add Task'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Template picker */}
          {templates.length > 0 && !editTask && (
            <div className="space-y-1.5">
              <Label>Load Template</Label>
              <Select onValueChange={(id) => {
                const t = templates.find((x) => x.id === id)
                if (t) loadTemplate(t)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template…" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task name"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={(v) => setSubject(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick…" />
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

            <div className="space-y-1.5">
              <Label htmlFor="due">Due Date</Label>
              <Input
                id="due"
                type="date"
                min={today}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="est">
              Estimated Time (minutes)
              {predictedMinutes !== null && predictedMinutes !== estimatedMinutes && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  Predicted: ~{predictedMinutes}m
                </span>
              )}
            </Label>
            <Input
              id="est"
              type="number"
              min={1}
              max={480}
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
            />
          </div>

          <DotRating value={difficulty} onChange={setDifficulty} label="Difficulty" />
          <DotRating value={importance} onChange={setImportance} label="Importance" />

          <div className="flex items-center justify-between">
            <Label htmlFor="priority">Priority</Label>
            <Switch
              id="priority"
              checked={isPriority}
              onCheckedChange={setIsPriority}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="splittable">Splittable</Label>
              <p className="text-xs text-muted-foreground">Can be split across sessions</p>
            </div>
            <Switch
              id="splittable"
              checked={isSplittable}
              onCheckedChange={setIsSplittable}
            />
          </div>

          <Separator />

          {/* Project */}
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={(v) => setProjectId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No project</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prerequisites */}
          {otherTasks.length > 0 && (
            <div className="space-y-1.5">
              <Label>Must complete first (prerequisites)</Label>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto rounded-md border border-border p-2">
                {otherTasks.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => togglePrereq(a.id)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      prerequisiteIds.includes(a.id)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {a.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Recurrence */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Recurrence</Label>
              <Switch
                checked={hasRecurrence}
                onCheckedChange={setHasRecurrence}
              />
            </div>

            {hasRecurrence && (
              <div className="space-y-3 rounded-md border border-border p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Frequency</Label>
                    <Select
                      value={recFrequency}
                      onValueChange={(v) => setRecFrequency(v as RecurrenceRule['frequency'])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="specificDays">Specific Days</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {recFrequency !== 'specificDays' && (
                    <div className="space-y-1.5">
                      <Label>Every</Label>
                      <Input
                        type="number"
                        min={1}
                        max={52}
                        value={recInterval}
                        onChange={(e) => setRecInterval(Number(e.target.value))}
                      />
                    </div>
                  )}
                </div>

                {recFrequency === 'specificDays' && (
                  <div className="space-y-1.5">
                    <Label>Days</Label>
                    <div className="flex gap-1.5 flex-wrap">
                      {DAYS.map((day, i) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(i + 1)}
                          className={`w-9 h-9 rounded-full text-xs font-medium transition-colors ${
                            recDays.includes(i + 1)
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-border hover:bg-muted'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="rec-end">End Date (optional)</Label>
                  <Input
                    id="rec-end"
                    type="date"
                    min={today}
                    value={recEndDate}
                    onChange={(e) => setRecEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Save as template */}
          {!editTask && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Save as template</Label>
                <Switch checked={saveAsTemplate} onCheckedChange={setSaveAsTemplate} />
              </div>
              {saveAsTemplate && (
                <Input
                  placeholder="Template name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1" disabled={!title.trim()}>
              {editTask ? 'Save Changes' : 'Add Task'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
