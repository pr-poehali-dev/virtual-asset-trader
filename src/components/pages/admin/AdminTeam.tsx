import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { AdminBadge, AdminAvatar } from "@/components/ui/admin-badge";
import { api, type ApiTeamMember } from "@/api/client";

type TeamMember = ApiTeamMember;

function timeAgo(iso: string | null) {
  if (!iso) return "никогда";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.floor(h / 24)} д назад`;
}

function roleLabel(role: string, isOwner: boolean) {
  if (isOwner) return "Владелец";
  if (role === "admin") return "Администратор";
  if (role === "staff") return "Сотрудник";
  return "Пользователь";
}

export function AdminTeamTab() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    api.auth.team()
      .then(({ team: list }) => setTeam(list))
      .catch(() => setError("Не удалось загрузить команду"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const onlineCount = team.filter((m) => m.online).length;

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display font-semibold text-base text-foreground flex items-center gap-2">
          Команда сайта
          <span className="text-xs bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 px-2 py-0.5 rounded-full">
            {onlineCount} онлайн
          </span>
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

      {loading && team.length === 0 ? (
        <div className="flex justify-center py-10"><Icon name="Loader" size={22} className="text-gold animate-spin" /></div>
      ) : team.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted-foreground">
          <Icon name="Users" size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">В команде пока никого нет</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {team.map((m) => (
            <div key={m.id} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
              <div className="relative shrink-0">
                <AdminAvatar size={40} />
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface ${m.online ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm text-foreground truncate">{m.username}</div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {m.isOwner || m.role === "admin" ? (
                    <AdminBadge size="xs" />
                  ) : (
                    <span className="text-[9px] text-blue-400/80 font-bold bg-blue-400/15 px-1.5 py-0.5 rounded border border-blue-400/20">
                      {roleLabel(m.role, m.isOwner)}
                    </span>
                  )}
                </div>
                <div className={`text-[10px] mt-1 flex items-center gap-1 ${m.online ? "text-emerald-400" : "text-muted-foreground"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${m.online ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/40"}`} />
                  {m.online ? "Онлайн" : `Был(а) ${timeAgo(m.lastSeen)}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}