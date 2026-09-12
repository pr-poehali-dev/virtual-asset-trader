import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { api, apiErrorMessage, isApiError, type ApiGiveaway } from "@/api/client";

// ─── ТАЙМЕР ОБРАТНОГО ОТСЧЁТА ─────────────────────────────────────────────────

function useCountdown(expiresAt: string, active: boolean) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!active) return;
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setLeft(Math.max(0, Math.floor(diff / 1000)));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt, active]);

  const days = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  if (days > 0) return `${days}д ${h}ч`;
  return `${h}ч ${m}м`;
}

const REQ_LABELS: Record<string, string> = {
  deposit: "Пополнить баланс",
  sell: "Продать товаров",
};

function GiveawayCard({ giveaway, onUpdate }: { giveaway: ApiGiveaway; onUpdate: () => void }) {
  const { user } = useAuth();
  const { format } = useCurrency();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const timeLeft = useCountdown(giveaway.expiresAt, giveaway.status === "active");
  const isFinished = giveaway.status !== "active";

  const handleJoin = async () => {
    if (!user) { setError("Войдите, чтобы участвовать"); return; }
    setJoining(true);
    setError("");
    try {
      await api.giveaways.join(giveaway.id);
      onUpdate();
    } catch (e) {
      if (isApiError(e) && e.error === "requirement_not_met") {
        const cur = (e as unknown as { current?: number }).current ?? 0;
        setError(`Условие не выполнено: ${format(cur)} из ${format(giveaway.requirementAmount)}`);
      } else if (isApiError(e) && e.error === "already_joined") {
        setError("Вы уже участвуете в этой раздаче");
      } else {
        setError(apiErrorMessage(e));
      }
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className={`bg-surface border rounded-2xl p-5 sm:p-6 transition-colors ${isFinished ? "border-border opacity-80" : "border-gold/20"}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-display font-bold text-lg text-foreground">{giveaway.title}</h3>
          {giveaway.description && (
            <p className="text-xs text-muted-foreground mt-1">{giveaway.description}</p>
          )}
        </div>
        {giveaway.status === "active" ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/30 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-semibold">Идёт</span>
          </div>
        ) : giveaway.status === "finished" ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/30 shrink-0">
            <Icon name="Gift" size={11} className="text-gold" />
            <span className="text-[10px] text-gold font-semibold">Завершена</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/10 border border-border shrink-0">
            <span className="text-[10px] text-muted-foreground font-semibold">Отменена</span>
          </div>
        )}
      </div>

      <div className="bg-background border border-gold/20 rounded-xl p-4 mb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0">
          <Icon name="Gift" size={18} className="text-gold" />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Приз</p>
          <p className="text-sm font-semibold text-foreground">{giveaway.prizeDescription}</p>
          {giveaway.prizeAmount ? (
            <p className="text-xs text-gold font-bold mt-0.5">{format(giveaway.prizeAmount)}</p>
          ) : null}
        </div>
      </div>

      <div className="bg-background/50 border border-border rounded-xl p-3 mb-4 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5 mb-1">
          <Icon name="ListChecks" size={13} className="text-gold" />
          Условие: {REQ_LABELS[giveaway.requirementType]} на {format(giveaway.requirementAmount)} за последние {giveaway.requirementDays} дн.
        </p>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4 flex-wrap gap-1">
        <span className="flex items-center gap-1.5">
          <Icon name="Users" size={13} />
          {giveaway.participantsCount} участников
        </span>
        <span className="flex items-center gap-1.5">
          <Icon name="Trophy" size={13} />
          {giveaway.winnersCount > 1 ? `${giveaway.winnersCount} победителей` : "1 победитель"}
        </span>
        {giveaway.status === "active" && (
          <span className="flex items-center gap-1.5 font-mono">
            <Icon name="Timer" size={13} />
            {timeLeft}
          </span>
        )}
      </div>

      {isFinished ? (
        <div className={`rounded-xl p-4 ${giveaway.status === "finished" ? "bg-gold/5 border border-gold/20" : "bg-background/40 border border-border"}`}>
          {giveaway.status === "finished" ? (
            giveaway.winners && giveaway.winners.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Icon name="Trophy" size={18} className="text-gold" />
                  <span className="text-xs font-semibold text-gold">
                    {giveaway.winners.length > 1 ? `Победители (${giveaway.winners.length})` : "Победитель"}
                  </span>
                </div>
                {giveaway.winners.map((w) => (
                  <div key={w.userId} className="flex items-center justify-center text-sm bg-background/50 rounded-lg px-3 py-1.5">
                    <span className="text-foreground font-medium">{w.username}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center">Победители объявлены</p>
            )
          ) : (
            <p className="text-sm text-muted-foreground text-center">Раздача отменена — не набралось участников</p>
          )}
        </div>
      ) : giveaway.joined ? (
        <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl p-3 text-center text-sm text-emerald-400 flex items-center justify-center gap-2">
          <Icon name="CheckCircle" size={15} />Вы участвуете
        </div>
      ) : (
        <>
          <Button
            className="w-full bg-gold text-background hover:bg-gold/90 font-bold"
            disabled={joining}
            onClick={handleJoin}
          >
            {joining ? <Icon name="Loader" size={15} className="animate-spin mr-2" /> : <Icon name="Gift" size={15} className="mr-2" />}
            Принять участие
          </Button>
          {error && (
            <p className="text-xs text-red-400 mt-2 flex items-center gap-1 justify-center">
              <Icon name="AlertCircle" size={12} />{error}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function GiveawaysPage() {
  const [giveaways, setGiveaways] = useState<ApiGiveaway[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = showHistory ? await api.giveaways.history() : await api.giveaways.list();
      setGiveaways(res.giveaways);
    } catch { /* ignore */ }
    setLoading(false);
  }, [showHistory]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-foreground flex items-center gap-2">
          <Icon name="Gift" size={26} className="text-gold" />
          Раздачи
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline" size="sm"
            className={`border-border text-xs ${!showHistory ? "text-gold border-gold/30" : "text-muted-foreground"}`}
            onClick={() => setShowHistory(false)}
          >
            Активные
          </Button>
          <Button
            variant="outline" size="sm"
            className={`border-border text-xs ${showHistory ? "text-gold border-gold/30" : "text-muted-foreground"}`}
            onClick={() => setShowHistory(true)}
          >
            История
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground text-sm mb-8">
        Выполните условие и получите шанс выиграть приз от Gorant Shop
      </p>

      {loading ? (
        <div className="flex justify-center py-20"><Icon name="Loader" size={28} className="text-gold animate-spin" /></div>
      ) : giveaways.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-14 text-center text-muted-foreground">
          <Icon name="Gift" size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">{showHistory ? "Завершённых раздач пока нет" : "Активных раздач пока нет"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {giveaways.map((g) => (
            <GiveawayCard key={g.id} giveaway={g} onUpdate={load} />
          ))}
        </div>
      )}
    </div>
  );
}
