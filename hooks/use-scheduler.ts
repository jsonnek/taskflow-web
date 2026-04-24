'use client'

import { useMemo } from 'react'
import { useStore } from './use-store'
import { generatePlan } from '@/lib/scheduler'
import type { ScheduleResult } from '@/types'

export function useScheduler(): ScheduleResult {
  const { assignments, workBlocks, projects } = useStore()

  return useMemo(
    () => generatePlan(assignments, workBlocks, projects),
    [assignments, workBlocks, projects]
  )
}
