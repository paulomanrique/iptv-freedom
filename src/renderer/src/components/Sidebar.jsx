const SECTIONS = [
  { key: 'favorites', label: 'Favoritos' },
  { key: 'live', label: 'Ao vivo' },
  { key: 'movies', label: 'Filmes' },
  { key: 'series', label: 'Séries' },
  { key: 'downloads', label: 'Downloads' },
  { key: 'accounts', label: 'Contas' }
]

export default function Sidebar({ view, onNavigate, account }) {
  const initials = account ? (account.name || account.host).slice(0, 2).toUpperCase() : '—'

  return (
    <aside className="w-52 shrink-0 bar border-r border-white/10 flex flex-col py-2 scroll overflow-y-auto">
      <button onClick={() => onNavigate('accounts')} className="no-drag mx-2 px-1 py-2 flex items-center gap-2.5 rounded-lg hover:bg-white/5 transition text-left">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent to-fuchsia-500 grid place-items-center text-2xs font-bold">{initials}</div>
        <div className="min-w-0">
          {account ? (
            <>
              <div className="text-2xs font-semibold truncate">{account.name || account.host}</div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Conta ativa</div>
            </>
          ) : (
            <>
              <div className="text-2xs font-semibold truncate text-white/60">Sem conta</div>
              <div className="text-[10px] text-white/40">Clique para adicionar</div>
            </>
          )}
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
          </div>
        ))}
      </div>
    </aside>
  )
}
