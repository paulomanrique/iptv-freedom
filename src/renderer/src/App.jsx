import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import LibraryView from './components/LibraryView'
import DownloadBar from './components/DownloadBar'
import PlayerModal from './components/PlayerModal'
import WindowControls from './components/WindowControls'
import AccountsView from './components/AccountsView'
import AddAccountModal from './components/AddAccountModal'

const TITLES = { movies: 'Filmes', series: 'Séries', live: 'Ao vivo', downloads: 'Downloads', accounts: 'Contas' }
const KIND = { movies: 'vod', series: 'series', live: 'live' }
const isLibrary = (m) => m === 'movies' || m === 'series' || m === 'live'
const ACTIVE_KEY = 'iptvfreedom.activeAccountId'

export default function App() {
  const [mode, setMode] = useState('accounts')
  const [viewStyle, setViewStyle] = useState('list')
  const [query, setQuery] = useState('')
  const [player, setPlayer] = useState(null)
  const [toast, setToast] = useState(null)

  const [accounts, setAccounts] = useState([])
  const [activeId, setActiveId] = useState(() => localStorage.getItem(ACTIVE_KEY) || null)
  const [selectedAccountId, setSelectedAccountId] = useState(null)
  const [showAddAccount, setShowAddAccount] = useState(false)

  const isMac = window.api?.platform === 'darwin'

  const refreshAccounts = useCallback(async () => {
    const list = await window.api.accounts.list()
    setAccounts(list)
    setActiveId((cur) => {
      if (cur && list.some((a) => a.id === cur)) return cur
      const next = list[0]?.id || null
      if (next) localStorage.setItem(ACTIVE_KEY, next)
      return next
    })
    return list
  }, [])

  useEffect(() => {
    refreshAccounts().then((list) => {
      if (list.length > 0) setMode('movies')
    })
  }, [refreshAccounts])

  const navigate = useCallback((m) => {
    setMode(m)
    setQuery('')
  }, [])

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(window._tt)
    window._tt = setTimeout(() => setToast(null), 2400)
  }, [])

  const activeAccount = accounts.find((a) => a.id === activeId) || null

  const handlePlay = useCallback((item) => setPlayer({ ...item, account: activeAccount }), [activeAccount])
  const handleDownload = useCallback((item) => showToast(`⬇︎ ${item.name} — download em breve (próxima fase)`), [showToast])

  const setActive = useCallback((id) => {
    setActiveId(id)
    localStorage.setItem(ACTIVE_KEY, id)
    showToast('Conta ativa atualizada')
  }, [showToast])

  const onAccountAdded = useCallback((account) => {
    refreshAccounts().then(() => {
      setSelectedAccountId(account.id)
      setActive(account.id)
    })
  }, [refreshAccounts, setActive])

  const onRemoveAccount = useCallback(async (id) => {
    await window.api.accounts.remove(id)
    await refreshAccounts()
    setSelectedAccountId(null)
  }, [refreshAccounts])

  return (
    <div className="h-screen w-screen p-3">
      <div className="glass h-full w-full rounded-2xl border border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,.85)] overflow-hidden flex flex-col ring-1 ring-black/20">

        {/* Toolbar */}
        <div className="drag bar h-11 shrink-0 flex items-center px-3 gap-3 border-b border-white/10">
          {isMac && <div className="w-16" />}
          <div className="no-drag font-semibold text-white/70 text-2xs uppercase tracking-wider">{TITLES[mode]}</div>
          <div className="flex-1" />

          {(mode === 'movies' || mode === 'series') && (
            <div className="no-drag bar flex rounded-lg p-0.5 border border-white/10">
              <button onClick={() => setViewStyle('list')} className={`h-6 w-7 grid place-items-center rounded-md ${viewStyle === 'list' ? 'bg-white/15' : 'text-white/50'}`}>
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
              </button>
              <button onClick={() => setViewStyle('grid')} className={`h-6 w-7 grid place-items-center rounded-md ${viewStyle === 'grid' ? 'bg-white/15' : 'text-white/50'}`}>
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              </button>
            </div>
          )}

          <div className="no-drag relative w-56">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              value={isLibrary(mode) ? query : ''}
              onChange={(e) => isLibrary(mode) && setQuery(e.target.value)}
              disabled={!isLibrary(mode)}
              placeholder="Buscar…"
              className="w-full bg-white/10 focus:bg-white/15 rounded-md pl-8 pr-3 py-1.5 text-2xs outline-none focus:ring-2 ring-accent/60 disabled:opacity-40"
            />
          </div>

          <WindowControls />
        </div>

        {/* Corpo */}
        <div className="flex-1 flex min-h-0">
          <Sidebar view={mode} onNavigate={navigate} account={activeAccount} />

          {mode === 'accounts' && (
            <AccountsView
              accounts={accounts}
              activeId={activeId}
              selectedId={selectedAccountId}
              onSelect={setSelectedAccountId}
              onAdd={() => setShowAddAccount(true)}
              onRemove={onRemoveAccount}
              onSetActive={setActive}
            />
          )}

          {isLibrary(mode) && (
            activeAccount ? (
              <LibraryView
                key={activeAccount.id + mode}
                account={activeAccount}
                kind={KIND[mode]}
                viewStyle={viewStyle}
                query={query}
                onPlay={handlePlay}
                onDownload={handleDownload}
              />
            ) : (
              <section className="flex-1 grid place-items-center text-2xs text-white/45">
                Adicione e ative uma conta em <button className="underline ml-1" onClick={() => navigate('accounts')}>Contas</button>.
              </section>
            )
          )}

          {mode === 'downloads' && (
            <section className="flex-1 grid place-items-center text-2xs text-white/45 text-center px-8">
              Gerenciador de downloads — em implementação (próxima fase).<br />Fila de 1 conexão, com retomada.
            </section>
          )}
        </div>

        <DownloadBar onOpen={() => navigate('downloads')} />
      </div>

      <PlayerModal item={player} onClose={() => setPlayer(null)} />
      {showAddAccount && <AddAccountModal onClose={() => setShowAddAccount(false)} onAdded={onAccountAdded} />}

      {toast && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[60] glass border border-white/10 rounded-lg px-4 py-2 text-2xs shadow-2xl">{toast}</div>
      )}
    </div>
  )
}
