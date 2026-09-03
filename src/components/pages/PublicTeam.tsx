import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { api, type ApiTeamMember } from "@/api/client";
import { AdminBadge, AdminAvatar } from "@/components/ui/admin-badge";

function roleLabel(role: string, isOwner: boolean) {
  if (isOwner) return "Владелец";
  if (role === "admin") return "Администратор";
  if (role === "staff") return "Сотрудник поддержки";
  return "Пользователь";
}

// ─── ПУБЛИЧНЫЙ СПИСОК КОМАНДЫ (для главной страницы) ──────────────────────────

export function PublicTeamSection() {
  const [team, setTeam] = useState<ApiTeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      api.auth.team()
        .then(({ team: list }) => setTeam(list))
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  if (!loading && team.length === 0) return null;

  const onlineCount = team.filter((m) => m.online).length;

  return (
    <section className="py-14 sm:py-24 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-3 flex items-center justify-center gap-3 flex-wrap">
            Команда Gorant Shop
            {onlineCount > 0 && (
              <span className="text-xs font-medium bg-emerald-400/10 text-emerald-400 border border-emerald-400/30 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {onlineCount} онлайн
              </span>
            )}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Администраторы и сотрудники поддержки, которые следят за безопасностью платформы
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Icon name="Loader" size={24} className="text-gold animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {team.map((m) => (
              <div key={m.id} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
                <div className="relative shrink-0">
                  <AdminAvatar size={44} />
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-surface ${m.online ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm text-foreground truncate">{m.username}</div>
                  <div className="mt-0.5">
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
                    {m.online ? "Онлайн" : "Офлайн"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
