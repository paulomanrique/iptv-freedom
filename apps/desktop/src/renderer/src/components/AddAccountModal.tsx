import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Account, AccountInfo, AccountInput } from '@iptv/contracts'
import { Button, Dialog, DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input } from '@iptv/ui'

interface AddAccountModalProps {
  account: Account | null
  onClose: () => void
  onSaved: (account: Account, info: AccountInfo, isEdit: boolean) => void
}

// An account enables edit mode; otherwise the form creates a new account.
export default function AddAccountModal({ account, onClose, onSaved }: AddAccountModalProps) {
  const { t } = useTranslation()
  const isEdit = !!account
  const [form, setForm] = useState({
    name: account?.name || '',
    host: account?.host || '',
    username: account?.username || '',
    password: account?.password || ''
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof AccountInput) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.host || !form.username || !form.password) {
      setError(t('addAccount.fillFields'))
      return
    }
    setBusy(true)
    try {
      const { account: saved, info } = isEdit
        ? await window.api.accounts.update(account.id, form)
        : await window.api.accounts.add(form)
      if (!saved) throw new Error('Account was not saved')
      onSaved(saved, info, isEdit)
      onClose()
    } catch (err: unknown) {
      const msg = String(err instanceof Error ? err.message : err).replace('Error: ', '')
      // The main process throws the stable auth_failed code for invalid credentials.
      setError(msg.includes('auth_failed') ? t('errors.authFailed') : msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <form onSubmit={submit}>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('accounts.edit') : t('addAccount.title')}</DialogTitle>
          <DialogDescription className="text-xs">{t('addAccount.subtitle')}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('addAccount.nickname')}</label>
            <Input value={form.name} onChange={set('name')} placeholder={t('addAccount.nicknamePlaceholder')} autoFocus />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('addAccount.host')}</label>
            <Input value={form.host} onChange={set('host')} placeholder={t('addAccount.hostPlaceholder')} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('addAccount.user')}</label>
            <Input value={form.username} onChange={set('username')} placeholder={t('addAccount.userPlaceholder')} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('addAccount.password')}</label>
            <Input type="password" value={form.password} onChange={set('password')} placeholder={t('addAccount.passwordPlaceholder')} />
          </div>
        

          {error && <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>{t('addAccount.cancel')}</Button>
          <Button type="submit" disabled={busy}>
            {busy && <span className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/40 border-t-foreground animate-spin" />}
            {busy ? t('addAccount.validating') : isEdit ? t('addAccount.save') : t('addAccount.add')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
