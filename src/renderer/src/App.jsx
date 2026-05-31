import { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import ContentList from './components/ContentList'
import PreviewPane from './components/PreviewPane'
import DownloadBar from './components/DownloadBar'
import PlayerModal from './components/PlayerModal'
import WindowControls from './components/WindowControls'

const TITLES = { movies: 'Filmes', series: 'Séries', live: 'Ao vivo', downloads: 'Downloads', accounts: 'Contas' }
const hasPreview = (mode) => mode !== 'downloads'

export default function App() {
  const [mode, setMode] = useState('movies')
  const [viewStyle, setViewStyle] = useState('list')
  const [selected, setSelected] = useState(0)
  const [player, setPlayer] = useState(null)
  const [toast, setToast] = useState(null)
  const isMac = window.api?.platform === 'darwin'

  const navigate = useCallback((m) => {
    setMode(m)
    setSelected(0)
  }, [])

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(window._tt)
    window._tt = setTimeout(() => setToast(null), 2400)
  }, [])

  const onDownload = useCallback((m) => showToast(`⬇︎ ${m.t} adicionado à fila`), [showToast])

  return (
    <div className="h-screen w-screen p-3">
      <div className="glass h-full w-full rounded-2xl border border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,.85)] overflow-hidden flex flex-col ring-1 ring-black/20">

        {/* Toolbar (região arrastável) */}
        <div className="drag bar h-11 shrink-0 flex items-center px-3 gap-3 border-b border-white/10">
          {isMac && <div className="w-16" /> /* espaço p/ traffic lights nativos */}
          <div className="no-drag font-semibold text-white/70 text-2xs uppercase tracking-wider">{TITLES[mode]}</div>
          <div className="flex-1" />

          {/* Toggle de visualização */}
          {(mode === 'movies' || mode === 'series') && (
            <div className="no-drag bar flex rounded-lg p-0.5 border border-white/10">
              <button
                onClick={() => setViewStyle('list')}
                className={`h-6 w-7 grid place-items-center rounded-md ${viewStyle === 'list' ? 'bg-white/15' : 'text-white/50'}`}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
              </button>
              <button
                onClick={() => setViewStyle('grid')}
                className={`h-6 w-7 grid place-items-center rounded-md ${viewStyle === 'grid' ? 'bg-white/15' : 'text-white/50'}`}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              </button>
            </div>
          )}

          {/* Busca */}
          <div className="no-drag relative w-56">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              placeholder="Buscar…"
              className="w-full bg-white/10 focus:bg-white/15 rounded-md pl-8 pr-3 py-1.5 text-2xs outline-none focus:ring-2 ring-accent/60"
            />
          </div>

          <WindowControls />
        </div>

        {/* Corpo: sidebar + lista + prévia */}
        <div className="flex-1 flex min-h-0">
          <Sidebar view={mode} onNavigate={navigate} />

          <section className="flex-1 min-w-0 scroll overflow-y-auto">
            <ContentList
              mode={mode}
              viewStyle={viewStyle}
              selected={selected}
              onSelect={setSelected}
              onPlay={setPlayer}
            />
          </section>

          {hasPreview(mode) && (
            <aside className="w-80 shrink-0 bar border-l border-white/10 scroll overflow-y-auto">
              <PreviewPane mode={mode} selected={selected} onPlay={setPlayer} onDownload={onDownload} />
            </aside>
          )}
        </div>

        <DownloadBar onOpen={() => navigate('downloads')} />
      </div>

      <PlayerModal item={player} onClose={() => setPlayer(null)} />

      {toast && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[60] glass border border-white/10 rounded-lg px-4 py-2 text-2xs shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  )
}
