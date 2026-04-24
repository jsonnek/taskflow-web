'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">
      {children}
    </p>
  )
}

function DotRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex-1">
      <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-5 h-5 rounded-full border transition-colors ${
              n <= value ? 'bg-primary border-primary' : 'border-border hover:border-primary/50'
            }`}
          />
        ))}
        <span className="text-[10px] text-muted-foreground self-center ml-1 mono-nums">{value}</span>
      </div>
    </div>
  )
}

export function AddTaskSheet({ open, onOpenChange, editTask }: AddTaskSheetProps) {
  const { groups, projects, assignments, templates, addAssignment, updateAssignment, addTemplate } = useStore()

  const [title, setTitle] = useState(editTask?.title ?? '')
  const [subject, setSubject] = useState(editTask?.subject ?? '')
  const [dueDate, setDueDate] = useState(editTask?.dueDate ? editTask.dueDate.split('T')[0] : '')
  const [estimatedMinutes, setEstimatedMinutes] = useState(editTask?.estimatedMinutes ?? 30)
  const [difficulty, setDifficulty] = useState(editTask?.difficulty ?? 3)
  const [importance, setImportance] = useState(editTask?.importance ?? 3)
  const [isPriority, setIsPriority] = useState(editTask?.isPriority ?? false)
  const [isSplittable, setIsSplittable] = useState(editTask?.isSplittable ?? true)
  const [projectId, setProjectId] = useState(editTask?.projectId ?? '')
  const [prerequisiteIds, setPrerequisiteIds] = useState<string[]>(editTask?.prerequisiteIds ?? [])
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // Recurrence
  const [hasRecurrence, setHasRecurrence] = useState(!!editTask?.recurrenceRuleData)
  const [recFrequency, setRecFrequency] = useState<RecurrenceRule['frequency']>(
    editTask?.recurrenceRuleData?.frequency ?? 'weekly'
  )
  const [recInterval, setRecInterval] = useState(editTask?.recurrenceRuleData?.interval ?? 1)
  const [recDays, setRecDays] = useState<number[]>(editTask?.recurrenceRuleData?.daysOfWeek ?? [])
  const [recEndDate, setRecEndDate] = useState(editTask?.recurrenceRuleData?.endDate ?? '')

  const predictionFactor = subject ? predictionStore.getForSubject(subject) : undefined
  const predictedMinutes = predictionFactor ? Math.round(estimatedMinutes * predictionFactor.factor) : null
  const today = new Date().toISOString().split('T')[0]
  const selectedGroup = groups.find((g) => g.name === subject)

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    const recurrenceRuleData: RecurrenceRule | undefined = hasRecurrence
      ? { frequency: recFrequency, daysOfWeek: recDays, interval: recInterval, endDate: recEndDate || undefined }
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

    if (editTask) updateAssignment({ ...editTask, ...data })
    else addAssignment(data)

    if (saveAsTemplate && templateName.trim()) {
      addTemplate({ name: templateName.trim(), subject: subject || undefined, estimatedMinutes, difficulty, importance, isSplittable, recurrenceRuleData })
    }

    onOpenChange(false)
  }

  const otherTasks = assignments.filter((a) => a.id !== editTask?.id && !a.isCompleted)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="text-base">{editTask ? 'Edit Task' : 'Add Task'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[75vh]">

            {/* Template picker */}
            {templates.length > 0 && !editTask && (
              <div className="space-y-1.5">
                <SectionLabel>Template</SectionLabel>
                <Select onValueChange={(id) => { const t = templates.find((x) => x.id === id); if (t) loadTemplate(t) }}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Load a template…" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <SectionLabel>Task</SectionLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="text-sm h-9"
                autoFocus
                required
              />
            </div>

            {/* Subject + Due date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <SectionLabel>Subject</SectionLabel>
                <div className="relative">
                  {selectedGroup && (
                    <div
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full z-10 pointer-events-none"
                      style={{ backgroundColor: selectedGroup.colorHex }}
                    />
                  )}
                  <Select value={subject} onValueChange={(v) => setSubject(v ?? '')}>
                    <SelectTrigger className={`h-8 text-sm ${selectedGroup ? 'pl-6' : ''}`}>
                      <SelectValue placeholder="Pick…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General">General</SelectItem>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.name}>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: g.colorHex }} />
                            {g.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <SectionLabel>Due Date</SectionLabel>
                <Input type="date" min={today} value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>

            {/* Estimated time */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <SectionLabel>Estimated Time (minutes)</SectionLabel>
                {predictedMinutes !== null && predictedMinutes !== estimatedMinutes && (
                  <span className="text-[10px] text-muted-foreground mono-nums">
                    Predicted ~{predictedMinutes}m
                  </span>
                )}
              </div>
              <Input
                type="number"
                min={1}
                max={480}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                className="h-8 text-sm"
              />
            </div>

            {/* Difficulty + Importance side by side */}
            <div className="flex gap-6">
              <DotRating value={difficulty} onChange={setDifficulty} label="Difficulty" />
              <DotRating value={importance} onChange={setImportance} label="Importance" />
            </div>

            {/* Priority + Splittable side by side */}
            <div className="flex gap-4">
              <div className="flex items-center gap-2 flex-1 rounded-md border border-border px-3 py-2">
                <Switch id="priority" checked={isPriority} onCheckedChange={setIsPriority} />
                <Label htmlFor="priority" className="text-sm cursor-pointer">Priority</Label>
              </div>
              <div className="flex items-center gap-2 flex-1 rounded-md border border-border px-3 py-2">
                <Switch id="splittable" checked={isSplittable} onCheckedChange={setIsSplittable} />
                <Label htmlFor="splittable" className="text-sm cursor-pointer">Splittable</Label>
              </div>
            </div>

            {/* Advanced section */}
            <div className="rounded-md border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setAdvancedOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted transition-colors"
              >
                <span className="text-xs font-medium text-muted-foreground">Advanced options</span>
                {advancedOpen
                  ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                  : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                }
              </button>

              {advancedOpen && (
                <div className="px-3 pb-3 space-y-4 border-t border-border pt-3">

                  {/* Project */}
                  <div className="space-y-1.5">
                    <SectionLabel>Project</SectionLabel>
                    <Select value={projectId} onValueChange={(v) => setProjectId(v ?? '')}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="No project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No project</SelectItem>
                        {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Prerequisites */}
                  {otherTasks.length > 0 && (
                    <div className="space-y-1.5">
                      <SectionLabel>Must complete first</SectionLabel>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto rounded-md border border-border p-2">
                        {otherTasks.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setPrerequisiteIds((prev) =>
                              prev.includes(a.id) ? prev.filter((p) => p !== a.id) : [...prev, a.id]
                            )}
                            className={`text-xs px-2 py-0.5 rounded transition-colors ${
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

                  {/* Recurrence */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <SectionLabel>Recurrence</SectionLabel>
                      <Switch checked={hasRecurrence} onCheckedChange={setHasRecurrence} />
                    </div>
                    {hasRecurrence && (
                      <div className="space-y-3 rounded-md bg-muted/40 p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Frequency</Label>
                            <Select value={recFrequency} onValueChange={(v) => setRecFrequency(v as RecurrenceRule['frequency'])}>
                              <SelectTrigger className="h-7 text-xs">
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
                            <div className="space-y-1">
                              <Label className="text-xs">Every</Label>
                              <Input type="number" min={1} max={52} value={recInterval} onChange={(e) => setRecInterval(Number(e.target.value))} className="h-7 text-xs" />
                            </div>
                          )}
                        </div>
                        {recFrequency === 'specificDays' && (
                          <div className="flex gap-1 flex-wrap">
                            {DAYS.map((day, i) => (
                              <button
                                key={day}
                                type="button"
                                onClick={() => setRecDays((prev) =>
                                  prev.includes(i + 1) ? prev.filter((d) => d !== i + 1) : [...prev, i + 1]
                                )}
                                className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                                  recDays.includes(i + 1)
                                    ? 'bg-primary text-primary-foreground'
                                    : 'border border-border hover:bg-muted'
                                }`}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="space-y-1">
                          <Label className="text-xs">End date (optional)</Label>
                          <Input type="date" min={today} value={recEndDate} onChange={(e) => setRecEndDate(e.target.value)} className="h-7 text-xs" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Save as template */}
                  {!editTask && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <SectionLabel>Save as template</SectionLabel>
                        <Switch checked={saveAsTemplate} onCheckedChange={setSaveAsTemplate} />
                      </div>
                      {saveAsTemplate && (
                        <Input placeholder="Template name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="h-8 text-sm" />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Fixed footer buttons */}
          <div className="px-5 py-3 border-t border-border flex gap-2 bg-background">
            <Button type="submit" className="flex-1" disabled={!title.trim()}>
              {editTask ? 'Save Changes' : 'Add Task'}
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
