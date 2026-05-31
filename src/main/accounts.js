// Armazenamento de contas em texto puro (JSON) na pasta de dados do usuário.
import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile } from 'fs/promises'
import { randomUUID } from 'crypto'

const filePath = () => join(app.getPath('userData'), 'accounts.json')

export async function load() {
  try {
    const raw = await readFile(filePath(), 'utf-8')
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

async function persist(accounts) {
  await writeFile(filePath(), JSON.stringify(accounts, null, 2), 'utf-8')
  return accounts
}

export async function add(account) {
  const accounts = await load()
  const entry = {
    id: randomUUID(),
    name: account.name?.trim() || account.host,
    host: account.host.trim(),
    username: account.username.trim(),
    password: account.password
  }
  accounts.push(entry)
  await persist(accounts)
  return entry
}

export async function update(id, patch) {
  const accounts = await load()
  const idx = accounts.findIndex((a) => a.id === id)
  if (idx === -1) return null
  accounts[idx] = { ...accounts[idx], ...patch, id }
  await persist(accounts)
  return accounts[idx]
}

export async function remove(id) {
  const accounts = await load()
  await persist(accounts.filter((a) => a.id !== id))
  return true
}
