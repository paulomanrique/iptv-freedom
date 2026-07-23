import { useEffect, useState, useCallback } from 'react'

// Mantém a lista de downloads sincronizada com o processo main (eventos IPC).
export function useDownloads() {
  const [items, setItems] = useState([])

  useEffect(() => {
    let alive = true
    window.api.downloads.list().then((l) => alive && setItems(l))
    const offChanged = window.api.downloads.onChanged((list) => setItems(list))
    const offProgress = window.api.downloads.onProgress((p) => {
      setItems((cur) => cur.map((d) => (d.id === p.id ? { ...d, ...p } : d)))
    })
    return () => {
      alive = false
      offChanged()
      offProgress()
    }
  }, [])

  const add = useCallback((item) => window.api.downloads.add(item), [])
  const pause = useCallback((id) => window.api.downloads.pause(id), [])
  const resume = useCallback((id) => window.api.downloads.resume(id), [])
  const cancel = useCallback((id) => window.api.downloads.cancel(id), [])
  const openFolder = useCallback((id) => window.api.downloads.openFolder(id), [])
  const clearCompleted = useCallback(() => window.api.downloads.clearCompleted(), [])

  return { items, add, pause, resume, cancel, openFolder, clearCompleted }
}
