import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { api, apiErrorMessage, type ApiSecurityLogItem, type ApiBlockedIp } from "@/api/client";

const EVENT_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  withdraw_code_requested: { label: "Запрос кода на вывод", icon: "Mail", color: "text-blue-400" },
  withdraw_confirmed: { label: "Вывод подтверждён", icon: "CheckCircle", color: "text-emerald-400" },
  big_spend_code_requested: { label: "Запрос кода на крупную покупку", icon: "Mail", color: "text-blue-400" },
  big_spend_confirmed: { label: "Крупная покупка подтверждена", icon: "CheckCircle", color: "text-emerald-400" },
  buy: { label: "Покупка товара", icon: "ShoppingCart", color: "text-muted-foreground" },
};

export function AdminSecurityTab() {
  const [tab, setTab] = useState<"log" | "ips">("log");
  const [log, setLog] = useState<ApiSecurityLogItem[]>([]);
  const [ips, setIps] = useState<ApiBlockedIp[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([api.security.adminLog(), api.security.adminBlockedIps()])
      .then(([logRes, ipRes]) => {
        setLog(logRes.log);
        setIps(ipRes.blockedIps);
        setActiveCount(ipRes.activeCount);
      })
      .catch((e) => setError(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const unblock = async (ip: string) => {
    try {
      await api.security.adminUnblockIp(ip);
      setIps((prev) => prev.filter((i) => i.ip !== ip));
      setActiveCount((c) => Math.max(0, c - 1));
    } catch (e) { setError(apiErrorMessage(e)); }
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display font-semibold text-base text-foreground flex items-center gap-2">
          Безопасность
          {activeCount > 0 && (
            <span className="text-xs bg-red-400/10 text-red-400 border border-red-400/20 px-2 py-0.5 rounded-full">
              {activeCount} IP заблокировано
            </span>
          )}
        </h2>
        <Button variant="outline" size="sm" className="border-border text-xs" onClick={load} disabled={loading}>
          <Icon name={loading ? "Loader" : "RefreshCw"} size={13} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />Обновить
        </Button>
      </div>

      {error && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5 text-xs text-red-400 flex items-center gap-2">
          <Icon name="AlertCircle" size={13} />{error}
        </div>
      )}

      <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg w-fit">
        <button onClick={() => setTab("log")}
          className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${tab === "log" ? "bg-gold text-background" : "text-muted-foreground hover:text-foreground"}`}>
          Журнал действий
        </button>
        <button onClick={() => setTab("ips")}
          className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${tab === "ips" ? "bg-gold text-background" : "text-muted-foreground hover:text-foreground"}`}>
          Заблокированные IP
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Icon name="Loader" size={22} className="text-gold animate-spin" /></div>
      ) : tab === "log" ? (
        log.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted-foreground">
            <Icon name="ShieldCheck" size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Событий пока нет</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {log.map((item) => {
              const cfg = EVENT_LABELS[item.eventType] ?? { label: item.eventType, icon: "Activity", color: "text-muted-foreground" };
              return (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-surface border border-border rounded-lg">
                  <Icon name={cfg.icon} size={14} className={`shrink-0 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground">{cfg.label}</div>
                    <div className="text-[10px] text-muted-foreground">{item.username} · {item.ip ?? "—"}</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground shrink-0">{item.time}</div>
                </div>
              );
            })}
          </div>
        )
      ) : ips.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted-foreground">
          <Icon name="ShieldCheck" size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Заблокированных IP нет — DDoS-защита не сработала</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ips.map((item) => (
            <div key={item.ip} className="flex items-center gap-3 p-4 bg-red-400/5 border border-red-400/20 rounded-xl">
              <Icon name="ShieldOff" size={16} className="text-red-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm font-semibold text-foreground">{item.ip}</div>
                <div className="text-[11px] text-muted-foreground">{item.reason}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Заблокирован до {new Date(item.blockedUntil).toLocaleString("ru-RU")}
                </div>
              </div>
              <button
                onClick={() => unblock(item.ip)}
                className="text-xs px-3 py-1.5 rounded-lg bg-background border border-border hover:border-gold/40 text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                Разблокировать
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
