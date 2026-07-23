// Cache em memória do catálogo (categorias e streams) por conta.
// Evita refazer requisições a cada navegação/tecla na busca.
import { smartTitleCase } from './format'

const cache = new Map() // key -> Promise

const keyOf = (account, ...parts) => [account.id, ...parts].join('|')

function cached(key, fetcher) {
  if (!cache.has(key)) {
    cache.set(
      key,
      fetcher().catch((e) => {
        cache.delete(key) // não cacheia erros
        throw e
      })
    )
  }
  return cache.get(key)
}

export function getCategories(account, kind) {
  return cached(keyOf(account, 'cat', kind), () => window.api.xtream.categories(account, kind))
}

export function getStreams(account, kind, categoryId) {
  return cached(keyOf(account, 'str', kind, categoryId || 'all'), () =>
    window.api.xtream.streams(account, kind, categoryId)
  )
}

export function getSeriesInfo(account, seriesId) {
  return cached(keyOf(account, 'series', seriesId), () => window.api.xtream.seriesInfo(account, seriesId))
}

export function clearAccount(accountId) {
  for (const k of [...cache.keys()]) if (k.startsWith(accountId + '|')) cache.delete(k)
}

// Normaliza um stream (VOD/live/series têm campos diferentes) para um formato único.
export function normalize(item, kind) {
  return {
    id: item.stream_id ?? item.series_id,
    name: smartTitleCase(item.name),
    icon: item.stream_icon || item.cover || item.cover_big || null,
    ext: item.container_extension || null,
    rating: item.rating || item.rating_5based || null,
    plot: item.plot || null,
    added: item.added || null,
    kind
  }
}
