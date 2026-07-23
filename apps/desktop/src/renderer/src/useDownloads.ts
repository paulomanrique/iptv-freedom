import { useEffect, useState, useCallback } from 'react'
import type { DownloadAddItem, DownloadItem } from '@iptv/contracts'

// Keeps the download list in sync with the main process (IPC events).
export function useDownloads() {
  const [items, setItems] = useState<DownloadItem[]>([])

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

  const add = useCallback((item: DownloadAddItem) => window.api.downloads.add(item), [])
  const pause = useCallback((id: string) => window.api.downloads.pause(id), [])
  const resume = useCallback((id: string) => window.api.downloads.resume(id), [])
  const cancel = useCallback((id: string) => window.api.downloads.cancel(id), [])
  const openFolder = useCallback((id: string) => window.api.downloads.openFolder(id), [])
  const clearCompleted = useCallback(() => window.api.downloads.clearCompleted(), [])

  return { items, add, pause, resume, cancel, openFolder, clearCompleted }
}
