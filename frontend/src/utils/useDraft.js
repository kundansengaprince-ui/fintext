import { useState, useEffect, useCallback } from 'react'

/**
 * useDraft(key, initialState)
 * Persists form state to localStorage under `key`.
 * Returns [state, setState, clearDraft, hasDraft]
 */
export default function useDraft(key, initialState) {
  const stored = () => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }

  const [state, setStateRaw] = useState(() => stored() ?? initialState)
  const hasDraft = !!stored()

  const setState = useCallback((updater) => {
    setStateRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      try { localStorage.setItem(key, JSON.stringify(next)) } catch {}
      return next
    })
  }, [key])

  const clearDraft = useCallback(() => {
    localStorage.removeItem(key)
    setStateRaw(initialState)
  }, [key]) // eslint-disable-line

  // Sync if key changes (e.g. date changes)
  useEffect(() => {
    const saved = stored()
    if (saved) setStateRaw(saved)
    else setStateRaw(initialState)
  }, [key]) // eslint-disable-line

  return [state, setState, clearDraft, hasDraft]
}
