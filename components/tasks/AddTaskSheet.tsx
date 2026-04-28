'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Minus, Plus, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { DateInput } from '@/components/ui/date-input'
import { useStore } from '@/hooks/use-store'
import { predictionStore } from '@/lib/store'
import type { Assignment, RecurrenceRule, Template } from '@/types'

interface AddTaskSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editTask?: Assignment
  defaultProjectId?: string
  defaultSubject?: string
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

export function AddTaskSheet({ open, onOpenChange, editTask, defaultProjectId, defaultSubject }: AddTaskSheetProps) {
  const { groups, projects, assignments, templates, addAssignment, updateAssignment, addTemplate } = useStore()

  const [title, setTitle] = useState(editTask?.title ?? '')
  const [subject, setSubject] = useState(editTask?.subject ?? defaultSubject ?? '')
  const [dueDate, setDueDate] = useState(editTask?.dueDate ? editTask.dueDate.split('T')[0] : '')
  const [estimatedMinutes, setEstimatedMinutes] = useState(editTask?.estimatedMinutes ?? 30)
  const [difficulty, setDifficulty] = useState(editTask?.difficulty ?? 3)
  const [importance, setImportance] = useState(editTask?.importance ?? 3)
  const [isPriority, setIsPriority] = useState(editTask?.isPriority ?? false)
  const [isSplittable, setIsSplittable] = useState(editTask?.isSplittable ?? true)
  const [projectId, setProjectId] = useState(editTask?.projectId ?? defaultProjectId ?? '')
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

  const [prereqSearch, setPrereqSearch] = useState('')

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

  // Group and filter prerequisites
  const filteredPrereqs = useMemo(() => {
    const q = prereqSearch.toLowerCase()
    return otherTasks.filter((a) => !q || a.title.toLowerCase().includes(q) || (a.subject ?? '').toLowerCase().includes(q))
  }, [otherTasks, prereqSearch])

  const prereqGroups = useMemo(() => {
    const selected = filteredPrereqs.filter((a) => prerequisiteIds.includes(a.id))
    const unselected = filteredPrereqs.filter((a) => !prerequisiteIds.includes(a.id))
    // Group unselected by subject
    const subjectMap = new Map<string, typeof unselected>()
    for (const a of unselected) {
      const key = a.subject || 'General'
      const arr = subjectMap.get(key) ?? []
      arr.push(a)
      subjectMap.set(key, arr)
    }
    return { selected, bySubject: Array.from(subjectMap.entries()) }
  }, [filteredPrereqs, prerequisiteIds])

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
                <DateInput min={today} value={dueDate} onChange={setDueDate} />
              </div>
            </div>

            {/* Estimated time */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <SectionLabel>Estimated Time</SectionLabel>
                {predictedMinutes !== null && predictedMinutes !== estimatedMinutes && (
                  <button
                    type="button"
                    onClick={() => setEstimatedMinutes(predictedMinutes)}
                    className="text-[10px] text-primary/70 hover:text-primary mono-nums border border-primary/20 hover:border-primary/50 hover:bg-primary/10 px-1.5 py-px rounded transition-all"
                  >
                    predicted ~{predictedMinutes}m
                  </button>
                )}
              </div>
              {/* Quick presets */}
              <div className="flex gap-1 flex-wrap">
                {[15, 30, 45, 60, 90, 120, 180].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setEstimatedMinutes(m)}
                    className={`text-[11px] font-mono px-2 py-1 rounded border transition-all ${
                      estimatedMinutes === m
                        ? 'bg-primary/15 text-primary border-primary/50'
                        : 'border-border text-muted-foreground hover:border-white/25 hover:text-foreground'
                    }`}
                  >
                    {m < 60 ? `${m}m` : m === 60 ? '1h' : m === 90 ? '1h 30m' : `${m / 60}h`}
                  </button>
                ))}
              </div>
              {/* Stepper for custom values */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEstimatedMinutes((v) => Math.max(5, v - 5))}
                  className="w-8 h-8 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-white/30 transition-colors shrink-0"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <div className="flex-1 relative">
                  <Input
                    type="number"
                    min={1}
                    max={480}
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(Math.max(1, Number(e.target.value)))}
                    className="h-8 text-sm text-center font-mono"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">min</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEstimatedMinutes((v) => Math.min(480, v + 5))}
                  className="w-8 h-8 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-white/30 transition-colors shrink-0"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
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
                        <span className="flex flex-1 text-left truncate text-sm">
                          {projectId
                            ? (projects.find(p => p.id === projectId)?.name ?? 'Unknown project')
                            : <span className="text-muted-foreground">No project</span>
                          }
                        </span>
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
                      <div className="flex items-center justify-between">
                        <SectionLabel>Must complete first</SectionLabel>
                        {prerequisiteIds.length > 0 && (
                          <span className="text-[10px] font-mono text-primary/70 border border-primary/30 bg-primary/10 px-1.5 py-px rounded">
                            {prerequisiteIds.length} selected
                          </span>
                        )}
                      </div>
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                        <Input
                          placeholder="Filter tasks…"
                          value={prereqSearch}
                          onChange={(e) => setPrereqSearch(e.target.value)}
                          className="h-7 text-xs pl-7"
                        />
                      </div>
                      {/* Task list */}
                      <div className="rounded-md border border-border overflow-y-auto max-h-40 divide-y divide-border/50">
                        {/* Selected first */}
                        {prereqGroups.selected.length > 0 && (
                          <div className="p-1.5 space-y-1">
                            {prereqGroups.selected.map((a) => {
                              const g = groups.find((gr) => gr.name === a.subject)
                              return (
                                <button
                                  key={a.id}
                                  type="button"
                                  onClick={() => setPrerequisiteIds((prev) => prev.filter((p) => p !== a.id))}
                                  className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded text-xs transition-all bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20"
                                >
                                  {g && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: g.colorHex }} />}
                                  <span className="flex-1 truncate font-medium">{a.title}</span>
                                  <span className="text-[9px] font-mono opacity-60 shrink-0">✓ remove</span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                        {/* Unselected grouped by subject */}
                        {prereqGroups.bySubject.length === 0 && prereqGroups.selected.length === 0 && (
                          <p className="text-[11px] text-muted-foreground/50 text-center py-4">no tasks found</p>
                        )}
                        {prereqGroups.bySubject.map(([subjectName, tasks]) => {
                          const g = groups.find((gr) => gr.name === subjectName)
                          return (
                            <div key={subjectName}>
                              <div
                                className="flex items-center gap-1.5 px-2 py-1 sticky top-0"
                                style={{ background: 'var(--card)' }}
                              >
                                {g && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: g.colorHex }} />}
                                <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/50">{subjectName}</span>
                              </div>
                              <div className="px-1.5 pb-1.5 space-y-0.5">
                                {tasks.map((a) => (
                                  <button
                                    key={a.id}
                                    type="button"
                                    onClick={() => setPrerequisiteIds((prev) => [...prev, a.id])}
                                    className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                                  >
                                    {g && <span className="w-1.5 h-1.5 rounded-full shrink-0 opacity-50" style={{ background: g.colorHex }} />}
                                    <span className="flex-1 truncate">{a.title}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )
                        })}
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
                          <DateInput min={today} value={recEndDate} onChange={setRecEndDate} placeholder="No end date" />
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
