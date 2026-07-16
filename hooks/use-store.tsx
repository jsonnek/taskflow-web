'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react'
import { nanoid } from 'nanoid'
import type {
  Assignment,
  WorkBlock,
  Project,
  TaskGroup,
  TimeEntry,
  Template,
  PredictionFactor,
} from '@/types'
import {
  assignmentStore,
  projectStore,
  groupStore,
  workBlockStore,
  timeEntryStore,
  templateStore,
  predictionStore,
  updatePredictionFactor,
} from '@/lib/store'
import { generateNextOccurrence } from '@/lib/recurrence-engine'

interface StoreState {
  assignments: Assignment[]
  projects: Project[]
  groups: TaskGroup[]
  workBlocks: WorkBlock[]
  timeEntries: TimeEntry[]
  templates: Template[]
  predictionFactors: PredictionFactor[]
}

interface StoreActions {
  // Assignments
  addAssignment: (a: Omit<Assignment, 'id' | 'createdAt'>) => Assignment
  updateAssignment: (a: Assignment) => void
  deleteAssignment: (id: string) => void
  completeAssignment: (id: string, completedAt?: string) => void
  uncompleteAssignment: (id: string) => void
  // Projects
  addProject: (p: Omit<Project, 'id' | 'createdAt'>) => Project
  updateProject: (p: Project) => void
  deleteProject: (id: string) => void
  // Groups
  addGroup: (g: Omit<TaskGroup, 'id' | 'createdAt'>) => TaskGroup
  updateGroup: (g: TaskGroup) => void
  deleteGroup: (id: string) => void
  // Work Blocks
  addWorkBlock: (b: Omit<WorkBlock, 'id'>) => WorkBlock
  updateWorkBlock: (b: WorkBlock) => void
  deleteWorkBlock: (id: string) => void
  // Time Entries
  addTimeEntry: (e: Omit<TimeEntry, 'id'>) => TimeEntry
  updateTimeEntry: (e: TimeEntry) => void
  deleteTimeEntry: (id: string) => void
  // Templates
  addTemplate: (t: Omit<Template, 'id'>) => Template
  updateTemplate: (t: Template) => void
  deleteTemplate: (id: string) => void
  // Refresh
  refresh: () => void
}

type StoreContext = StoreState & StoreActions

const Context = createContext<StoreContext | null>(null)

// In-memory list updates — mutations write through to localStorage via the
// per-collection stores, but React state is updated in place instead of
// re-reading and re-parsing the whole collection.
function upsertIn<T extends { id: string }>(items: T[], item: T): T[] {
  const idx = items.findIndex((i) => i.id === item.id)
  if (idx < 0) return [...items, item]
  const next = items.slice()
  next[idx] = item
  return next
}

