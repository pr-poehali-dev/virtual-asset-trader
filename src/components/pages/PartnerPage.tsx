import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, apiErrorMessage, type ApiPartnerStatus, type ApiPartnerPlatform } from "@/api/client";
import { useAuth } from "@/context/AuthContext";

const PLATFORMS = ["Twitch", "YouTube", "TikTok", "VK Play", "Kick", "Другое"];
const MIN_SUBSCRIBERS = 2000;
const MIN_VIEWS = 1000;

// ─── СТРАНИЦА ПАРТНЁРА (активный партнёр) ─────────────────────────────────────

function ActivePartnerView({ status }: { status: ApiPartnerStatus }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(status.refUrl ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Статус партнёра */}
      <div className="bg-gradient-to-br from-gold/10 to-gold/5 border border-gold/30 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center">
            <Icon name="Star" size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">Вы — партнёр Gorant Shop</h2>
            <p className="text-xs text-muted-foreground">Отчисление {status.commissionPct}% от каждой продажи реферала</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          {[
            { label: "Заработано", value: `₽ ${(status.totalEarned ?? 0).toLocaleString("ru-RU")}`, icon: "Banknote", color: "text-gold" },
            { label: "Рефералов", value: String(status.totalReferrals ?? 0), icon: "Users", color: "text-purple-400" },
            { label: "Комиссия", value: `${status.commissionPct}%`, icon: "Percent", color: "text-emerald-400" },
          ].map((s) => (
            <div key={s.label} className="bg-background/60 rounded-xl p-3 border border-border">
              <Icon name={s.icon} size={16} className={`${s.color} mb-1`} />
              <div className={`font-display font-bold text-xl ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Реферальная ссылка */}
        <div>
          <p className="text-xs text-muted-foreground font-semibold mb-2">Ваша реферальная ссылка</p>
          <div className="flex gap-2">
            <div className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground truncate">
              {status.refUrl}
            </div>
            <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-bold shrink-0" onClick={copy}>
              <Icon name={copied ? "Check" : "Copy"} size={14} className="mr-1.5" />
              {copied ? "Скопировано" : "Копировать"}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Поделитесь ссылкой в своих трансляциях. Каждый зарегистрировавшийся принесёт вам {status.commissionPct}% от его покупок.
          </p>
        </div>
      </div>

      {/* Платформы */}
      {status.platforms && status.platforms.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="font-display font-semibold text-sm text-foreground mb-4">Ваши платформы</h3>
          <div className="space-y-2">
            {status.platforms.map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-background border border-border rounded-lg">
                <Icon name="Play" size={14} className="text-gold shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground">{p.platform}</div>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs text-gold hover:underline truncate block">{p.url}</a>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-foreground font-semibold">{p.subscribers.toLocaleString()} подп.</div>
                  <div className="text-[10px] text-muted-foreground">~{p.avg_views.toLocaleString()} просм.</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl p-4 text-xs text-muted-foreground flex items-start gap-2">
        <Icon name="Info" size={13} className="text-gold shrink-0 mt-0.5" />
        Средства начисляются автоматически после каждой успешной продажи реферала. Вывод — через раздел «Выводы».
      </div>
    </div>
  );
}

// ─── ФОРМА ЗАЯВКИ ─────────────────────────────────────────────────────────────

function ApplicationForm({ onSubmit }: { onSubmit: () => void }) {
  const [platforms, setPlatforms] = useState<ApiPartnerPlatform[]>([
    { platform: "Twitch", url: "", subscribers: 0, avg_views: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addPlatform = () => {
    setPlatforms((prev) => [...prev, { platform: "YouTube", url: "", subscribers: 0, avg_views: 0 }]);
  };

  const removePlatform = (i: number) => {
    setPlatforms((prev) => prev.filter((_, idx) => idx !== i));
  };

  const update = (i: number, field: keyof ApiPartnerPlatform, value: string | number) => {
    setPlatforms((prev) => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  };

  const handleSubmit = async () => {
    setError("");
    const valid = platforms.every((p) => p.url.trim() && p.subscribers > 0 && p.avg_views > 0);
    if (!valid) { setError("Заполните все поля для каждой платформы"); return; }
    const meetsReq = platforms.some((p) => p.subscribers >= MIN_SUBSCRIBERS && p.avg_views >= MIN_VIEWS);
    if (!meetsReq) {
      setError(`Минимальные требования: от ${MIN_SUBSCRIBERS.toLocaleString()} подписчиков и ${MIN_VIEWS.toLocaleString()} средних просмотров хотя бы на одной платформе`);
      return;
    }
    setLoading(true);
    try {
      await api.partner.apply(platforms);
      onSubmit();
    } catch (e) {
      const msg = apiErrorMessage(e);
      setError(msg === "Ошибка requirements_not_met" || msg.includes("requirements")
        ? `Минимальные требования: ${MIN_SUBSCRIBERS.toLocaleString()} подп. и ${MIN_VIEWS.toLocaleString()} просм.`
        : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="font-display font-semibold text-sm text-foreground mb-1">Требования</h3>
        <div className="flex flex-wrap gap-3 mt-3">
          {[
            { icon: "Users", label: `От ${MIN_SUBSCRIBERS.toLocaleString()} подписчиков` },
            { icon: "Eye", label: `От ${MIN_VIEWS.toLocaleString()} активных просмотров` },
            { icon: "Percent", label: "1% отчислений от продаж" },
          ].map((r) => (
            <div key={r.label} className="flex items-center gap-2 text-xs bg-background border border-border rounded-lg px-3 py-2">
              <Icon name={r.icon} size={13} className="text-gold" />
              <span className="text-foreground">{r.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-sm text-foreground">Ваши платформы</h3>
          <button onClick={addPlatform} className="text-xs text-gold hover:text-gold/80 flex items-center gap-1 font-semibold">
            <Icon name="Plus" size={13} />Добавить платформу
          </button>
        </div>

        {platforms.map((p, i) => (
          <div key={i} className="bg-surface border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Платформа #{i + 1}</span>
              {platforms.length > 1 && (
                <button onClick={() => removePlatform(i)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                  <Icon name="Trash2" size={12} />Удалить
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Платформа</label>
                <select
                  value={p.platform}
                  onChange={(e) => update(i, "platform", e.target.value)}
                  className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm text-foreground"
                >
                  {PLATFORMS.map((pl) => <option key={pl}>{pl}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Ссылка на канал</label>
                <Input
                  placeholder="https://twitch.tv/..."
                  value={p.url}
                  onChange={(e) => update(i, "url", e.target.value)}
                  className="bg-background border-border text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Подписчиков</label>
                <Input
                  type="number"
                  placeholder="5000"
                  value={p.subscribers || ""}
                  onChange={(e) => update(i, "subscribers", parseInt(e.target.value) || 0)}
                  className={`bg-background border-border text-sm ${p.subscribers > 0 && p.subscribers < MIN_SUBSCRIBERS ? "border-red-400/50" : ""}`}
                />
                {p.subscribers > 0 && p.subscribers < MIN_SUBSCRIBERS && (
                  <p className="text-[10px] text-red-400 mt-0.5">Минимум {MIN_SUBSCRIBERS.toLocaleString()}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Средние просмотры</label>
                <Input
                  type="number"
                  placeholder="1500"
                  value={p.avg_views || ""}
                  onChange={(e) => update(i, "avg_views", parseInt(e.target.value) || 0)}
                  className={`bg-background border-border text-sm ${p.avg_views > 0 && p.avg_views < MIN_VIEWS ? "border-red-400/50" : ""}`}
                />
                {p.avg_views > 0 && p.avg_views < MIN_VIEWS && (
                  <p className="text-[10px] text-red-400 mt-0.5">Минимум {MIN_VIEWS.toLocaleString()}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5 text-xs text-red-400 flex items-center gap-2">
          <Icon name="AlertCircle" size={13} />{error}
        </div>
      )}

      <Button
        className="w-full bg-gold text-background hover:bg-gold/90 font-bold"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading && <Icon name="Loader" size={14} className="mr-2 animate-spin" />}
        Подать заявку на партнёрство
      </Button>
    </div>
  );
}

// ─── ГЛАВНЫЙ КОМПОНЕНТ ────────────────────────────────────────────────────────

export function PartnerPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<ApiPartnerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const load = () => {
    setLoading(true);
    api.partner.status()
      .then(setStatus)
      .catch(() => setStatus({ isPartner: false, application: null }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (user) load(); else setLoading(false); }, [user]);

  if (!user) {
    return (
      <div className="text-center py-12">
        <Icon name="Star" size={32} className="mx-auto mb-3 text-muted-foreground opacity-30" />
        <p className="text-sm text-muted-foreground">Войдите, чтобы стать партнёром</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Icon name="Loader" size={24} className="text-gold animate-spin" /></div>;
  }

  if (submitted || (status && !status.isPartner && status.application?.status === "pending")) {
    return (
      <div className="animate-fade-in text-center py-8 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mx-auto">
          <Icon name="Clock" size={28} className="text-amber-400" />
        </div>
        <h3 className="font-display font-bold text-lg text-foreground">Заявка на рассмотрении</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Мы рассмотрим вашу заявку в течение нескольких дней и уведомим вас о решении.
        </p>
        <div className="bg-surface border border-border rounded-xl p-4 inline-block text-left">
          <p className="text-xs text-muted-foreground">Дата подачи: <span className="text-foreground">{status?.application?.date ?? "—"}</span></p>
        </div>
      </div>
    );
  }

  if (status && !status.isPartner && status.application?.status === "rejected") {
    return (
      <div className="animate-fade-in space-y-4">
        <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <Icon name="XCircle" size={20} className="text-red-400" />
            <h3 className="font-display font-semibold text-sm text-foreground">Заявка отклонена</h3>
          </div>
          {status.application.rejectReason && (
            <p className="text-xs text-muted-foreground">Причина: {status.application.rejectReason}</p>
          )}
        </div>
        <p className="text-sm text-muted-foreground">Вы можете подать новую заявку:</p>
        <ApplicationForm onSubmit={() => { setSubmitted(true); load(); }} />
      </div>
    );
  }

  if (status?.isPartner) {
    return <ActivePartnerView status={status} />;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="text-center pb-2">
        <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-4">
          <Icon name="Star" size={26} className="text-gold" />
        </div>
        <h2 className="font-display font-bold text-xl text-foreground mb-2">Партнёрская программа</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Получайте <span className="text-gold font-semibold">1%</span> от каждой покупки пользователей, перешедших по вашей ссылке.
          Для стримеров и блогеров от {MIN_SUBSCRIBERS.toLocaleString()} подписчиков.
        </p>
      </div>
      <ApplicationForm onSubmit={() => { setSubmitted(true); load(); }} />
    </div>
  );
}
