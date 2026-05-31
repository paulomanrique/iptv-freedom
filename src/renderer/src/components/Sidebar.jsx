import { ACCOUNT, CATEGORIES } from '../data'

const SECTIONS = [
  { key: 'movies', label: 'Filmes', count: '8.412' },
  { key: 'series', label: 'Séries', count: '2.103' },
  { key: 'live', label: 'Ao vivo', count: '312' },
  { key: 'downloads', label: 'Downloads', count: '2' },
  { key: 'accounts', label: 'Contas', count: '1' }
]

export default function Sidebar({ view, onNavigate }) {
  return (
    <aside className="w-52 shrink-0 bar border-r border-white/10 flex flex-col py-2 scroll overflow-y-auto">
      <button
        onClick={() => onNavigate('accounts')}
        className="no-drag mx-2 px-1 py-2 flex items-center gap-2.5 rounded-lg hover:bg-white/5 transition text-left"
      >
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent to-fuchsia-500 grid place-items-center text-2xs font-bold">A1</div>
        <div className="min-w-0">
          <div className="text-2xs font-semibold truncate">{ACCOUNT.host}</div>
          <div className="text-[10px] text-emerald-400">● {ACCOUNT.status} · {ACCOUNT.exp.slice(0, 5)}</div>
        </div>
      </button>

      <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider text-white/35">Biblioteca</div>
      <div className="px-2 space-y-0.5">
        {SECTIONS.map((s) => (
          <div
            key={s.key}
            onClick={() => onNavigate(s.key)}
            className={`px-3 py-1.5 rounded-md cursor-pointer flex items-center justify-between transition ${
              view === s.key ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5'
            }`}
          >
            <span>{s.label}</span>
            <span className="text-[10px] text-white/35">{s.count}</span>
          </div>
        ))}
      </div>

      <div className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-wider text-white/35">Categorias</div>
      <div className="px-2 space-y-0.5 text-2xs text-white/65">
        {CATEGORIES.map((g) => (
          <div key={g} className="px-3 py-1.5 rounded-md hover:bg-white/10 cursor-pointer flex items-center gap-2">
            <span className="h-2 w-2 rounded-sm bg-white/25" />
            {g}
          </div>
        ))}
      </div>
    </aside>
  )
}
