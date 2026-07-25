import { useState, useEffect, useCallback } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Button, Input, Tooltip, useTheme } from "@iptv/ui";
import type { Account } from "@iptv/contracts";
import Sidebar from "./components/Sidebar";
import LanguageMenu from "./components/LanguageMenu";
import LibraryView from "./components/LibraryView";
import DownloadBar from "./components/DownloadBar";
import DownloadsView from "./components/DownloadsView";
import RecordingsView from "./components/RecordingsView";
import PlayerModal from "./components/PlayerModal";
import AccountsView from "./components/AccountsView";
import AddAccountModal from "./components/AddAccountModal";
import FavoritesView from "./components/FavoritesView";
import SearchView from "./components/SearchView";
import { useDownloads } from "./useDownloads";
import { useRecordings } from "./useRecordings";
import { useFavorites } from "./useFavorites";
import { loadFavorites } from "./favorites";

const KIND = { movies: "vod", series: "series", live: "live" } as const;
const isLibrary = (m: string): boolean => m === "movies" || m === "series" || m === "live";
const ACTIVE_KEY = "iptvfreedom.activeAccountId";

export default function App() {
  const { t } = useTranslation();
  const { theme, toggle: toggleTheme } = useTheme();
  const [mode, setMode] = useState("accounts");
  const [viewStyle, setViewStyle] = useState("list");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [player, setPlayer] = useState<Record<string, unknown> | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeId, setActiveId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_KEY) || null,
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  // null = closed; { account: null } = add; { account } = edit
  const [accountModal, setAccountModal] = useState<{ account: Account | null } | null>(null);
  const [activeMaxConn, setActiveMaxConn] = useState<number | null>(null);

  const dl = useDownloads();
  const rec = useRecordings();
  const fav = useFavorites(activeId);

  const refreshAccounts = useCallback(async () => {
    const list = await window.api.accounts.list();
    setAccounts(list);
    setActiveId((cur) => {
      if (cur && list.some((a) => a.id === cur)) return cur;
      const next = list[0]?.id || null;
      if (next) localStorage.setItem(ACTIVE_KEY, next);
      return next;
    });
    return list;
  }, []);

  useEffect(() => {
    refreshAccounts().then((list) => {
      if (list.length === 0) return;
      // Initial active account (the saved one, if valid; otherwise the first).
      const stored = localStorage.getItem(ACTIVE_KEY);
      const initialId = stored && list.some((a) => a.id === stored) ? stored : list[0]?.id;
      // Open on Favorites if there is at least one; otherwise on Live.
      setMode(loadFavorites(initialId).length > 0 ? "favorites" : "live");
    });
  }, [refreshAccounts]);

  // Fetch the active account's provider connection limit for the download bar.
  useEffect(() => {
    const acc = accounts.find((a) => a.id === activeId) || null;
    if (!acc) {
      setActiveMaxConn(null);
      return;
    }
    let alive = true;
    window.api.xtream
      .accountInfo(acc)
      .then((info) => {
        if (!alive) return;
        const max = Number(info?.user_info?.max_connections);
        setActiveMaxConn(Number.isFinite(max) && max > 0 ? max : null);
      })
      .catch(() => {
        if (alive) setActiveMaxConn(null);
      });
    return () => {
      alive = false;
    };
  }, [activeId, accounts]);

  const navigate = useCallback((m: string) => {
    setMode(m);
  }, []);

  const submitSearch = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const q = searchInput.trim();
      if (q) {
        setSearchQuery(q);
        setMode("search");
      }
    },
    [searchInput],
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout((window as unknown as { _tt: number })._tt);
    (window as unknown as { _tt: number })._tt = window.setTimeout(() => setToast(null), 2400);
  }, []);

  const activeAccount = accounts.find((a) => a.id === activeId) || null;

  const handlePlay = useCallback(
    (item: Record<string, unknown>) => setPlayer({ ...item, account: activeAccount }),
    [activeAccount],
  );
  // Replays a finished recording from disk (served over the loopback server).
  const handlePlayRecording = useCallback(
    async (r: { id: string; name: string; icon: string | null }) => {
      const url = await window.api.recordings.playUrl(r.id);
      if (!url) {
        showToast(t("recordings.playFailed"));
        return;
      }
      setPlayer({ url, name: r.name, icon: r.icon });
    },
    [showToast, t],
  );
  const handleDownload = useCallback(
    (item: Record<string, unknown>) => {
      dl.add({ ...item, account: activeAccount } as never);
      showToast(t("toast.addedToQueue", { name: item.name }));
    },
    [dl, activeAccount, showToast, t],
  );

  const setActive = useCallback(
    (id: string) => {
      setActiveId(id);
      localStorage.setItem(ACTIVE_KEY, id);
      showToast(t("toast.activeUpdated"));
    },
    [showToast, t],
  );

  const onAccountSaved = useCallback(
    (account: Account, _info: unknown, isEdit: boolean) => {
      refreshAccounts().then(() => {
        setSelectedAccountId(account.id);
        // A new account becomes active; editing preserves the current active one.
        if (!isEdit) setActive(account.id);
      });
    },
    [refreshAccounts, setActive],
  );

  const onRemoveAccount = useCallback(
    async (id: string) => {
      await window.api.accounts.remove(id);
      await refreshAccounts();
      setSelectedAccountId(null);
    },
    [refreshAccounts],
  );

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Topbar (relative z-30 keeps dropdowns anchored here — e.g. language — above the body) */}
      <header className="relative z-30 flex h-[52px] shrink-0 items-center gap-3 border-b border-border bg-sidebar px-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t(`nav.${mode}`)}
        </div>
        <div className="flex-1" />

        {isLibrary(mode) && (
          <div className="flex rounded-md border border-border p-0.5">
            <button
              onClick={() => setViewStyle("list")}
              className={`grid h-6 w-7 place-items-center rounded-sm transition-colors ${
                viewStyle === "list"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
            </button>
            <button
              onClick={() => setViewStyle("grid")}
              className={`grid h-6 w-7 place-items-center rounded-sm transition-colors ${
                viewStyle === "grid"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </button>
          </div>
        )}

        <form onSubmit={submitSearch} className="relative w-64">
          <button
            type="submit"
            disabled={!activeAccount}
            title={t("toolbar.search")}
            className="absolute start-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center text-muted-foreground hover:text-foreground disabled:hover:text-muted-foreground"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            disabled={!activeAccount}
            placeholder={t("toolbar.searchPlaceholder")}
            className="h-8 ps-8 pe-7 text-xs"
          />
          {searchInput && (
            <button
              type="button"
              title={t("toolbar.clear")}
              onClick={() => setSearchInput("")}
              className="absolute end-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center text-muted-foreground hover:text-foreground"
            >
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          )}
        </form>

        <Tooltip content={t(theme === "dark" ? "theme.light" : "theme.dark")}>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={toggleTheme}
          >
            {theme === "dark" ? (
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
            )}
          </Button>
        </Tooltip>

        <LanguageMenu />
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        <Sidebar
          view={mode}
          onNavigate={navigate}
          account={activeAccount}
          recordingActive={rec.items.some((r) => r.status === "recording")}
        />

        {mode === "favorites" &&
          (activeAccount ? (
            <FavoritesView
              key={activeAccount.id}
              account={activeAccount}
              favorites={fav.favorites}
              onPlay={handlePlay}
              onDownload={handleDownload}
              fav={fav}
            />
          ) : (
            <section className="grid flex-1 place-items-center text-xs text-muted-foreground">
              <Trans
                i18nKey="app.addActivateAccount"
                components={{
                  a: (
                    <button
                      className="mx-1 text-primary underline"
                      onClick={() => navigate("accounts")}
                    />
                  ),
                }}
              />
            </section>
          ))}

        {mode === "accounts" && (
          <AccountsView
            accounts={accounts}
            activeId={activeId}
            selectedId={selectedAccountId}
            onSelect={setSelectedAccountId}
            onAdd={() => setAccountModal({ account: null })}
            onEdit={(account: Account) => setAccountModal({ account })}
            onRemove={onRemoveAccount}
            onSetActive={setActive}
          />
        )}

        {isLibrary(mode) &&
          (activeAccount ? (
            <LibraryView
              key={activeAccount.id + mode}
              account={activeAccount}
              kind={KIND[mode as keyof typeof KIND]}
              viewStyle={viewStyle}
              onPlay={handlePlay}
              onDownload={handleDownload}
              fav={fav}
            />
          ) : (
            <section className="grid flex-1 place-items-center text-xs text-muted-foreground">
              <Trans
                i18nKey="app.addActivateAccount"
                components={{
                  a: (
                    <button
                      className="mx-1 text-primary underline"
                      onClick={() => navigate("accounts")}
                    />
                  ),
                }}
              />
            </section>
          ))}

        {mode === "search" && activeAccount && (
          <SearchView
            key={activeAccount.id + ":" + searchQuery}
            account={activeAccount}
            query={searchQuery}
            onPlay={handlePlay}
            onDownload={handleDownload}
            fav={fav}
          />
        )}

        {mode === "downloads" && (
          <DownloadsView
            downloads={dl.items}
            onPause={dl.pause}
            onResume={dl.resume}
            onCancel={dl.cancel}
            onOpen={dl.openFolder}
            onClearCompleted={dl.clearCompleted}
          />
        )}

        {mode === "recordings" && (
          <RecordingsView
            recordings={rec.items}
            onStop={rec.stop}
            onOpen={rec.openFolder}
            onRemove={rec.remove}
            onClearStopped={rec.clearStopped}
            onPlay={handlePlayRecording}
          />
        )}
      </div>

      <DownloadBar
        downloads={dl.items}
        maxConnections={activeMaxConn}
        onOpen={() => navigate("downloads")}
      />

      <PlayerModal
        item={player}
        onClose={() => setPlayer(null)}
        recordings={rec.items}
        notify={showToast}
      />
      {accountModal && (
        <AddAccountModal
          account={accountModal.account}
          onClose={() => setAccountModal(null)}
          onSaved={onAccountSaved}
        />
      )}

      {toast && (
        <div className="fixed bottom-12 left-1/2 z-[60] -translate-x-1/2 rounded-lg border border-border bg-popover px-4 py-2 text-xs text-popover-foreground shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
