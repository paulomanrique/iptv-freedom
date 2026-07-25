import { app, shell, BrowserWindow, ipcMain, Menu } from "electron";
import { join } from "path";
import * as accountsStore from "./accounts";
import * as xtream from "./xtream";
import * as downloads from "./downloads";
import type { Account, AccountInput, Kind, StreamType } from "@iptv/contracts";

let mainWindow: BrowserWindow | null = null;

// On macOS the edit shortcuts (Cmd+C/V/X/A/Z) come from the native Edit menu —
// without a menu they stop working in text fields. So we keep a minimal menu
// (default roles only) on Mac and remove the menu on Windows/Linux.
if (process.platform === "darwin") {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([{ role: "appMenu" }, { role: "editMenu" }, { role: "windowMenu" }]),
  );
} else {
  Menu.setApplicationMenu(null);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 960,
    minHeight: 600,
    show: false,
    title: "IPTV Freedom",
    backgroundColor: "#0b0d13",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });

  mainWindow.on("ready-to-show", () => mainWindow?.show());

  // Forward download events to the renderer.
  downloads.setSender((channel, payload) => mainWindow?.webContents.send(channel, payload));

  // Open external links in the default browser, never inside the app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

// ---- Accounts ----
ipcMain.handle("accounts:list", () => accountsStore.load());
ipcMain.handle("accounts:add", async (_e, account: AccountInput) => {
  // Validate the credentials before saving.
  const info = await xtream.getAccountInfo(account as Account);
  if (!info?.user_info || Number(info.user_info.auth) !== 1) {
    // Stable code; the renderer (AddAccountModal) translates it to the active language.
    throw new Error("auth_failed");
  }
  const entry = await accountsStore.add(account);
  return { account: entry, info };
});
ipcMain.handle("accounts:update", async (_e, id: string, account: AccountInput) => {
  // Re-validate the credentials (they may have changed) before writing.
  const info = await xtream.getAccountInfo(account as Account);
  if (!info?.user_info || Number(info.user_info.auth) !== 1) {
    throw new Error("auth_failed");
  }
  const entry = await accountsStore.update(id, {
    name: account.name?.trim() || account.host,
    host: account.host.trim(),
    username: account.username.trim(),
    password: account.password,
  });
  return { account: entry, info };
});
ipcMain.handle("accounts:remove", (_e, id: string) => accountsStore.remove(id));

// ---- Xtream ----
ipcMain.handle("xtream:accountInfo", (_e, account: Account) => xtream.getAccountInfo(account));
ipcMain.handle("xtream:categories", (_e, account: Account, kind: Kind) =>
  xtream.getCategories(account, kind),
);
ipcMain.handle("xtream:streams", (_e, account: Account, kind: Kind, categoryId?: string) =>
  xtream.getStreams(account, kind, categoryId),
);
ipcMain.handle("xtream:seriesInfo", (_e, account: Account, seriesId: string | number) =>
  xtream.getSeriesInfo(account, seriesId),
);
ipcMain.handle("xtream:vodInfo", (_e, account: Account, vodId: string | number) =>
  xtream.getVodInfo(account, vodId),
);
ipcMain.handle(
  "xtream:streamUrl",
  (_e, account: Account, type: StreamType, id: string | number, ext?: string) =>
    xtream.streamUrl(account, type, id, ext),
);

// ---- Downloads ----
ipcMain.handle("download:list", () => downloads.list());
ipcMain.handle("download:add", (_e, item) => downloads.add(item));
ipcMain.handle("download:pause", (_e, id: string) => downloads.pause(id));
ipcMain.handle("download:resume", (_e, id: string) => downloads.resume(id));
ipcMain.handle("download:cancel", (_e, id: string) => downloads.cancel(id));
ipcMain.handle("download:openFolder", (_e, id: string) => downloads.openFolder(id));
ipcMain.handle("download:clearCompleted", () => downloads.clearCompleted());

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
