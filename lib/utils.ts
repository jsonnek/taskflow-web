import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Local-timezone YYYY-MM-DD (never use toISOString for calendar dates —
// it shifts the date for anyone not on UTC)
export function localDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Local calendar date of an ISO timestamp
export function localDateOfISO(iso: string): string {
  return localDateString(new Date(iso))
}
