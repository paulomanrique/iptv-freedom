import { useState, useEffect, useCallback } from 'react'
import { loadFavorites, saveFavorites, isFavorite, toggleFavorite } from './favorites'

// Mantém os favoritos da conta ativa em estado React + localStorage.
export function useFavorites(accountId) {
  const [favorites, setFavorites] = useState(() => loadFavorites(accountId))

  useEffect(() => {
    setFavorites(loadFavorites(accountId))
  }, [accountId])

  const isFav = useCallback((kind, id) => isFavorite(favorites, kind, id), [favorites])

  const toggle = useCallback(
    (item) => {
      setFavorites((cur) => {
        const next = toggleFavorite(cur, item)
        saveFavorites(accountId, next)
        return next
      })
    },
    [accountId]
  )

  return { favorites, isFav, toggle }
}
