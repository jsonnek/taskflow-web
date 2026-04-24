'use client'

import { useEffect } from 'react'

export function useKeyboard(
  key: string,
  handler: () => void,
  options: { meta?: boolean; ctrl?: boolean } = { meta: true }
) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const metaMatch = options.meta ? e.metaKey : true
      const ctrlMatch = options.ctrl ? e.ctrlKey : true
      if (e.key === key && metaMatch && ctrlMatch) {
        e.preventDefault()
        handler()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [key, handler, options.meta, options.ctrl])
}
