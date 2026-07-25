import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Account, AccountInfo } from "@iptv/contracts";
import { Badge, Button, Progress } from "@iptv/ui";
import { formatDate, daysLeft, statusLabel } from "../format";

interface DetailProps {
  account: Account;
  onRemove: (id: string) => void;
  onSetActive: (id: string) => void;
  onEdit: (account: Account) => void;
  isActive: boolean;
}

function Detail({ account, onRemove, onSetActive, onEdit, isActive }: DetailProps) {
  const { t } = useTranslation();
  const [info, setInfo] = useState<AccountInfo | null>(null);
  const [state, setState] = useState("loading"); // loading | ok | error
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setState("loading");
    setInfo(null);
    window.api.xtream
      .accountInfo(account)
      .then((res) => {
        if (!alive) return;
        setInfo(res);
        setState("ok");
      })
      .catch((e) => {
        if (!alive) return;
        setErr(String(e instanceof Error ? e.message : e));
        setState("error");
      });
    return () => {
      alive = false;
    };
  }, [account.id]);

  const ui = info?.user_info;
  const srv = info?.server_info;
  const st = statusLabel(ui);
  const days = ui
    ? daysLeft(ui.exp_date, (Number(srv?.timestamp_now) || Date.now() / 1000) * 1000)
    : null;

  const rows = ui
    ? [
        [t("accounts.user"), account.username],
        [t("accounts.status"), st.label],
        [t("accounts.validity"), formatDate(ui.exp_date)],
        [t("accounts.connections"), `${ui.active_cons ?? "?"} / ${ui.max_connections ?? "?"}`],
        [
          t("accounts.format"),
          (Array.isArray(ui.allowed_output_formats) ? ui.allowed_output_formats : [])
            .join(", ")
            .toUpperCase() || "—",
        ],
        [t("accounts.trial"), String(ui.is_trial) === "1" ? t("accounts.yes") : t("accounts.no")],
      ]
    : [];

  return (
    <div className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">
          {(account.name || account.host).slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-base truncate">{account.name || account.host}</div>
          <div className="text-xs text-muted-foreground truncate">{account.host}</div>
        </div>
      </div>

      {state === "loading" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
          <span className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
          {t("accounts.validating")}
        </div>
      )}

      {state === "error" && (
        <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2 my-2">
          {t("accounts.validateFail", { error: err })}
        </div>
      )}

      {state === "ok" && (
        <>
          <Badge variant={st.ok ? "success" : "warning"} className="mb-4">
            <span className={`h-1.5 w-1.5 rounded-full ${st.ok ? "bg-success" : "bg-warning"}`} />
            {st.label}
          </Badge>

          <div className="space-y-2 text-xs">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">{k}</span>
                <span className="text-foreground">{v}</span>
              </div>
            ))}
          </div>

          {days != null && (
            <div className="mt-4">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>{t("accounts.daysLeft")}</span>
                <span>{days}</span>
              </div>
              <Progress value={Math.min(100, (days / 30) * 100)} className="h-1.5" />
            </div>
          )}
        </>
      )}

      <div className="flex flex-col gap-2 mt-6">
        <Button onClick={() => onSetActive(account.id)} disabled={isActive} size="sm">
          {isActive ? t("accounts.isActive") : t("accounts.makeActive")}
        </Button>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(account)}
            className="flex-1 py-2 rounded-lg bg-muted hover:bg-accent text-xs font-medium text-foreground"
          >
            {t("accounts.edit")}
          </button>
          <button
            onClick={() => onRemove(account.id)}
            className="flex-1 py-2 rounded-lg bg-muted hover:bg-destructive/30 text-xs font-medium text-foreground"
          >
            {t("accounts.remove")}
          </button>
        </div>
      </div>
    </div>
  );
}

interface AccountsViewProps {
  accounts: Account[];
  activeId: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onSetActive: (id: string) => void;
  onEdit: (account: Account) => void;
}

export default function AccountsView({
  accounts,
  activeId,
  selectedId,
  onSelect,
  onAdd,
  onRemove,
  onSetActive,
  onEdit,
}: AccountsViewProps) {
  const { t } = useTranslation();
  const selected = accounts.find((a) => a.id === selectedId) || accounts[0];

  return (
    <>
      <section className="flex-1 min-w-0 scroll overflow-y-auto">
        <div className="p-4 space-y-2">
          {accounts.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-10">
              {t("accounts.empty")}
            </div>
          )}
          {accounts.map((a) => (
            <div
              key={a.id}
              onClick={() => onSelect(a.id)}
              className={`rounded-lg p-3 flex items-center gap-3 cursor-pointer transition ${
                a.id === selected?.id ? "bg-accent" : "hover:bg-accent"
              }`}
            >
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                {(a.name || a.host).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate flex items-center gap-2">
                  {a.name || a.host}
                  {a.id === activeId && (
                    <span className="text-[9px] bg-success/20 text-success rounded px-1.5 py-0.5">
                      {t("accounts.active")}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">{a.username}</div>
              </div>
            </div>
          ))}
          <button
            onClick={onAdd}
            className="w-full border border-dashed border-border rounded-lg p-3 text-muted-foreground hover:bg-accent hover:text-foreground transition flex items-center justify-center gap-2 text-xs"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t("accounts.add")}
          </button>
        </div>
      </section>

      <aside className="w-80 shrink-0  border-s border-border scroll overflow-y-auto">
        {selected ? (
          <Detail
            account={selected}
            onRemove={onRemove}
            onSetActive={onSetActive}
            onEdit={onEdit}
            isActive={selected.id === activeId}
          />
        ) : (
          <div className="p-5 text-xs text-muted-foreground">{t("accounts.selectPrompt")}</div>
        )}
      </aside>
    </>
  );
}
