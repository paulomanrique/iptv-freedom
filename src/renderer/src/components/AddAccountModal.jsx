import { useState } from 'react'

export default function AddAccountModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', host: '', username: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!form.host || !form.username || !form.password) {
      setError('Preencha host, usuário e senha.')
      return
    }
    setBusy(true)
    try {
      const { account, info } = await window.api.accounts.add(form)
      onAdded(account, info)
      onClose()
    } catch (err) {
      setError(String(err?.message || err).replace('Error: ', ''))
    } finally {
      setBusy(false)
    }
  }

  const field = 'w-full bg-white/10 focus:bg-white/15 rounded-lg px-3 py-2 text-[13px] outline-none focus:ring-2 ring-accent/60 transition'

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-8">
      <div className="absolute inset-0 bg-black/55" onClick={busy ? undefined : onClose} />
      <form onSubmit={submit} className="glass relative w-full max-w-md rounded-2xl border border-white/10 shadow-2xl p-6 animate-fadein">
        <h2 className="text-lg font-bold mb-1">Adicionar conta</h2>
        <p className="text-2xs text-white/45 mb-5">Provedor no padrão Xtream Codes. As credenciais ficam salvas localmente.</p>

        <div className="space-y-3">
          <div>
            <label className="text-2xs text-white/50 mb-1 block">Apelido (opcional)</label>
            <input className={field} value={form.name} onChange={set('name')} placeholder="Minha conta" autoFocus />
          </div>
          <div>
            <label className="text-2xs text-white/50 mb-1 block">Host / URL</label>
            <input className={field} value={form.host} onChange={set('host')} placeholder="http://servidor.com:porta" />
          </div>
          <div>
            <label className="text-2xs text-white/50 mb-1 block">Usuário</label>
            <input className={field} value={form.username} onChange={set('username')} placeholder="usuário" />
          </div>
          <div>
            <label className="text-2xs text-white/50 mb-1 block">Senha</label>
            <input type="password" className={field} value={form.password} onChange={set('password')} placeholder="senha" />
          </div>
        </div>

        {error && <div className="mt-4 text-2xs text-red-300 bg-red-500/10 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex gap-2 mt-6">
          <button type="button" onClick={onClose} disabled={busy} className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-[13px] font-medium disabled:opacity-50">Cancelar</button>
          <button type="submit" disabled={busy} className="flex-1 py-2 rounded-lg bg-accent hover:bg-accent-soft text-white text-[13px] font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
            {busy && <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
            {busy ? 'Validando…' : 'Adicionar'}
          </button>
        </div>
      </form>
    </div>
  )
}