function removeIn<T extends { id: string }>(items: T[], id: string): T[] {
  return items.filter((i) => i.id !== id)
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoreState>({
    assignments: [],
    projects: [],
    groups: [],
    workBlocks: [],
    timeEntries: [],
    templates: [],
    predictionFactors: [],
  })

  const load = useCallback(() => {
    setState({
      assignments: assignmentStore.getAll(),
      projects: projectStore.getAll(),
      groups: groupStore.getAll(),
      workBlocks: workBlockStore.getAll(),
      timeEntries: timeEntryStore.getAll(),
      templates: templateStore.getAll(),
      predictionFactors: predictionStore.getAll(),
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Assignments
  const addAssignment = useCallback((data: Omit<Assignment, 'id' | 'createdAt'>): Assignment => {
    const a: Assignment = { ...data, id: nanoid(), createdAt: new Date().toISOString() }
    assignmentStore.upsert(a)
    setState((s) => ({ ...s, assignments: upsertIn(s.assignments, a) }))
    return a
  }, [])

  const updateAssignment = useCallback((a: Assignment) => {
    assignmentStore.upsert(a)
    setState((s) => ({ ...s, assignments: upsertIn(s.assignments, a) }))
  }, [])

  const deleteAssignment = useCallback((id: string) => {
    assignmentStore.remove(id)
    setState((s) => ({ ...s, assignments: removeIn(s.assignments, id) }))
  }, [])

  // Side effects (writes, recurrence generation) happen outside the setState
  // updater — updaters must stay pure or StrictMode's double-invoke would
  // duplicate them.
  const completeAssignment = useCallback((id: string, completedAt?: string) => {
    const a = assignmentStore.getAll().find((x) => x.id === id)
    if (!a || a.isCompleted) return

    const resolvedCompletedAt = completedAt ?? new Date().toISOString()
    const updated = { ...a, isCompleted: true, completedAt: resolvedCompletedAt }
    assignmentStore.upsert(updated)

    // Update prediction factor from logged time
    const entries = timeEntryStore
      .getAll()
      .filter((e) => e.assignmentId === id && e.endedAt)
    if (entries.length > 0) {
      const actualMinutes = entries.reduce(
        (sum, e) =>
          sum +
          (new Date(e.endedAt!).getTime() - new Date(e.startedAt).getTime()) / 60000,
        0
      )
      updatePredictionFactor(a.subject, a.estimatedMinutes, actualMinutes)
    }

    // Generate next recurrence
    let next: Assignment | null = null
    if (a.recurrenceRuleData) {
      next = generateNextOccurrence(updated)
      if (next) assignmentStore.upsert(next)
    }

    const predictionFactors = predictionStore.getAll()
    setState((s) => {
      let assignments = upsertIn(s.assignments, updated)
      if (next) assignments = upsertIn(assignments, next)
      return { ...s, assignments, predictionFactors }
    })
  }, [])

  const uncompleteAssignment = useCallback((id: string) => {
    const a = assignmentStore.getAll().find((x) => x.id === id)
    if (!a) return
    const updated = { ...a, isCompleted: false, completedAt: undefined }
    assignmentStore.upsert(updated)
    setState((s) => ({ ...s, assignments: upsertIn(s.assignments, updated) }))
  }, [])

  // Projects
  const addProject = useCallback((data: Omit<Project, 'id' | 'createdAt'>): Project => {
    const p: Project = { ...data, id: nanoid(), createdAt: new Date().toISOString() }
    projectStore.upsert(p)
    setState((s) => ({ ...s, projects: upsertIn(s.projects, p) }))
    return p
  }, [])

  const updateProject = useCallback((p: Project) => {
    projectStore.upsert(p)
    setState((s) => ({ ...s, projects: upsertIn(s.projects, p) }))
  }, [])

  const deleteProject = useCallback((id: string) => {
    projectStore.remove(id)
    setState((s) => ({ ...s, projects: removeIn(s.projects, id) }))
  }, [])

  // Groups
  const addGroup = useCallback((data: Omit<TaskGroup, 'id' | 'createdAt'>): TaskGroup => {
    const g: TaskGroup = { ...data, id: nanoid(), createdAt: new Date().toISOString() }
    groupStore.upsert(g)
    setState((s) => ({ ...s, groups: upsertIn(s.groups, g) }))
    return g
  }, [])

  const updateGroup = useCallback((g: TaskGroup) => {
    groupStore.upsert(g)
    setState((s) => ({ ...s, groups: upsertIn(s.groups, g) }))
  }, [])

  const deleteGroup = useCallback((id: string) => {
    groupStore.remove(id)
    setState((s) => ({ ...s, groups: removeIn(s.groups, id) }))
  }, [])

  // Work Blocks
  const addWorkBlock = useCallback((data: Omit<WorkBlock, 'id'>): WorkBlock => {
    const b: WorkBlock = { ...data, id: nanoid() }
    workBlockStore.upsert(b)
    setState((s) => ({ ...s, workBlocks: upsertIn(s.workBlocks, b) }))
    return b
  }, [])

  const updateWorkBlock = useCallback((b: WorkBlock) => {
    workBlockStore.upsert(b)
    setState((s) => ({ ...s, workBlocks: upsertIn(s.workBlocks, b) }))
  }, [])

  const deleteWorkBlock = useCallback((id: string) => {
    workBlockStore.remove(id)
    setState((s) => ({ ...s, workBlocks: removeIn(s.workBlocks, id) }))
  }, [])

  // Time Entries
  const addTimeEntry = useCallback((data: Omit<TimeEntry, 'id'>): TimeEntry => {
    const e: TimeEntry = { ...data, id: nanoid() }
    timeEntryStore.upsert(e)
    setState((s) => ({ ...s, timeEntries: upsertIn(s.timeEntries, e) }))
    return e
  }, [])

  const updateTimeEntry = useCallback((e: TimeEntry) => {
    timeEntryStore.upsert(e)
    setState((s) => ({ ...s, timeEntries: upsertIn(s.timeEntries, e) }))
  }, [])

  const deleteTimeEntry = useCallback((id: string) => {
    timeEntryStore.remove(id)
    setState((s) => ({ ...s, timeEntries: removeIn(s.timeEntries, id) }))
  }, [])

  // Templates
  const addTemplate = useCallback((data: Omit<Template, 'id'>): Template => {
    const t: Template = { ...data, id: nanoid() }
    templateStore.upsert(t)
    setState((s) => ({ ...s, templates: upsertIn(s.templates, t) }))
    return t
  }, [])

  const updateTemplate = useCallback((t: Template) => {
    templateStore.upsert(t)
    setState((s) => ({ ...s, templates: upsertIn(s.templates, t) }))
  }, [])

  const deleteTemplate = useCallback((id: string) => {
    templateStore.remove(id)
    setState((s) => ({ ...s, templates: removeIn(s.templates, id) }))
  }, [])

  const refresh = useCallback(() => load(), [load])

  // All actions are stable; the value identity only changes when state does,
  // so consumers don't re-render on unrelated parent renders.
  const value = useMemo<StoreContext>(
    () => ({
      ...state,
      addAssignment,
      updateAssignment,
      deleteAssignment,
      completeAssignment,
      uncompleteAssignment,
      addProject,
      updateProject,
      deleteProject,
      addGroup,
      updateGroup,
      deleteGroup,
      addWorkBlock,
      updateWorkBlock,
      deleteWorkBlock,
      addTimeEntry,
      updateTimeEntry,
      deleteTimeEntry,
      addTemplate,
      updateTemplate,
      deleteTemplate,
      refresh,
    }),
    [
      state,
      addAssignment,
      updateAssignment,
      deleteAssignment,
      completeAssignment,
      uncompleteAssignment,
      addProject,
      updateProject,
      deleteProject,
      addGroup,
      updateGroup,
      deleteGroup,
      addWorkBlock,
      updateWorkBlock,
      deleteWorkBlock,
      addTimeEntry,
      updateTimeEntry,
      deleteTimeEntry,
      addTemplate,
      updateTemplate,
      deleteTemplate,
      refresh,
    ]
  )

  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useStore(): StoreContext {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
