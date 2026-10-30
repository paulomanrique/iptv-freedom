import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { ProxySettings } from "@iptv/contracts";
import { Button, Input, Select } from "@iptv/ui";

export default function ProxySettingsPanel({ onSaved }: { onSaved: () => void }) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<ProxySettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    window.api.proxy
      .get()
      .then((value) => {
        if (alive) setSettings(value);
      })
      .catch(() => {
        if (alive) setError("loadFailed");
      });
    return () => {
      alive = false;
    };
  }, []);

  function change<K extends keyof ProxySettings>(key: K, value: ProxySettings[K]): void {
    setSettings((previous) => (previous ? { ...previous, [key]: value } : previous));
    setSaved(false);
    setError(null);
  }

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!settings) return;
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      const result = await window.api.proxy.set(settings);
      setSettings(result);
      setSaved(true);
      onSaved();
    } catch (error) {
      const message = String(error);
      setError(
        message.includes("proxy_socks_auth")
          ? "socksAuth"
          : message.includes("proxy_invalid")
            ? "invalid"
            : "saveFailed",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 border-t border-border pt-5">
      <h2 className="text-sm font-semibold">{t("proxy.title")}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{t("proxy.description")}</p>
      {settings ? (
        <fieldset disabled={busy} className="mt-4 max-w-xl space-y-3 disabled:opacity-60">
          <label className="block space-y-1 text-xs text-muted-foreground">
            <span>{t("proxy.mode")}</span>
            <Select
              value={settings.mode}
              onChange={(event) => change("mode", event.target.value as ProxySettings["mode"])}
            >
              <option value="direct">{t("proxy.direct")}</option>
              <option value="system">{t("proxy.system")}</option>
              <option value="custom">{t("proxy.custom")}</option>
            </Select>
          </label>
          {settings.mode === "custom" && (
            <>
              <label className="block space-y-1 text-xs text-muted-foreground">
                <span>{t("proxy.protocol")}</span>
                <Select
                  value={settings.protocol}
                  onChange={(event) => {
                    const protocol = event.target.value as ProxySettings["protocol"];
                    setSettings({
                      ...settings,
                      protocol,
                      ...(protocol === "socks5" ? { username: "", password: "" } : {}),
                    });
                    setSaved(false);
                    setError(null);
                  }}
                >
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                  <option value="socks5">SOCKS5</option>
                </Select>
              </label>
              <div className="flex gap-3">
                <label className="min-w-0 flex-1 space-y-1 text-xs text-muted-foreground">
                  <span>{t("proxy.host")}</span>
                  <Input
                    required
                    value={settings.host}
                    onChange={(event) => change("host", event.target.value)}
                    placeholder="proxy.example.com"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
                <label className="w-24 space-y-1 text-xs text-muted-foreground">
                  <span>{t("proxy.port")}</span>
                  <Input
                    required
                    type="number"
                    min={1}
                    max={65535}
                    value={settings.port || ""}
                    onChange={(event) => change("port", Number(event.target.value))}
                  />
                </label>
              </div>
              {settings.protocol !== "socks5" ? (
                <div className="flex gap-3">
                  <label className="min-w-0 flex-1 space-y-1 text-xs text-muted-foreground">
                    <span>{t("proxy.username")}</span>
                    <Input
                      value={settings.username}
                      onChange={(event) => change("username", event.target.value)}
                      autoComplete="off"
                    />
                  </label>
                  <label className="min-w-0 flex-1 space-y-1 text-xs text-muted-foreground">
                    <span>{t("proxy.password")}</span>
                    <Input
                      type="password"
                      value={settings.password}
                      onChange={(event) => change("password", event.target.value)}
                      autoComplete="new-password"
                    />
                  </label>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t("proxy.socksAuth")}</p>
              )}
            </>
          )}
          <p className="text-xs text-muted-foreground">{t("proxy.reconnect")}</p>
          <Button type="submit" size="sm">
            {t(busy ? "proxy.saving" : "proxy.save")}
          </Button>
        </fieldset>
      ) : (
        !error && <p className="mt-3 text-xs text-muted-foreground">{t("library.loading")}</p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {t(`proxy.${error}`)}
        </p>
      )}
      {saved && (
        <p role="status" className="mt-3 text-xs text-success">
          {t("proxy.saved")}
        </p>
      )}
    </form>
  );
}
