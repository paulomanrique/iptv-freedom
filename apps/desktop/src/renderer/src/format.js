// Helpers para formatar dados vindos do Xtream (player_api.php).
import i18n from './i18n'

export function formatDate(unix) {
  if (!unix) return '—'
  const d = new Date(Number(unix) * 1000)
  if (isNaN(d.getTime())) return '—'
  try {
    return d.toLocaleDateString(i18n.language || 'en')
  } catch {
    return d.toLocaleDateString('en')
  }
}

export function daysLeft(unix, now) {
  if (!unix) return null
  const ms = Number(unix) * 1000 - now
  return Math.max(0, Math.round(ms / 86400000))
}

export function statusLabel(userInfo) {
  if (!userInfo) return { label: i18n.t('status.account.unknown'), ok: false }
  const active = String(userInfo.status).toLowerCase() === 'active'
  return { label: userInfo.status || i18n.t(active ? 'status.account.active' : 'status.account.inactive'), ok: active }
}

export function formatBytes(n) {
  if (!n || n < 0) return '—'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let v = n
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`
}

export function formatSpeed(bytesPerSec) {
  if (!bytesPerSec) return ''
  return `${formatBytes(bytesPerSec)}/s`
}

// Title case "inteligente": capitaliza palavras, mantém conectores minúsculos,
// preserva siglas conhecidas e tokens com número (18+, 2022, 1080p).
const SMALL_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'com', 'para', 'na', 'no', 'nas', 'nos', 'em', 'di', 'del', 'la', 'le', 'of', 'the', 'and'])
const ACRONYMS = new Set([
  // qualidade / formato
  'DC', 'HD', 'SD', 'FHD', 'UHD', '4K', '8K', '3D', 'HQ', 'VOD', 'PPV', 'XXX',
  // países / esportes / diversos
  'TV', 'BR', 'EUA', 'US', 'UK', 'NBA', 'NFL', 'MLB', 'NHL', 'UFC', 'WWE', 'MMA', 'F1', 'BBB', 'KIDS', 'PPV',
  // canais comuns
  'HBO', 'HBO2', 'MAX', 'ESPN', 'TNT', 'SBT', 'AXN', 'FOX', 'FX', 'FXX', 'GNT', 'AMC', 'MTV', 'CNN',
  'BBC', 'TLC', 'NGC', 'USA', 'CBS', 'NBC', 'ABC', 'CW', 'TBS', 'TCM', 'SYFY', 'AE', 'NHK', 'RAI', 'RT', 'DW'
])

function capWord(w) {
  return w
    .split('-')
    .map((seg) => (seg ? seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase() : seg))
    .join('-')
}

// Normaliza texto para busca: remove acentos e caixa ("Pânico" -> "panico").
export function normalizeSearch(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export function smartTitleCase(str) {
  const clean = String(str || '').trim().replace(/\s+/g, ' ')
  if (!clean) return clean
  const words = clean.split(' ')
  return words
    .map((w, i) => {
      const upper = w.toUpperCase()
      if (ACRONYMS.has(upper)) return upper
      if (/\d/.test(w)) return w // 18+, 2022, 1080p, 007 — preserva como veio
      if (i > 0 && SMALL_WORDS.has(w.toLowerCase())) return w.toLowerCase()
      return capWord(w)
    })
    .join(' ')
}

const DL_STATUSES = new Set(['queued', 'downloading', 'paused', 'done', 'error', 'canceled'])
export const downloadLabel = (s) => (DL_STATUSES.has(s) ? i18n.t(`status.download.${s}`) : s)
