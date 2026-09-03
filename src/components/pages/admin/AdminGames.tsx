import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, apiErrorMessage, type ApiGame } from "@/api/client";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active: { label: "Идёт", className: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  finished: { label: "Завершена", className: "text-gold bg-gold/10 border-gold/20" },
  cancelled: { label: "Отменена", className: "text-muted-foreground bg-muted/10 border-border" },
};

export function AdminGamesTab() {
  const [games, setGames] = useState<ApiGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [title, setTitle] = useState("");
  const [betAmount, setBetAmount] = useState("100");
  const [targetBank, setTargetBank] = useState("1000");
  const [durationMinutes, setDurationMinutes] = useState("10");
  const [winnersCount, setWinnersCount] = useState("1");
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    api.games.list()
      .then(({ games: list }) => setGames(list))
      .catch((e) => setActionError(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    const bet = Number(betAmount);
    const target = Number(targetBank);
    const minutes = Number(durationMinutes);
    const winners = Number(winnersCount);
    if (!bet || bet <= 0 || !target || target <= 0 || !minutes || minutes <= 0 || !winners || winners <= 0) {
      setError("Заполните все поля корректными положительными числами");
      return;
    }
    if (target < bet) {
      setError("Целевой банк не может быть меньше суммы ставки");
      return;
    }
    if (winners > 20) {
      setError("Максимум 20 победителей");
      return;
    }
    setCreating(true);
    setError("");
    try {
      await api.games.create({
        title: title.trim() || undefined,
        bet_amount: bet,
        target_bank: target,
        duration_seconds: Math.round(minutes * 60),
        winners_count: winners,
      });
      setTitle(""); setBetAmount("100"); setTargetBank("1000"); setDurationMinutes("10"); setWinnersCount("1");
      setShowForm(false);
      load();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = async (id: string) => {
    setActionError("");
    try {
      await api.games.cancel(id);
      load();
    } catch (e) {
      setActionError(apiErrorMessage(e));
    }
  };

  const handleFinishNow = async (id: string) => {
    setActionError("");
    try {
      await api.games.finishNow(id);
      load();
    } catch (e) {
      setActionError(apiErrorMessage(e));
    }
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display font-semibold text-base text-foreground">Игры со ставками</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-border text-xs" onClick={load} disabled={loading}>
            <Icon name={loading ? "Loader" : "RefreshCw"} size={13} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />Обновить
          </Button>
          <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-bold" onClick={() => setShowForm((v) => !v)}>
            <Icon name={showForm ? "X" : "Plus"} size={13} className="mr-1.5" />{showForm ? "Отмена" : "Создать игру"}
          </Button>
        </div>
      </div>

      {actionError && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5 text-xs text-red-400 flex items-center gap-2">
          <Icon name="AlertCircle" size={13} />{actionError}
        </div>
      )}

      {showForm && (
        <div className="bg-surface border border-gold/20 rounded-xl p-5 space-y-3">
          <h3 className="font-display font-semibold text-sm text-foreground">Новая игра</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Название (необязательно)</label>
              <Input placeholder="Игра на удачу" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-background border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Сумма ставки, ₽</label>
              <Input type="number" min={1} value={betAmount} onChange={(e) => setBetAmount(e.target.value)} className="bg-background border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Целевой банк, ₽</label>
              <Input type="number" min={1} value={targetBank} onChange={(e) => setTargetBank(e.target.value)} className="bg-background border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Время до розыгрыша, мин</label>
              <Input type="number" min={1} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} className="bg-background border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Количество победителей</label>
              <Input type="number" min={1} max={20} value={winnersCount} onChange={(e) => setWinnersCount(e.target.value)} className="bg-background border-border text-sm" />
            </div>
          </div>
          <div className="bg-background/50 border border-border rounded-lg p-3 text-xs text-muted-foreground flex items-start gap-2">
            <Icon name="Info" size={13} className="text-gold shrink-0 mt-0.5" />
            Победители выбираются случайно (шанс пропорционален сумме ставок), 90% банка делится поровну между ними. Игра завершится по достижении целевого банка, по истечении времени или досрочно администратором.
          </div>
          {error && <p className="text-xs text-red-400 flex items-center gap-1"><Icon name="AlertCircle" size={12} />{error}</p>}
          <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-bold" onClick={handleCreate} disabled={creating}>
            {creating && <Icon name="Loader" size={13} className="animate-spin mr-1.5" />}Создать
          </Button>
        </div>
      )}

      {loading && games.length === 0 ? (
        <div className="flex justify-center py-10"><Icon name="Loader" size={22} className="text-gold animate-spin" /></div>
      ) : games.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted-foreground">
          <Icon name="Coins" size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Игр пока нет</p>
        </div>
      ) : (
        <div className="space-y-2">
          {games.map((g) => {
            const st = STATUS_MAP[g.status] ?? STATUS_MAP.active;
            return (
              <div key={g.id} className="flex items-center gap-3 p-4 border border-border rounded-xl bg-surface flex-wrap">
                <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                  <Icon name="Coins" size={16} className="text-gold" />
                </div>
                <div className="flex-1 min-w-[180px]">
                  <div className="font-semibold text-sm text-foreground">{g.title}</div>
                  <div className="text-xs text-muted-foreground">
                    Ставка ₽{g.betAmount.toLocaleString("ru-RU")} · Банк ₽{g.bank.toLocaleString("ru-RU")} / ₽{g.targetBank.toLocaleString("ru-RU")} · {g.participantsCount} уч. · {g.winnersCount} побед.
                  </div>
                  {g.creatorName && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">Создал: {g.creatorName} ({g.creatorRole === "owner" ? "владелец" : g.creatorRole === "admin" ? "админ" : g.creatorRole})</div>
                  )}
                  {g.status === "finished" && g.winners && g.winners.length > 0 && (
                    <div className="text-[10px] text-gold mt-0.5 space-y-0.5">
                      {g.winners.map((w) => (
                        <div key={w.userId}>
                          Победитель: {w.username} (билет №{w.ticketNo}) — ₽{w.amount.toLocaleString("ru-RU")}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${st.className}`}>
                    {st.label}
                  </span>
                  {g.status === "active" && (
                    <>
                      <button onClick={() => handleFinishNow(g.id)} title="Завершить досрочно и разыграть банк" className="w-7 h-7 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center text-gold hover:bg-gold/20 transition-colors">
                        <Icon name="Flag" size={12} />
                      </button>
                      <button onClick={() => handleCancel(g.id)} title="Отменить игру и вернуть ставки" className="w-7 h-7 rounded-lg bg-red-400/10 border border-red-400/20 flex items-center justify-center text-red-400 hover:bg-red-400/20 transition-colors">
                        <Icon name="X" size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}