// Favoritos salvos localmente, por conta (localStorage).
// Cada favorito guarda o necessário para renderizar e reproduzir/baixar sem
// refazer requisições: { kind, type, id, name, icon, ext }.
//   kind: 'live' | 'vod' | 'series'  (grupo/seção de origem)
//   type: 'live' | 'movie' | 'series' (para montar a URL de mídia)

const keyFor = (accountId) => `iptvfreedom.favorites.${accountId || 'none'}`
const sameItem = (a, b) => a.kind === b.kind && String(a.id) === String(b.id)

export function loadFavorites(accountId) {
  try {
    const data = JSON.parse(localStorage.getItem(keyFor(accountId)))
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export function saveFavorites(accountId, favs) {
  localStorage.setItem(keyFor(accountId), JSON.stringify(favs))
}

export function isFavorite(favs, kind, id) {
  return favs.some((f) => sameItem(f, { kind, id }))
}

export function toggleFavorite(favs, item) {
  return isFavorite(favs, item.kind, item.id)
    ? favs.filter((f) => !sameItem(f, item))
    : [...favs, item]
}

// Agrupa favoritos por tipo geral, na ordem Ao vivo > Filmes > Séries.
import i18n from './i18n'

// Mapeia o "kind" do favorito para a chave de navegação correspondente.
export const KIND_NAV = { live: 'live', vod: 'movies', series: 'series' }
const KIND_ORDER = ['live', 'vod', 'series']

// Rótulo traduzido para um kind de favorito ('live' | 'vod' | 'series').
export const kindLabel = (kind) => i18n.t(`nav.${KIND_NAV[kind] || kind}`)

export function groupFavorites(favs) {
  return KIND_ORDER.map((kind) => ({
    kind,
    label: kindLabel(kind),
    items: favs.filter((f) => f.kind === kind)
  })).filter((g) => g.items.length > 0)
}
