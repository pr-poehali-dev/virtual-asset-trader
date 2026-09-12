import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, apiErrorMessage, type ApiPartnerApplication, type ApiPartner, type ApiDepositRequisite } from "@/api/client";

// ─── РЕКВИЗИТЫ ПОПОЛНЕНИЯ (пул платформы) ────────────────────────────────────

export function AdminDepositRequisitesTab() {
  const [requisites, setRequisites] = useState<ApiDepositRequisite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  // Форма добавления
  const [name, setName] = useState("");
  const [type, setType] = useState("sbp");
  const [details, setDetails] = useState("");
  const [bank, setBank] = useState("");
  const [currency, setCurrency] = useState("RUB");
  const [adding, setAdding] = useState(false);

  const load = () => {
    setLoading(true);
    api.adminExtra.getDepositRequisites()
      .then(({ requisites: list }) => setRequisites(list))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!name || !details) { setError("Заполните название и реквизиты"); return; }
    setAdding(true); setError("");
    try {
      await api.adminExtra.addDepositRequisite({ name, type, details, bank: bank || undefined, currency });
      setName(""); setDetails(""); setBank(""); setShowForm(false);
      load();
    } catch (e) { setError(apiErrorMessage(e)); }
    finally { setAdding(false); }
  };

  const toggle = async (id: string) => {
    await api.adminExtra.toggleDepositRequisite(id).catch(() => {});
    setRequisites((prev) => prev.map((r) => r.id === id ? { ...r, active: !r.active } : r));
  };

  const del = async (id: string) => {
    await api.adminExtra.deleteDepositRequisite(id).catch(() => {});
    setRequisites((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-base text-foreground">Реквизиты для пополнения</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-border text-xs" onClick={load} disabled={loading}>
            <Icon name={loading ? "Loader" : "RefreshCw"} size={13} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />Обновить
          </Button>
          <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-bold" onClick={() => setShowForm((v) => !v)}>
            <Icon name={showForm ? "X" : "Plus"} size={13} className="mr-1.5" />{showForm ? "Отмена" : "Добавить"}
          </Button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4 text-xs text-muted-foreground flex items-start gap-2">
        <Icon name="Info" size={13} className="text-gold shrink-0 mt-0.5" />
        При каждом пополнении пользователю показывается один реквизит из пула — по кругу. Когда все реквизиты показаны — цикл начинается заново.
      </div>

      {showForm && (
        <div className="bg-surface border border-gold/20 rounded-xl p-5 space-y-3">
          <h3 className="font-display font-semibold text-sm text-foreground">Новый реквизит</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Название</label>
              <Input placeholder="Сбербанк СБП" value={name} onChange={(e) => setName(e.target.value)} className="bg-background border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Тип</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm text-foreground">
                <option value="sbp">СБП</option>
                <option value="card">Карта</option>
                <option value="crypto">Крипто</option>
                <option value="wallet">Эл. кошелёк</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Реквизиты (номер/адрес)</label>
              <Input placeholder="+7 999 000-00-00" value={details} onChange={(e) => setDetails(e.target.value)} className="bg-background border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Банк (если СБП/карта)</label>
              <Input placeholder="Сбербанк" value={bank} onChange={(e) => setBank(e.target.value)} className="bg-background border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Валюта</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm text-foreground">
                <option>RUB</option><option>USDT</option><option>BTC</option><option>ETH</option>
              </select>
            </div>
          </div>
          {error && <p className="text-xs text-red-400 flex items-center gap-1"><Icon name="AlertCircle" size={12} />{error}</p>}
          <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-bold" onClick={handleAdd} disabled={adding}>
            {adding && <Icon name="Loader" size={13} className="animate-spin mr-1.5" />}Добавить
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Icon name="Loader" size={22} className="text-gold animate-spin" /></div>
      ) : requisites.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted-foreground">
          <Icon name="CreditCard" size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Реквизитов пока нет</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requisites.map((r) => (
            <div key={r.id} className={`flex items-center gap-3 p-4 border rounded-xl ${r.active ? "bg-surface border-border" : "bg-background/30 border-border opacity-60"}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${r.active ? "bg-gold/10" : "bg-muted/10"}`}>
                <Icon name={r.type === "crypto" ? "Bitcoin" : r.type === "wallet" ? "Wallet" : r.type === "sbp" ? "Smartphone" : "CreditCard"} size={16} className={r.active ? "text-gold" : "text-muted-foreground"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-foreground">{r.name}</div>
                <div className="font-mono text-xs text-muted-foreground">{r.details}{r.bank ? ` · ${r.bank}` : ""}</div>
                <div className="text-[10px] text-muted-foreground">{r.currency} · Показан {r.showCount ?? 0} раз</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${r.active ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : "text-muted-foreground bg-muted/10 border-border"}`}>
                  {r.active ? "Активен" : "Выкл"}
                </span>
                <button onClick={() => toggle(r.id)} className="text-xs px-2 py-1 rounded-lg bg-background border border-border hover:border-gold/40 text-muted-foreground hover:text-foreground transition-colors">
                  {r.active ? "Выкл" : "Вкл"}
                </button>
                <button onClick={() => del(r.id)} className="w-7 h-7 rounded-lg bg-red-400/10 border border-red-400/20 flex items-center justify-center text-red-400 hover:bg-red-400/20 transition-colors">
                  <Icon name="Trash2" size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ПАРТНЁРЫ ─────────────────────────────────────────────────────────────────

export function AdminPartnersTab() {
  const [view, setView] = useState<"applications" | "partners">("applications");
  const [applications, setApplications] = useState<ApiPartnerApplication[]>([]);
  const [partners, setPartners] = useState<ApiPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState("");

  // Редактирование кодов у одобренного партнёра (реф-код / промокод вручную)
  const [editCodesId, setEditCodesId] = useState<string | null>(null);
  const [editRefCode, setEditRefCode] = useState("");
  const [editPromoCode, setEditPromoCode] = useState("");
  const [savingCodes, setSavingCodes] = useState(false);
  const [regenLoading, setRegenLoading] = useState<string | null>(null);

  // Опциональные коды при одобрении заявки (если не заданы — сгенерируются автоматически)
  const [approveId, setApproveId] = useState<string | null>(null);
  const [approveRefCode, setApproveRefCode] = useState("");
  const [approvePromoCode, setApprovePromoCode] = useState("");

  const loadApps = () => {
    setLoading(true);
    api.adminExtra.getPartnerApplications()
      .then(({ applications: list }) => setApplications(list))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadPartners = () => {
    setLoading(true);
    api.adminExtra.getPartners()
      .then(({ partners: list }) => setPartners(list))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (view === "applications") loadApps();
    else loadPartners();
  }, [view]);

  const approve = async (id: string) => {
    setActionError("");
    try {
      const { refCode, promoCode } = await api.adminExtra.approvePartner(
        id,
        approveRefCode.trim() || undefined,
        approvePromoCode.trim() || undefined,
      );
      setApplications((prev) => prev.map((a) => a.id === id ? { ...a, status: "approved" as const } : a));
      setApproveId(null); setApproveRefCode(""); setApprovePromoCode("");
      alert(`Партнёр одобрен!\nРеф-код: ${refCode}${promoCode ? `\nПромокод: ${promoCode}` : ""}`);
    } catch (e) { setActionError(apiErrorMessage(e)); }
  };

  const reject = async () => {
    if (!rejectId) return;
    setActionError("");
    try {
      await api.adminExtra.rejectPartner(rejectId, rejectReason);
      setApplications((prev) => prev.map((a) => a.id === rejectId ? { ...a, status: "rejected" as const } : a));
      setRejectId(null); setRejectReason("");
    } catch (e) { setActionError(apiErrorMessage(e)); }
  };

  const toggle = async (id: string) => {
    await api.adminExtra.togglePartner(id).catch(() => {});
    setPartners((prev) => prev.map((p) => p.id === id ? { ...p, active: !p.active } : p));
  };

  const toggleAutoGenerate = async (id: string) => {
    await api.adminExtra.togglePartnerAutoGenerate(id).catch(() => {});
    setPartners((prev) => prev.map((p) => p.id === id ? { ...p, autoGenerate: !p.autoGenerate } : p));
  };

  const openEditCodes = (p: ApiPartner) => {
    setEditCodesId(p.id);
    setEditRefCode(p.refCode);
    setEditPromoCode(p.promoCode ?? "");
    setActionError("");
  };

  const saveCodes = async (id: string) => {
    setSavingCodes(true);
    setActionError("");
    try {
      await api.adminExtra.updatePartnerCode(id, editRefCode.trim() || undefined, editPromoCode.trim() || undefined);
      setPartners((prev) => prev.map((p) => p.id === id ? { ...p, refCode: editRefCode.trim().toUpperCase() || p.refCode, promoCode: editPromoCode.trim().toUpperCase() || null } : p));
      setEditCodesId(null);
    } catch (e) { setActionError(apiErrorMessage(e)); }
    finally { setSavingCodes(false); }
  };

  const regenerateCode = async (id: string, target: "ref" | "promo") => {
    setRegenLoading(`${id}-${target}`);
    setActionError("");
    try {
      const { code } = await api.adminExtra.regeneratePartnerCode(id, target);
      setPartners((prev) => prev.map((p) => p.id === id
        ? (target === "ref" ? { ...p, refCode: code } : { ...p, promoCode: code })
        : p));
      if (editCodesId === id) {
        if (target === "ref") setEditRefCode(code); else setEditPromoCode(code);
      }
    } catch (e) { setActionError(apiErrorMessage(e)); }
    finally { setRegenLoading(null); }
  };

  const STATUS_STYLE: Record<string, string> = {
    pending: "text-amber-400 bg-amber-400/10 border-amber-400/30",
    approved: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
    rejected: "text-red-400 bg-red-400/10 border-red-400/30",
  };
  const STATUS_LABEL: Record<string, string> = { pending: "На рассмотрении", approved: "Одобрена", rejected: "Отклонена" };

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display font-semibold text-base text-foreground">Партнёрская программа</h2>
        <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg">
          {(["applications", "partners"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${view === v ? "bg-gold text-background" : "text-muted-foreground hover:text-foreground"}`}>
              {v === "applications" ? `Заявки (${applications.filter(a => a.status === "pending").length})` : `Партнёры (${partners.length})`}
            </button>
          ))}
        </div>
      </div>

      {actionError && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5 text-xs text-red-400 flex items-center gap-2">
          <Icon name="AlertCircle" size={13} />{actionError}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Icon name="Loader" size={22} className="text-gold animate-spin" /></div>
      ) : view === "applications" ? (
        <div className="space-y-3">
          {applications.length === 0 && (
            <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted-foreground">
              <Icon name="Star" size={32} className="mx-auto mb-3 opacity-20" /><p className="text-sm">Заявок пока нет</p>
            </div>
          )}
          {applications.map((a) => (
            <div key={a.id} className="bg-surface border border-border rounded-xl p-4">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-semibold text-sm text-foreground">{a.username}</span>
                    <span className="text-xs text-muted-foreground">{a.email}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${STATUS_STYLE[a.status]}`}>{STATUS_LABEL[a.status]}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.date}</div>
                </div>
                {a.status === "pending" && (
                  <div className="flex gap-2">
                    <button onClick={() => { setApproveId(a.id); setApproveRefCode(""); setApprovePromoCode(""); setRejectId(null); }} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 font-semibold">Одобрить</button>
                    <button onClick={() => { setRejectId(a.id); setRejectReason(""); setApproveId(null); }} className="text-xs px-3 py-1.5 rounded-lg bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20 font-semibold">Отклонить</button>
                  </div>
                )}
              </div>
              {/* Платформы */}
              <div className="space-y-1.5">
                {(a.platforms || []).map((p, i) => (
                  <div key={i} className="flex items-center gap-3 bg-background border border-border rounded-lg px-3 py-2 text-xs">
                    <Icon name="Play" size={12} className="text-gold shrink-0" />
                    <span className="font-semibold text-foreground">{p.platform}</span>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline truncate flex-1">{p.url}</a>
                    <span className="text-muted-foreground shrink-0">{p.subscribers.toLocaleString()} подп.</span>
                    <span className="text-muted-foreground shrink-0">~{p.avg_views.toLocaleString()} просм.</span>
                  </div>
                ))}
              </div>

              {/* Reject form */}
              {rejectId === a.id && (
                <div className="mt-3 bg-background border border-border rounded-lg p-3 space-y-2">
                  <Input placeholder="Причина отклонения..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="bg-surface border-border text-sm" />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="border-border" onClick={() => setRejectId(null)}>Отмена</Button>
                    <Button size="sm" className="bg-red-500 text-white hover:bg-red-600 font-bold" onClick={reject}>Отклонить</Button>
                  </div>
                </div>
              )}

              {/* Approve form — коды опциональны, если не заданы, платформа сгенерирует их сама */}
              {approveId === a.id && (
                <div className="mt-3 bg-background border border-emerald-400/20 rounded-lg p-3 space-y-2">
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <Icon name="Info" size={11} className="text-emerald-400 shrink-0" />
                    Коды необязательны — если оставить пустыми, сгенерируются автоматически
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">Реф-код (для ссылки ?ref=)</label>
                      <Input placeholder="Автогенерация" value={approveRefCode} onChange={(e) => setApproveRefCode(e.target.value.toUpperCase())} className="bg-surface border-border text-sm font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">Промокод (ручной ввод)</label>
                      <Input placeholder="Не задан" value={approvePromoCode} onChange={(e) => setApprovePromoCode(e.target.value.toUpperCase())} className="bg-surface border-border text-sm font-mono" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="border-border" onClick={() => setApproveId(null)}>Отмена</Button>
                    <Button size="sm" className="bg-emerald-500 text-white hover:bg-emerald-600 font-bold" onClick={() => approve(a.id)}>Подтвердить одобрение</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {partners.length === 0 && (
            <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted-foreground">
              <Icon name="Star" size={32} className="mx-auto mb-3 opacity-20" /><p className="text-sm">Партнёров пока нет</p>
            </div>
          )}
          {partners.map((p) => (
            <div key={p.id} className={`bg-surface border rounded-xl p-4 ${p.active ? "border-border" : "border-border opacity-60"}`}>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-display font-semibold text-sm text-foreground">{p.username}</span>
                    <span className="text-xs text-muted-foreground">{p.email}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${p.active ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : "text-muted-foreground bg-muted/10 border-border"}`}>
                      {p.active ? "Активен" : "Отключён"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-2">
                    {[
                      { label: "Реф-код (?ref=)", value: p.refCode, mono: true },
                      { label: "Промокод", value: p.promoCode || "—", mono: true },
                      { label: "Комиссия", value: `${p.commissionPct}%` },
                      { label: "Заработано", value: `₽ ${p.totalEarned.toLocaleString()}` },
                      { label: "Рефералов", value: String(p.totalReferrals) },
                    ].map((s) => (
                      <div key={s.label} className="bg-background border border-border rounded-lg px-3 py-2">
                        <div className="text-[10px] text-muted-foreground">{s.label}</div>
                        <div className={`text-sm font-bold text-foreground ${s.mono ? "font-mono" : ""}`}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end shrink-0">
                  <button onClick={() => toggle(p.id)} className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                    p.active ? "bg-red-400/10 text-red-400 border-red-400/20 hover:bg-red-400/20" : "bg-emerald-400/10 text-emerald-400 border-emerald-400/20 hover:bg-emerald-400/20"
                  }`}>
                    {p.active ? "Отключить" : "Включить"}
                  </button>
                  <button onClick={() => openEditCodes(p)} className="text-xs px-3 py-1.5 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 font-semibold">
                    <Icon name="Pencil" size={11} className="mr-1 inline" />Коды
                  </button>
                </div>
              </div>

              {/* Автогенерация — переключатель на партнёра */}
              <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground cursor-pointer w-fit">
                <input
                  type="checkbox"
                  checked={p.autoGenerate ?? true}
                  onChange={() => toggleAutoGenerate(p.id)}
                  className="accent-gold w-3.5 h-3.5"
                />
                Автогенерация кода при перевыпуске
              </label>

              {/* Платформы */}
              {(p.platforms || []).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(p.platforms as { platform: string; url: string }[]).map((pl, i) => (
                    <a key={i} href={pl.url} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] px-2 py-1 rounded bg-background border border-border text-gold hover:underline flex items-center gap-1">
                      <Icon name="Play" size={10} />{pl.platform}
                    </a>
                  ))}
                </div>
              )}

              {/* Редактирование кодов */}
              {editCodesId === p.id && (
                <div className="mt-3 bg-background border border-gold/20 rounded-lg p-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">Реф-код (используется в ссылке ?ref=)</label>
                      <div className="flex gap-1.5">
                        <Input value={editRefCode} onChange={(e) => setEditRefCode(e.target.value.toUpperCase())} className="bg-surface border-border text-sm font-mono" />
                        <Button
                          size="sm" variant="outline" className="border-border shrink-0 px-2"
                          disabled={regenLoading === `${p.id}-ref`}
                          onClick={() => regenerateCode(p.id, "ref")}
                        >
                          <Icon name={regenLoading === `${p.id}-ref` ? "Loader" : "Shuffle"} size={13} className={regenLoading === `${p.id}-ref` ? "animate-spin" : ""} />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">Промокод (вводится вручную при регистрации)</label>
                      <div className="flex gap-1.5">
                        <Input placeholder="Не задан" value={editPromoCode} onChange={(e) => setEditPromoCode(e.target.value.toUpperCase())} className="bg-surface border-border text-sm font-mono" />
                        <Button
                          size="sm" variant="outline" className="border-border shrink-0 px-2"
                          disabled={regenLoading === `${p.id}-promo`}
                          onClick={() => regenerateCode(p.id, "promo")}
                        >
                          <Icon name={regenLoading === `${p.id}-promo` ? "Loader" : "Shuffle"} size={13} className={regenLoading === `${p.id}-promo` ? "animate-spin" : ""} />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="border-border" onClick={() => setEditCodesId(null)}>Отмена</Button>
                    <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-bold" disabled={savingCodes} onClick={() => saveCodes(p.id)}>
                      {savingCodes && <Icon name="Loader" size={13} className="animate-spin mr-1.5" />}Сохранить
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}