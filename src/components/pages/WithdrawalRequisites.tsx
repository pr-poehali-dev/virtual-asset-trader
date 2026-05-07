import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, apiErrorMessage, type ApiWithdrawalRequisite } from "@/api/client";

const BANKS = [
  "Сбербанк", "Тинькофф", "ВТБ", "Альфа-Банк", "Газпромбанк",
  "Райффайзен", "Совкомбанк", "МТС Банк", "Почта Банк", "Другой",
];

function requisiteLabel(r: ApiWithdrawalRequisite): string {
  if (r.type === "sbp") return `СБП · ${r.bank} · ${r.phone}`;
  return `Карта · ${r.cardHolder} · ${r.cardNumber}`;
}

// ─── ФОРМА ДОБАВЛЕНИЯ ─────────────────────────────────────────────────────────

function AddRequisiteForm({ onAdded }: { onAdded: () => void }) {
  const [type, setType] = useState<"sbp" | "card">("sbp");
  const [phone, setPhone] = useState("");
  const [bank, setBank] = useState(BANKS[0]);
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatCard = (v: string) =>
    v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

  const handleAdd = async () => {
    setError("");
    setLoading(true);
    try {
      if (type === "sbp") {
        if (!phone.trim() || !bank) { setError("Введите номер телефона и выберите банк"); setLoading(false); return; }
        await api.withdrawalRequisites.add({ type: "sbp", phone: phone.trim(), bank, label: label || undefined });
      } else {
        if (!cardNumber.replace(/\s/g, "") || !cardHolder.trim()) { setError("Введите номер карты и ФИО"); setLoading(false); return; }
        await api.withdrawalRequisites.add({ type: "card", card_number: cardNumber.replace(/\s/g, ""), card_holder: cardHolder.trim().toUpperCase(), label: label || undefined });
      }
      setPhone(""); setCardNumber(""); setCardHolder(""); setLabel("");
      onAdded();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface border border-gold/20 rounded-xl p-5 space-y-4">
      <h3 className="font-display font-semibold text-sm text-foreground">Новый реквизит</h3>

      {/* Тип */}
      <div className="flex gap-2">
        {(["sbp", "card"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setType(t); setError(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              type === t ? "bg-gold text-background border-gold" : "bg-background text-muted-foreground border-border hover:border-gold/40"
            }`}
          >
            {t === "sbp" ? "СБП" : "Карта"}
          </button>
        ))}
      </div>

      {type === "sbp" ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Номер телефона</label>
            <Input
              placeholder="+7 (999) 000-00-00"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-background border-border text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Банк</label>
            <select
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm text-foreground"
            >
              {BANKS.map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Номер карты</label>
            <Input
              placeholder="0000 0000 0000 0000"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCard(e.target.value))}
              className="bg-background border-border text-sm font-mono"
              maxLength={19}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">ФИО получателя</label>
            <Input
              placeholder="IVANOV IVAN IVANOVICH"
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
              className="bg-background border-border text-sm"
            />
          </div>
        </div>
      )}

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Название (необязательно)</label>
        <Input
          placeholder="Моя основная карта"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="bg-background border-border text-sm"
        />
      </div>

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <Icon name="AlertCircle" size={12} />{error}
        </p>
      )}

      <Button
        className="w-full bg-gold text-background hover:bg-gold/90 font-bold"
        onClick={handleAdd}
        disabled={loading}
      >
        {loading && <Icon name="Loader" size={14} className="mr-2 animate-spin" />}
        Добавить реквизит
      </Button>
    </div>
  );
}

// ─── СПИСОК РЕКВИЗИТОВ ────────────────────────────────────────────────────────

export function WithdrawalRequisitesTab({
  selectedId,
  onSelect,
  showSelect = false,
}: {
  selectedId?: string;
  onSelect?: (id: string, label: string) => void;
  showSelect?: boolean;
}) {
  const [requisites, setRequisites] = useState<ApiWithdrawalRequisite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.withdrawalRequisites.list()
      .then(({ requisites: list }) => setRequisites(list))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await api.withdrawalRequisites.delete(id).catch(() => {});
    setRequisites((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null);
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-base text-foreground">Реквизиты для вывода</h2>
        <Button
          size="sm"
          className="bg-gold text-background hover:bg-gold/90 font-bold"
          onClick={() => setShowForm((v) => !v)}
        >
          <Icon name={showForm ? "X" : "Plus"} size={14} className="mr-1.5" />
          {showForm ? "Отмена" : "Добавить"}
        </Button>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4 text-xs text-muted-foreground flex items-start gap-2">
        <Icon name="ShieldCheck" size={13} className="text-gold shrink-0 mt-0.5" />
        Ваши реквизиты хранятся в зашифрованном виде и видны только вам и администраторам при обработке выплаты.
      </div>

      {showForm && (
        <AddRequisiteForm onAdded={() => { setShowForm(false); load(); }} />
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Icon name="Loader" size={22} className="text-gold animate-spin" /></div>
      ) : requisites.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-8 text-center text-muted-foreground">
          <Icon name="CreditCard" size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Реквизитов пока нет. Добавьте первый.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requisites.map((r) => (
            <div
              key={r.id}
              onClick={() => showSelect && onSelect?.(r.id, requisiteLabel(r))}
              className={`flex items-center gap-3 p-4 bg-surface border rounded-xl transition-colors ${
                showSelect ? "cursor-pointer hover:border-gold/40" : ""
              } ${selectedId === r.id ? "border-gold/60 bg-gold/5" : "border-border"}`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                r.type === "sbp" ? "bg-blue-400/10" : "bg-emerald-400/10"
              }`}>
                <Icon
                  name={r.type === "sbp" ? "Smartphone" : "CreditCard"}
                  size={16}
                  className={r.type === "sbp" ? "text-blue-400" : "text-emerald-400"}
                />
              </div>
              <div className="flex-1 min-w-0">
                {r.label && <div className="text-xs text-gold font-semibold mb-0.5">{r.label}</div>}
                {r.type === "sbp" ? (
                  <>
                    <div className="text-sm font-semibold text-foreground">СБП · {r.bank}</div>
                    <div className="text-xs text-muted-foreground font-mono">{r.phone}</div>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-semibold text-foreground">{r.cardHolder}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {r.cardNumber?.replace(/(\d{4})/g, "$1 ").trim()}
                    </div>
                  </>
                )}
                <div className="text-[10px] text-muted-foreground mt-0.5">Добавлен {r.createdAt}</div>
              </div>
              {showSelect && selectedId === r.id && (
                <Icon name="CheckCircle" size={16} className="text-gold shrink-0" />
              )}
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                disabled={deletingId === r.id}
                className="w-7 h-7 rounded-lg bg-red-400/10 border border-red-400/20 flex items-center justify-center text-red-400 hover:bg-red-400/20 transition-colors shrink-0"
              >
                {deletingId === r.id
                  ? <Icon name="Loader" size={12} className="animate-spin" />
                  : <Icon name="Trash2" size={12} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
