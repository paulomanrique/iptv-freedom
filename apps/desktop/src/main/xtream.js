// Cliente Xtream Codes (executa no processo main para evitar CORS e manter as
// credenciais fora do bundle do renderer).

function normalizeHost(host) {
  let h = String(host || '').trim().replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(h)) h = 'http://' + h
  return h
}

// Chamada genérica ao player_api.php
async function callApi(account, params = {}) {
  const url = new URL(normalizeHost(account.host) + '/player_api.php')
  url.searchParams.set('username', account.username)
  url.searchParams.set('password', account.password)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export function getAccountInfo(account) {
  return callApi(account) // { user_info, server_info }
}

// Categorias e streams por tipo: 'live' | 'vod' | 'series'
const CAT_ACTION = { live: 'get_live_categories', vod: 'get_vod_categories', series: 'get_series_categories' }
const STREAM_ACTION = { live: 'get_live_streams', vod: 'get_vod_streams', series: 'get_series' }

export function getCategories(account, kind) {
  return callApi(account, { action: CAT_ACTION[kind] })
}

export function getStreams(account, kind, categoryId) {
  return callApi(account, { action: STREAM_ACTION[kind], category_id: categoryId })
}

export function getSeriesInfo(account, seriesId) {
  return callApi(account, { action: 'get_series_info', series_id: seriesId })
}

export function getVodInfo(account, vodId) {
  return callApi(account, { action: 'get_vod_info', vod_id: vodId })
}

// Monta a URL de mídia. type: 'live' | 'movie' | 'series'
export function streamUrl(account, type, id, ext) {
  const host = normalizeHost(account.host)
  const u = account.username
  const p = account.password
  if (type === 'live') return `${host}/live/${u}/${p}/${id}.ts`
  return `${host}/${type}/${u}/${p}/${id}.${ext || 'mp4'}`
}

export { normalizeHost }
