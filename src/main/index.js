import { app, shell, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'path'
import * as accountsStore from './accounts'
import * as xtream from './xtream'
import * as downloads from './downloads'

let mainWindow = null

// No macOS, os atalhos de edição (Cmd+C/V/X/A/Z) vêm do menu Edit nativo —
// sem menu, eles param de funcionar nos campos de texto. Então mantemos um menu
// mínimo (só os roles padrão) no Mac e removemos o menu no Windows/Linux.
if (process.platform === 'darwin') {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }])
  )
} else {
  Menu.setApplicationMenu(null)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 960,
    minHeight: 600,
    show: false,
    title: 'IPTV Freedom',
    backgroundColor: '#0b0d13',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  // Envia eventos de download para o renderer
  downloads.setSender((channel, payload) => mainWindow?.webContents.send(channel, payload))

  // Abrir links externos no navegador padrão, nunca dentro do app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ---- Contas ----
ipcMain.handle('accounts:list', () => accountsStore.load())
ipcMain.handle('accounts:add', async (_e, account) => {
  // Valida as credenciais antes de salvar
  const info = await xtream.getAccountInfo(account)
  if (!info?.user_info || Number(info.user_info.auth) !== 1) {
    // Código estável; o renderer (AddAccountModal) traduz para o idioma ativo.
    throw new Error('auth_failed')
  }
  const entry = await accountsStore.add(account)
  return { account: entry, info }
})
ipcMain.handle('accounts:update', async (_e, id, account) => {
  // Revalida as credenciais (podem ter mudado) antes de gravar
  const info = await xtream.getAccountInfo(account)
  if (!info?.user_info || Number(info.user_info.auth) !== 1) {
    throw new Error('auth_failed')
  }
  const entry = await accountsStore.update(id, {
    name: account.name?.trim() || account.host,
    host: account.host.trim(),
    username: account.username.trim(),
    password: account.password
  })
  return { account: entry, info }
})
ipcMain.handle('accounts:remove', (_e, id) => accountsStore.remove(id))

// ---- Xtream ----
ipcMain.handle('xtream:accountInfo', (_e, account) => xtream.getAccountInfo(account))
ipcMain.handle('xtream:categories', (_e, account, kind) => xtream.getCategories(account, kind))
ipcMain.handle('xtream:streams', (_e, account, kind, categoryId) => xtream.getStreams(account, kind, categoryId))
ipcMain.handle('xtream:seriesInfo', (_e, account, seriesId) => xtream.getSeriesInfo(account, seriesId))
ipcMain.handle('xtream:vodInfo', (_e, account, vodId) => xtream.getVodInfo(account, vodId))
ipcMain.handle('xtream:streamUrl', (_e, account, type, id, ext) => xtream.streamUrl(account, type, id, ext))

// ---- Downloads ----
ipcMain.handle('download:list', () => downloads.list())
ipcMain.handle('download:add', (_e, item) => downloads.add(item))
ipcMain.handle('download:pause', (_e, id) => downloads.pause(id))
ipcMain.handle('download:resume', (_e, id) => downloads.resume(id))
ipcMain.handle('download:cancel', (_e, id) => downloads.cancel(id))
ipcMain.handle('download:openFolder', (_e, id) => downloads.openFolder(id))
ipcMain.handle('download:clearCompleted', () => downloads.clearCompleted())

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
