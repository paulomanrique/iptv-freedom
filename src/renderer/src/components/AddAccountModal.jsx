import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function AddAccountModal({ onClose, onAdded }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({ name: '', host: '', username: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!form.host || !form.username || !form.password) {
      setError(t('addAccount.fillFields'))
      return
    }
    setBusy(true)
    try {
      const { account, info } = await window.api.accounts.add(form)
      onAdded(account, info)
      onClose()
    } catch (err) {
      const msg = String(err?.message || err).replace('Error: ', '')
      // O main lança o código estável 'auth_failed' para credenciais inválidas.
      setError(msg.includes('auth_failed') ? t('errors.authFailed') : msg)
    } finally {
      setBusy(false)
    }
  }

  const field = 'w-full bg-white/10 focus:bg-white/15 rounded-lg px-3 py-2 text-[13px] outline-none focus:ring-2 ring-accent/60 transition'

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-8">
      <div className="absolute inset-0 bg-black/55" onClick={busy ? undefined : onClose} />
      <form onSubmit={submit} className="glass relative w-full max-w-md rounded-2xl border border-white/10 shadow-2xl p-6 animate-fadein">
        <h2 className="text-lg font-bold mb-1">{t('addAccount.title')}</h2>
        <p className="text-2xs text-white/45 mb-5">{t('addAccount.subtitle')}</p>

        <div className="space-y-3">
          <div>
            <label className="text-2xs text-white/50 mb-1 block">{t('addAccount.nickname')}</label>
            <input className={field} value={form.name} onChange={set('name')} placeholder={t('addAccount.nicknamePlaceholder')} autoFocus />
          </div>
          <div>
            <label className="text-2xs text-white/50 mb-1 block">{t('addAccount.host')}</label>
            <input className={field} value={form.host} onChange={set('host')} placeholder={t('addAccount.hostPlaceholder')} />
          </div>
          <div>
            <label className="text-2xs text-white/50 mb-1 block">{t('addAccount.user')}</label>
            <input className={field} value={form.username} onChange={set('username')} placeholder={t('addAccount.userPlaceholder')} />
          </div>
          <div>
            <label className="text-2xs text-white/50 mb-1 block">{t('addAccount.password')}</label>
            <input type="password" className={field} value={form.password} onChange={set('password')} placeholder={t('addAccount.passwordPlaceholder')} />
          </div>
        </div>

        {error && <div className="mt-4 text-2xs text-red-300 bg-red-500/10 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex gap-2 mt-6">
          <button type="button" onClick={onClose} disabled={busy} className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-[13px] font-medium disabled:opacity-50">{t('addAccount.cancel')}</button>
          <button type="submit" disabled={busy} className="flex-1 py-2 rounded-lg bg-accent hover:bg-accent-soft text-white text-[13px] font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
            {busy && <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
            {busy ? t('addAccount.validating') : t('addAccount.add')}
          </button>
        </div>
      </form>
    </div>
  )
}
