import type { Kind, XtreamStream } from '@iptv/contracts'
import { smartTitleCase } from './format'

/** A stream/series entry normalized to a single shape for the UI. */
export interface CatalogItem {
  id: string | number
  name: string
  icon: string | null
  ext: string | null
  rating: string | number | null
  plot: string | null
  added: string | null
  kind: Kind
}

// Normalizes a stream (VOD/live/series have different fields) to one shape.
export function normalize(item: XtreamStream, kind: Kind): CatalogItem {
  const it = item as Record<string, unknown>
  return {
    id: (it.stream_id ?? it.series_id) as string | number,
    name: smartTitleCase(String(it.name ?? '')),
    icon: (it.stream_icon || it.cover || it.cover_big || null) as string | null,
    ext: (it.container_extension || null) as string | null,
    rating: (it.rating || it.rating_5based || null) as string | number | null,
    plot: (it.plot || null) as string | null,
    added: (it.added || null) as string | null,
    kind
  }
}
