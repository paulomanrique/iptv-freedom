import { useEffect, useState, useCallback } from "react";
import type { RecordingItem, RecordingStartItem } from "@iptv/contracts";

// Keeps the recording list in sync with the main process (IPC events).
export function useRecordings() {
  const [items, setItems] = useState<RecordingItem[]>([]);

  useEffect(() => {
    let alive = true;
    window.api.recordings.list().then((l) => alive && setItems(l));
    const offChanged = window.api.recordings.onChanged((list) => setItems(list));
    const offProgress = window.api.recordings.onProgress((p) => {
      setItems((cur) => cur.map((r) => (r.id === p.id ? { ...r, ...p } : r)));
    });
    return () => {
      alive = false;
      offChanged();
      offProgress();
    };
  }, []);

  const start = useCallback((item: RecordingStartItem) => window.api.recordings.start(item), []);
  const stop = useCallback((id: string) => window.api.recordings.stop(id), []);
  const openFolder = useCallback((id: string) => window.api.recordings.openFolder(id), []);
  const remove = useCallback((id: string) => window.api.recordings.remove(id), []);
  const clearStopped = useCallback(() => window.api.recordings.clearStopped(), []);

  return { items, start, stop, openFolder, remove, clearStopped };
}
