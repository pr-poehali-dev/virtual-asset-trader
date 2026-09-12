import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, apiErrorMessage, type ApiGiveaway } from "@/api/client";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active: { label: "Идёт", className: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  finished: { label: "Завершена", className: "text-gold bg-gold/10 border-gold/20" },
  cancelled: { label: "Отменена", className: "text-muted-foreground bg-muted/10 border-border" },
};

export function AdminGiveawaysTab() {
  const [giveaways, setGiveaways] = useState<ApiGiveaway[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [sectionEnabled, setSectionEnabled] = useState(true);
  const [togglingSection, setTogglingSection] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prizeDescription, setPrizeDescription] = useState("");
  const [prizeAmount, setPrizeAmount] = useState("");
  const [requirementType, setRequirementType] = useState<"deposit" | "sell">("deposit");
  const [requirementAmount, setRequirementAmount] = useState("1000");
  const [requirementDays, setRequirementDays] = useState("7");
  const [durationDays, setDurationDays] = useState("7");
  const [winnersCount, setWinnersCount] = useState("1");
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    api.giveaways.adminList()
      .then(({ giveaways: list }) => setGiveaways(list))
      .catch((e) => setActionError(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  const loadSectionStatus = () => {
    api.finance.giveawaysStatus()
      .then(({ giveawaysEnabled }) => setSectionEnabled(giveawaysEnabled))
      .catch(() => {});
  };

  useEffect(() => { load(); loadSectionStatus(); }, []);

  const toggleSection = async () => {
    setTogglingSection(true);
    try {
      const { giveawaysEnabled } = await api.finance.setGiveawaysStatus(!sectionEnabled);
      setSectionEnabled(giveawaysEnabled);
    } catch (e) {
      setActionError(apiErrorMessage(e));
    } finally {
      setTogglingSection(false);
    }
  };

  const handleCreate = async () => {
    const reqAmount = Number(requirementAmount);
    const reqDays = Number(requirementDays);
    const durDays = Number(durationDays);
    const winners = Number(winnersCount);
    if (!title.trim() || !prizeDescription.trim()) {
      setError("Заполните название и описание приза");
      return;
    }
    if (!reqAmount || reqAmount <= 0 || !reqDays || reqDays <= 0 || !durDays || durDays <= 0 || !winners || winners <= 0) {
      setError("Заполните все числовые поля положительными значениями");
      return;
    }
    if (winners > 50) {
      setError("Максимум 50 победителей");
      return;
    }
    setCreating(true);
    setError("");
    try {
      await api.giveaways.create({
        title: title.trim(),
        description: description.trim() || undefined,
        prize_description: prizeDescription.trim(),
        prize_amount: prizeAmount ? Number(prizeAmount) : undefined,
        requirement_type: requirementType,
        requirement_amount: reqAmount,
        requirement_days: reqDays,
        duration_days: durDays,
        winners_count: winners,
      });
      setTitle(""); setDescription(""); setPrizeDescription(""); setPrizeAmount("");
      setRequirementAmount("1000"); setRequirementDays("7"); setDurationDays("7"); setWinnersCount("1");
      setShowForm(false);
      load();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const handleToggleVisibility = async (id: string) => {
    setActionError("");
    try {
      await api.giveaways.toggleVisibility(id);
      load();
    } catch (e) {
      setActionError(apiErrorMessage(e));
    }
  };

  const handleCancel = async (id: string) => {
    setActionError("");
    try {
      await api.giveaways.cancel(id);
      load();
    } catch (e) {
      setActionError(apiErrorMessage(e));
    }
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display font-semibold text-base text-foreground">Раздачи</h2>
        <div className="flex gap-2">
          <Button
            variant="outline" size="sm"
            className={`text-xs ${sectionEnabled ? "border-emerald-400/30 text-emerald-400" : "border-border text-muted-foreground"}`}
            onClick={toggleSection}
            disabled={togglingSection}
          >
            <Icon name={sectionEnabled ? "Eye" : "EyeOff"} size={13} className="mr-1.5" />
            {sectionEnabled ? "Раздел виден пользователям" : "Раздел скрыт"}
          </Button>
          <Button variant="outline" size="sm" className="border-border text-xs" onClick={load} disabled={loading}>
            <Icon name={loading ? "Loader" : "RefreshCw"} size={13} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />Обновить
          </Button>
          <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-bold" onClick={() => setShowForm((v) => !v)}>
            <Icon name={showForm ? "X" : "Plus"} size={13} className="mr-1.5" />{showForm ? "Отмена" : "Создать раздачу"}
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
          <h3 className="font-display font-semibold text-sm text-foreground">Новая раздача</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Название</label>
              <Input placeholder="Розыгрыш к празднику" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-background border-border text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Описание (необязательно)</label>
              <Input placeholder="Короткое описание условий" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-background border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Описание приза</label>
              <Input placeholder="Например: ₽5000 на баланс" value={prizeDescription} onChange={(e) => setPrizeDescription(e.target.value)} className="bg-background border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Сумма приза, ₽ (если денежный, необязательно)</label>
              <Input type="number" min={0} placeholder="5000" value={prizeAmount} onChange={(e) => setPrizeAmount(e.target.value)} className="bg-background border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Условие участия</label>
              <select
                value={requirementType}
                onChange={(e) => setRequirementType(e.target.value as "deposit" | "sell")}
                className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm text-foreground"
              >
                <option value="deposit">Пополнить баланс на сумму</option>
                <option value="sell">Продать товаров на сумму</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Сумма условия, ₽</label>
              <Input type="number" min={1} value={requirementAmount} onChange={(e) => setRequirementAmount(e.target.value)} className="bg-background border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">За сколько последних дней должно быть выполнено</label>
              <Input type="number" min={1} value={requirementDays} onChange={(e) => setRequirementDays(e.target.value)} className="bg-background border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Длительность раздачи, дней</label>
              <Input type="number" min={1} value={durationDays} onChange={(e) => setDurationDays(e.target.value)} className="bg-background border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Количество победителей</label>
              <Input type="number" min={1} max={50} value={winnersCount} onChange={(e) => setWinnersCount(e.target.value)} className="bg-background border-border text-sm" />
            </div>
          </div>
          <div className="bg-background/50 border border-border rounded-lg p-3 text-xs text-muted-foreground flex items-start gap-2">
            <Icon name="Info" size={13} className="text-gold shrink-0 mt-0.5" />
            Участвовать смогут только пользователи, выполнившие условие за указанный период. По истечении срока раздачи среди участников случайно выбираются победители.
          </div>
          {error && <p className="text-xs text-red-400 flex items-center gap-1"><Icon name="AlertCircle" size={12} />{error}</p>}
          <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-bold" onClick={handleCreate} disabled={creating}>
            {creating && <Icon name="Loader" size={13} className="animate-spin mr-1.5" />}Создать
          </Button>
        </div>
      )}

      {loading && giveaways.length === 0 ? (
        <div className="flex justify-center py-10"><Icon name="Loader" size={22} className="text-gold animate-spin" /></div>
      ) : giveaways.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted-foreground">
          <Icon name="Gift" size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Раздач пока нет</p>
        </div>
      ) : (
        <div className="space-y-2">
          {giveaways.map((g) => {
            const st = STATUS_MAP[g.status] ?? STATUS_MAP.active;
            return (
              <div key={g.id} className="flex items-center gap-3 p-4 border border-border rounded-xl bg-surface flex-wrap">
                <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                  <Icon name="Gift" size={16} className="text-gold" />
                </div>
                <div className="flex-1 min-w-[220px]">
                  <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                    {g.title}
                    {!g.visible && (
                      <span className="text-[9px] text-muted-foreground bg-muted/10 border border-border px-1.5 py-0.5 rounded">скрыта</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Приз: {g.prizeDescription} · {g.requirementType === "deposit" ? "Пополнение" : "Продажа"} ₽{g.requirementAmount.toLocaleString("ru-RU")} за {g.requirementDays} дн. · {g.participantsCount} уч. · {g.winnersCount} побед.
                  </div>
                  {g.creatorName && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">Создал: {g.creatorName}</div>
                  )}
                  {g.status === "finished" && g.winners && g.winners.length > 0 && (
                    <div className="text-[10px] text-gold mt-0.5 space-y-0.5">
                      {g.winners.map((w) => (
                        <div key={w.userId}>Победитель: {w.username}</div>
                      ))}
                    </div>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold shrink-0 ${st.className}`}>{st.label}</span>
                {g.status === "active" && (
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => handleToggleVisibility(g.id)}
                      className="text-xs px-2 py-1 rounded-lg bg-background border border-border text-muted-foreground hover:text-foreground"
                      title={g.visible ? "Скрыть от пользователей" : "Показать пользователям"}
                    >
                      <Icon name={g.visible ? "EyeOff" : "Eye"} size={12} />
                    </button>
                    <button
                      onClick={() => handleCancel(g.id)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20 font-semibold"
                    >
                      Отменить
                    </button>
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
