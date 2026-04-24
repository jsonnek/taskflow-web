'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
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
  completeAssignment: (id: string) => void
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
    setState((s) => ({ ...s, assignments: assignmentStore.getAll() }))
    return a
  }, [])

  const updateAssignment = useCallback((a: Assignment) => {
    assignmentStore.upsert(a)
    setState((s) => ({ ...s, assignments: assignmentStore.getAll() }))
  }, [])

  const deleteAssignment = useCallback((id: string) => {
    assignmentStore.remove(id)
    setState((s) => ({ ...s, assignments: assignmentStore.getAll() }))
  }, [])

  const completeAssignment = useCallback((id: string) => {
    const all = assignmentStore.getAll()
    const a = all.find((x) => x.id === id)
    if (!a) return

    const completedAt = new Date().toISOString()
    const updated = { ...a, isCompleted: true, completedAt }
    assignmentStore.upsert(updated)

    // Update prediction factor
    const entries = timeEntryStore.getAll().filter(
      (e) => e.assignmentId === id && e.endedAt
    )
    if (entries.length > 0) {
      const actualMinutes =
        entries.reduce(
          (s, e) =>
            s +
            (new Date(e.endedAt!).getTime() - new Date(e.startedAt).getTime()) /
              60000,
          0
        )
      updatePredictionFactor(a.subject, a.estimatedMinutes, actualMinutes)
    }

    // Generate next recurrence
    if (a.recurrenceRuleData) {
      const next = generateNextOccurrence(updated)
      if (next) assignmentStore.upsert(next)
    }

    setState((s) => ({
      ...s,
      assignments: assignmentStore.getAll(),
      predictionFactors: predictionStore.getAll(),
    }))
  }, [])

  // Projects
  const addProject = useCallback((data: Omit<Project, 'id' | 'createdAt'>): Project => {
    const p: Project = { ...data, id: nanoid(), createdAt: new Date().toISOString() }
    projectStore.upsert(p)
    setState((s) => ({ ...s, projects: projectStore.getAll() }))
    return p
  }, [])

  const updateProject = useCallback((p: Project) => {
    projectStore.upsert(p)
    setState((s) => ({ ...s, projects: projectStore.getAll() }))
  }, [])

  const deleteProject = useCallback((id: string) => {
    projectStore.remove(id)
    setState((s) => ({ ...s, projects: projectStore.getAll() }))
  }, [])

  // Groups
  const addGroup = useCallback((data: Omit<TaskGroup, 'id' | 'createdAt'>): TaskGroup => {
    const g: TaskGroup = { ...data, id: nanoid(), createdAt: new Date().toISOString() }
    groupStore.upsert(g)
    setState((s) => ({ ...s, groups: groupStore.getAll() }))
    return g
  }, [])

  const updateGroup = useCallback((g: TaskGroup) => {
    groupStore.upsert(g)
    setState((s) => ({ ...s, groups: groupStore.getAll() }))
  }, [])

  const deleteGroup = useCallback((id: string) => {
    groupStore.remove(id)
    setState((s) => ({ ...s, groups: groupStore.getAll() }))
  }, [])

  // Work Blocks
  const addWorkBlock = useCallback((data: Omit<WorkBlock, 'id'>): WorkBlock => {
    const b: WorkBlock = { ...data, id: nanoid() }
    workBlockStore.upsert(b)
    setState((s) => ({ ...s, workBlocks: workBlockStore.getAll() }))
    return b
  }, [])

  const updateWorkBlock = useCallback((b: WorkBlock) => {
    workBlockStore.upsert(b)
    setState((s) => ({ ...s, workBlocks: workBlockStore.getAll() }))
  }, [])

  const deleteWorkBlock = useCallback((id: string) => {
    workBlockStore.remove(id)
    setState((s) => ({ ...s, workBlocks: workBlockStore.getAll() }))
  }, [])

  // Time Entries
  const addTimeEntry = useCallback((data: Omit<TimeEntry, 'id'>): TimeEntry => {
    const e: TimeEntry = { ...data, id: nanoid() }
    timeEntryStore.upsert(e)
    setState((s) => ({ ...s, timeEntries: timeEntryStore.getAll() }))
    return e
  }, [])

  const updateTimeEntry = useCallback((e: TimeEntry) => {
    timeEntryStore.upsert(e)
    setState((s) => ({ ...s, timeEntries: timeEntryStore.getAll() }))
  }, [])

  const deleteTimeEntry = useCallback((id: string) => {
    timeEntryStore.remove(id)
    setState((s) => ({ ...s, timeEntries: timeEntryStore.getAll() }))
  }, [])

  // Templates
  const addTemplate = useCallback((data: Omit<Template, 'id'>): Template => {
    const t: Template = { ...data, id: nanoid() }
    templateStore.upsert(t)
    setState((s) => ({ ...s, templates: templateStore.getAll() }))
    return t
  }, [])

  const updateTemplate = useCallback((t: Template) => {
    templateStore.upsert(t)
    setState((s) => ({ ...s, templates: templateStore.getAll() }))
  }, [])

  const deleteTemplate = useCallback((id: string) => {
    templateStore.remove(id)
    setState((s) => ({ ...s, templates: templateStore.getAll() }))
  }, [])

  const refresh = useCallback(() => load(), [load])

  return (
    <Context.Provider
      value={{
        ...state,
        addAssignment,
        updateAssignment,
        deleteAssignment,
        completeAssignment,
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
      }}
    >
      {children}
    </Context.Provider>
  )
}

export function useStore(): StoreContext {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
