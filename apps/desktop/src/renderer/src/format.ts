// i18n-coupled formatting helpers. Pure formatters live in @iptv/core and are
// re-exported here so existing import paths keep working.
import i18n from './i18n'
import type { XtreamUserInfo } from '@iptv/contracts'

export { formatBytes, formatSpeed, smartTitleCase, normalizeSearch } from '@iptv/core'

export function formatDate(unix?: string | number | null): string {
  if (!unix) return '—'
  const d = new Date(Number(unix) * 1000)
  if (isNaN(d.getTime())) return '—'
  try {
    return d.toLocaleDateString(i18n.language || 'en')
  } catch {
    return d.toLocaleDateString('en')
  }
}

export function daysLeft(unix: string | number | null | undefined, now: number): number | null {
  if (!unix) return null
  const ms = Number(unix) * 1000 - now
  return Math.max(0, Math.round(ms / 86400000))
}

export function statusLabel(userInfo?: XtreamUserInfo): { label: string; ok: boolean } {
  if (!userInfo) return { label: i18n.t('status.account.unknown'), ok: false }
  const active = String(userInfo.status).toLowerCase() === 'active'
  return {
    label: userInfo.status || i18n.t(active ? 'status.account.active' : 'status.account.inactive'),
    ok: active
  }
}

const DL_STATUSES = new Set(['queued', 'downloading', 'paused', 'done', 'error', 'canceled'])
export const downloadLabel = (s: string): string =>
  DL_STATUSES.has(s) ? i18n.t(`status.download.${s}`) : s
