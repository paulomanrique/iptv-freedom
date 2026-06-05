import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDate, daysLeft, statusLabel } from '../format'

function Detail({ account, onRemove, onSetActive, isActive }) {
  const { t } = useTranslation()
  const [info, setInfo] = useState(null)
  const [state, setState] = useState('loading') // loading | ok | error
  const [err, setErr] = useState(null)

  useEffect(() => {
    let alive = true
    setState('loading')
    setInfo(null)
    window.api.xtream
      .accountInfo(account)
      .then((res) => {
        if (!alive) return
        setInfo(res)
        setState('ok')
      })
      .catch((e) => {
        if (!alive) return
        setErr(String(e?.message || e))
        setState('error')
      })
    return () => {
      alive = false
    }
  }, [account.id])

  const ui = info?.user_info
  const srv = info?.server_info
  const st = statusLabel(ui)
  const days = ui ? daysLeft(ui.exp_date, (Number(srv?.timestamp_now) || Date.now() / 1000) * 1000) : null

  const rows = ui
    ? [
        [t('accounts.user'), account.username],
        [t('accounts.status'), st.label],
        [t('accounts.validity'), formatDate(ui.exp_date)],
        [t('accounts.connections'), `${ui.active_cons ?? '?'} / ${ui.max_connections ?? '?'}`],
        [t('accounts.format'), (ui.allowed_output_formats || []).join(', ').toUpperCase() || '—'],
        [t('accounts.trial'), String(ui.is_trial) === '1' ? t('accounts.yes') : t('accounts.no')]
      ]
    : []

  return (
    <div className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-accent to-fuchsia-500 grid place-items-center font-bold">
          {(account.name || account.host).slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-base truncate">{account.name || account.host}</div>
          <div className="text-2xs text-white/45 truncate">{account.host}</div>
        </div>
      </div>

      {state === 'loading' && (
        <div className="flex items-center gap-2 text-2xs text-white/45 py-4">
          <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          {t('accounts.validating')}
        </div>
      )}

      {state === 'error' && (
        <div className="text-2xs text-red-300 bg-red-500/10 rounded-lg px-3 py-2 my-2">
          {t('accounts.validateFail', { error: err })}
        </div>
      )}

      {state === 'ok' && (
        <>
          <div className={`inline-flex items-center gap-1.5 text-2xs rounded-full px-2.5 py-1 mb-4 ${st.ok ? 'text-emerald-400 bg-emerald-400/10' : 'text-amber-300 bg-amber-400/10'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${st.ok ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {st.label}
          </div>

          <div className="space-y-2 text-2xs">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/45">{k}</span>
                <span className="text-white/85">{v}</span>
              </div>
            ))}
          </div>

          {days != null && (
            <div className="mt-4">
              <div className="flex justify-between text-[10px] text-white/45 mb-1"><span>{t('accounts.daysLeft')}</span><span>{days}</span></div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className={`h-full ${days < 7 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(100, (days / 30) * 100)}%` }} />
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex flex-col gap-2 mt-6">
        <button
          onClick={() => onSetActive(account.id)}
          disabled={isActive}
          className="py-2 rounded-lg bg-white text-black text-2xs font-semibold disabled:opacity-50 disabled:cursor-default"
        >
          {isActive ? t('accounts.isActive') : t('accounts.makeActive')}
        </button>
        <button onClick={() => onRemove(account.id)} className="py-2 rounded-lg bg-white/10 hover:bg-red-500/30 text-2xs font-medium text-white/80">
          {t('accounts.remove')}
        </button>
      </div>
    </div>
  )
}

export default function AccountsView({ accounts, activeId, selectedId, onSelect, onAdd, onRemove, onSetActive }) {
  const { t } = useTranslation()
  const selected = accounts.find((a) => a.id === selectedId) || accounts[0]

  return (
    <>
      <section className="flex-1 min-w-0 scroll overflow-y-auto">
        <div className="p-4 space-y-2">
          {accounts.length === 0 && (
            <div className="text-2xs text-white/45 text-center py-10">{t('accounts.empty')}</div>
          )}
          {accounts.map((a) => (
            <div
              key={a.id}
              onClick={() => onSelect(a.id)}
              className={`rounded-lg p-3 flex items-center gap-3 cursor-pointer transition ${
                a.id === selected?.id ? 'bg-accent/20' : 'hover:bg-white/5'
              }`}
            >
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-accent to-fuchsia-500 grid place-items-center text-2xs font-bold">
                {(a.name || a.host).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate flex items-center gap-2">
                  {a.name || a.host}
                  {a.id === activeId && <span className="text-[9px] bg-emerald-500/20 text-emerald-300 rounded px-1.5 py-0.5">{t('accounts.active')}</span>}
                </div>
                <div className="text-[10px] text-white/45 truncate">{a.username}</div>
              </div>
            </div>
          ))}
          <button
            onClick={onAdd}
            className="w-full border border-dashed border-white/20 rounded-lg p-3 text-white/55 hover:bg-white/5 hover:text-white transition flex items-center justify-center gap-2 text-2xs"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            {t('accounts.add')}
          </button>
        </div>
      </section>

      <aside className="w-80 shrink-0 bar border-l border-white/10 scroll overflow-y-auto">
        {selected ? (
          <Detail account={selected} onRemove={onRemove} onSetActive={onSetActive} isActive={selected.id === activeId} />
        ) : (
          <div className="p-5 text-2xs text-white/45">{t('accounts.selectPrompt')}</div>
        )}
      </aside>
    </>
  )
}
