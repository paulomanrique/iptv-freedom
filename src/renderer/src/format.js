// Helpers para formatar dados vindos do Xtream (player_api.php).

export function formatDate(unix) {
  if (!unix) return '—'
  const d = new Date(Number(unix) * 1000)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR')
}

export function daysLeft(unix, now) {
  if (!unix) return null
  const ms = Number(unix) * 1000 - now
  return Math.max(0, Math.round(ms / 86400000))
}

export function statusLabel(userInfo) {
  if (!userInfo) return { label: 'Desconhecido', ok: false }
  const active = String(userInfo.status).toLowerCase() === 'active'
  return { label: userInfo.status || (active ? 'Ativa' : 'Inativa'), ok: active }
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

const DL_LABELS = {
  queued: 'Na fila', downloading: 'Baixando', paused: 'Pausado',
  done: 'Concluído', error: 'Erro', canceled: 'Cancelado'
}
export const downloadLabel = (s) => DL_LABELS[s] || s
