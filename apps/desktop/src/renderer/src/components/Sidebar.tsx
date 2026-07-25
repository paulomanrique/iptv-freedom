import { useTranslation } from "react-i18next";
import type { Account } from "@iptv/contracts";

const SECTION_KEYS = ["favorites", "live", "movies", "series", "downloads", "accounts"];

interface SidebarProps {
  view: string;
  onNavigate: (key: string) => void;
  account: Account | null;
}

export default function Sidebar({ view, onNavigate, account }: SidebarProps) {
  const { t } = useTranslation();
  const initials = account ? (account.name || account.host).slice(0, 2).toUpperCase() : "—";

  return (
    <aside className="scroll flex w-52 shrink-0 flex-col overflow-y-auto border-e border-sidebar-border bg-sidebar py-2 text-sidebar-foreground">
      <button
        onClick={() => onNavigate("accounts")}
        className="mx-2 flex items-center gap-2.5 rounded-lg px-1 py-2 text-start transition-colors hover:bg-accent"
      >
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
          {initials}
        </div>
        <div className="min-w-0">
          {account ? (
            <>
              <div className="truncate text-xs font-semibold">{account.name || account.host}</div>
              <div className="flex items-center gap-1 text-[10px] text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {t("sidebar.activeAccount")}
              </div>
            </>
          ) : (
            <>
              <div className="truncate text-xs font-semibold text-muted-foreground">
                {t("sidebar.noAccount")}
              </div>
              <div className="text-[10px] text-muted-foreground">{t("sidebar.clickToAdd")}</div>
            </>
          )}
        </div>
      </button>

      <div className="px-3 pb-1 pt-3 text-[10px] uppercase tracking-wide text-muted-foreground">
        {t("sidebar.library")}
      </div>
      <div className="space-y-0.5 px-2">
        {SECTION_KEYS.map((key) => (
          <div
            key={key}
            onClick={() => onNavigate(key)}
            className={`flex cursor-pointer items-center justify-between rounded-md px-3 py-1.5 text-sm transition-colors ${
              view === key
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <span>{t(`nav.${key}`)}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
