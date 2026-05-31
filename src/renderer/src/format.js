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
