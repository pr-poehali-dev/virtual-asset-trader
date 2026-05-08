import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { api, type ApiMonitorEvent } from "@/api/client";

const SEVERITY_CONFIG = {
  critical: { label: "Критическая", color: "text-red-400", bg: "bg-red-400/10 border-red-400/30", dot: "bg-red-400" },
  error:    { label: "Ошибка",      color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/30", dot: "bg-orange-400" },
  warning:  { label: "Предупреждение", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/30", dot: "bg-amber-400" },
  info:     { label: "Информация",  color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/30", dot: "bg-blue-400" },
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  js_error:          "JS ошибка",
  promise_rejection: "Promise rejection",
  api_error:         "API ошибка",
  session_lost:      "Сессия потеряна",
  custom:            "Пользовательское",
  frontend_error:    "Фронтенд ошибка",
};

function timeAgo(isoStr: string) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.floor(h / 24)} д назад`;
}

export function AdminMonitorTab() {
  const [events, setEvents] = useState<ApiMonitorEvent[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [resolving, setResolving] = useState<number | null>(null);
  const [resolvingAll, setResolvingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.monitor.list(!showAll);
      setEvents(res.events);
      setOpenCount(res.open_count);
      setCriticalCount(res.critical_count);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [showAll]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const handleResolve = async (id: number) => {
    setResolving(id);
    try {
      await api.monitor.resolve(id);
      await load();
    } catch { /* ignore */ }
    setResolving(null);
  };

  const handleResolveAll = async () => {
    setResolvingAll(true);
    try {
      await api.monitor.resolveAll();
      await load();
    } catch { /* ignore */ }
    setResolvingAll(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Сводка */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Открытых ошибок</p>
          <p className={`text-2xl font-bold ${openCount > 0 ? "text-orange-400" : "text-foreground"}`}>{openCount}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Критических</p>
          <p className={`text-2xl font-bold ${criticalCount > 0 ? "text-red-400" : "text-foreground"}`}>{criticalCount}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Всего событий</p>
          <p className="text-2xl font-bold text-foreground">{events.length}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 flex flex-col justify-between">
          <p className="text-xs text-muted-foreground mb-1">Статус</p>
          <div className={`flex items-center gap-2 text-sm font-semibold ${openCount === 0 ? "text-green-400" : "text-orange-400"}`}>
            <span className={`w-2 h-2 rounded-full ${openCount === 0 ? "bg-green-400" : "bg-orange-400 animate-pulse"}`} />
            {openCount === 0 ? "Всё в порядке" : "Есть проблемы"}
          </div>
        </div>
      </div>

      {/* Панель управления */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAll(!showAll)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              showAll
                ? "bg-gold/10 text-gold border-gold/30"
                : "text-muted-foreground border-border hover:border-gold/30"
            }`}
          >
            {showAll ? "Только открытые" : "Показать все"}
          </button>
          <button
            onClick={load}
            className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <Icon name="RefreshCw" size={12} />
            Обновить
          </button>
        </div>
        {openCount > 0 && (
          <Button
            size="sm"
            onClick={handleResolveAll}
            disabled={resolvingAll}
            className="bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 text-xs"
          >
            {resolvingAll
              ? <Icon name="Loader" size={12} className="animate-spin mr-1" />
              : <Icon name="CheckCheck" size={12} className="mr-1" />}
            Закрыть все
          </Button>
        )}
      </div>

      {/* Список событий */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground">
          <Icon name="Loader" size={24} className="animate-spin mx-auto mb-3" />
          <p className="text-sm">Загрузка событий...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="w-12 h-12 rounded-xl bg-green-400/10 border border-green-400/30 flex items-center justify-center mx-auto mb-4">
            <Icon name="ShieldCheck" size={24} className="text-green-400" />
          </div>
          <p className="font-semibold text-foreground mb-1">Ошибок не обнаружено</p>
          <p className="text-sm">Система работает в штатном режиме</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => {
            const cfg = SEVERITY_CONFIG[ev.severity] ?? SEVERITY_CONFIG.info;
            const isOpen = expanded === ev.id;
            return (
              <div
                key={ev.id}
                className={`border rounded-xl overflow-hidden transition-all ${cfg.bg} ${ev.resolved ? "opacity-50" : ""}`}
              >
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : ev.id)}
                >
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot} ${!ev.resolved ? "animate-pulse" : ""}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-xs text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded">
                        {EVENT_TYPE_LABELS[ev.event_type] ?? ev.event_type}
                      </span>
                      {ev.resolved && (
                        <span className="text-xs text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">Закрыто</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(ev.created_at)}</p>
                  </div>
                  <Icon name={isOpen ? "ChevronUp" : "ChevronDown"} size={16} className="text-muted-foreground shrink-0 mt-1" />
                </div>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
                    {ev.description && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Описание</p>
                        <pre className="text-xs text-foreground bg-background/60 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
                          {ev.description}
                        </pre>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {ev.url && (
                        <div>
                          <p className="text-muted-foreground mb-0.5">URL</p>
                          <p className="text-foreground break-all">{ev.url}</p>
                        </div>
                      )}
                      {ev.status_code && (
                        <div>
                          <p className="text-muted-foreground mb-0.5">HTTP статус</p>
                          <p className="text-foreground">{ev.status_code}</p>
                        </div>
                      )}
                      {ev.user_id && (
                        <div>
                          <p className="text-muted-foreground mb-0.5">Пользователь</p>
                          <p className="text-foreground font-mono">{ev.user_id}</p>
                        </div>
                      )}
                      {ev.ip && (
                        <div>
                          <p className="text-muted-foreground mb-0.5">IP</p>
                          <p className="text-foreground">{ev.ip}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground mb-0.5">Время</p>
                        <p className="text-foreground">{new Date(ev.created_at).toLocaleString("ru-RU")}</p>
                      </div>
                    </div>

                    {!ev.resolved && (
                      <Button
                        size="sm"
                        onClick={() => handleResolve(ev.id)}
                        disabled={resolving === ev.id}
                        className="bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 text-xs w-full"
                      >
                        {resolving === ev.id
                          ? <Icon name="Loader" size={12} className="animate-spin mr-2" />
                          : <Icon name="Check" size={12} className="mr-2" />}
                        Отметить как решённое
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
