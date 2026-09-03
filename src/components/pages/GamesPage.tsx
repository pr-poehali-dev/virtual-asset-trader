import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { api, apiErrorMessage, type ApiGame } from "@/api/client";

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

  const m = Math.floor(left / 60);
  const s = left % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── КАРТОЧКА ИГРЫ ────────────────────────────────────────────────────────────

function GameCard({ game, onUpdate }: { game: ApiGame; onUpdate: (g: ApiGame) => void }) {
  const { user } = useAuth();
  const { format } = useCurrency();
  const [betting, setBetting] = useState(false);
  const [error, setError] = useState("");
  const timeLeft = useCountdown(game.expiresAt, game.status === "active");

  const progress = Math.min(100, (game.bank / game.targetBank) * 100);
  const isFinished = game.status !== "active";

  const handleBet = async () => {
    if (!user) { setError("Войдите, чтобы сделать ставку"); return; }
    setBetting(true);
    setError("");
    try {
      const { game: updated } = await api.games.bet(game.id);
      onUpdate(updated);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBetting(false);
    }
  };

  return (
    <div className={`bg-surface border rounded-2xl p-5 sm:p-6 transition-colors ${
      isFinished ? "border-border opacity-80" : "border-gold/20"
    }`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display font-bold text-lg text-foreground">{game.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">Ставка: <span className="text-gold font-semibold">{format(game.betAmount)}</span></span>
          </div>
        </div>
        {game.status === "active" ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/30 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-semibold">Идёт</span>
          </div>
        ) : game.status === "finished" ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/30 shrink-0">
            <Icon name="Trophy" size={11} className="text-gold" />
            <span className="text-[10px] text-gold font-semibold">Завершена</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/10 border border-border shrink-0">
            <span className="text-[10px] text-muted-foreground font-semibold">Отменена</span>
          </div>
        )}
      </div>

      {/* Прогресс банка */}
      <div className="mb-4">
        <div className="flex items-end justify-between mb-1.5">
          <span className="font-display font-bold text-2xl text-foreground">{format(game.bank)}</span>
          <span className="text-xs text-muted-foreground mb-1">из {format(game.targetBank)}</span>
        </div>
        <div className="h-2 rounded-full bg-background overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold/60 to-gold transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
        <span className="flex items-center gap-1.5">
          <Icon name="Users" size={13} />
          {game.participantsCount} {game.participantsCount === 1 ? "участник" : "участников"}
        </span>
        {game.status === "active" ? (
          <span className="flex items-center gap-1.5 font-mono">
            <Icon name="Timer" size={13} />
            {timeLeft}
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <Icon name="Percent" size={13} />
            Победитель получает 90%
          </span>
        )}
      </div>

      {isFinished ? (
        <div className={`rounded-xl p-4 text-center ${game.status === "finished" ? "bg-gold/5 border border-gold/20" : "bg-background/40 border border-border"}`}>
          {game.status === "finished" ? (
            <>
              <Icon name="Trophy" size={20} className="text-gold mx-auto mb-1.5" />
              <p className="text-sm text-foreground">
                Победитель: <span className="font-bold text-gold">{game.winnerName}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Выигрыш {game.winnerAmount ? format(game.winnerAmount) : "—"}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Игра отменена, ставки возвращены</p>
          )}
        </div>
      ) : (
        <>
          <Button
            onClick={handleBet}
            disabled={betting || (user ? user.balance < game.betAmount : false)}
            className="w-full bg-gold text-background hover:bg-gold/90 font-bold"
          >
            {betting ? (
              <Icon name="Loader" size={16} className="animate-spin mr-2" />
            ) : (
              <Icon name="Coins" size={16} className="mr-2" />
            )}
            Поставить {format(game.betAmount)}
          </Button>
          {error && (
            <p className="text-xs text-red-400 mt-2 flex items-center gap-1 justify-center">
              <Icon name="AlertCircle" size={12} />{error}
            </p>
          )}
          {user && user.balance < game.betAmount && !error && (
            <p className="text-xs text-muted-foreground mt-2 text-center">Недостаточно средств на балансе</p>
          )}
        </>
      )}
    </div>
  );
}

// ─── СТРАНИЦА ─────────────────────────────────────────────────────────────────

export function GamesPage() {
  const [games, setGames] = useState<ApiGame[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api.games.list()
      .then(({ games: list }) => setGames(list))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const updateGame = (updated: ApiGame) => {
    setGames((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
  };

  const active = games.filter((g) => g.status === "active");
  const finished = games.filter((g) => g.status !== "active");

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-5">
          <Icon name="Coins" size={32} className="text-gold" />
        </div>
        <h1 className="font-display font-bold text-3xl text-foreground mb-3">Ставки</h1>
        <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Делайте ставки в общий банк. Когда банк достигает цели или истекает время —
          случайно выбирается победитель и получает 90% банка.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Icon name="Loader" size={28} className="text-gold animate-spin" /></div>
      ) : games.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-12 text-center">
          <Icon name="Coins" size={36} className="text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">Игр пока нет. Загляните позже!</p>
        </div>
      ) : (
        <div className="space-y-10">
          {active.length > 0 && (
            <div>
              <h2 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Активные игры
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {active.map((g) => <GameCard key={g.id} game={g} onUpdate={updateGame} />)}
              </div>
            </div>
          )}
          {finished.length > 0 && (
            <div>
              <h2 className="font-display font-semibold text-lg text-foreground mb-4">Завершённые игры</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {finished.map((g) => <GameCard key={g.id} game={g} onUpdate={updateGame} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
