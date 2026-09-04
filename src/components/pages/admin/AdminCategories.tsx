import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, apiErrorMessage, type ApiCategory } from "@/api/client";

export function AdminCategoriesTab() {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [name, setName] = useState("");
  const [unitLabel, setUnitLabel] = useState("шт");
  const [holdDays, setHoldDays] = useState("0");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editHold, setEditHold] = useState("0");
  const [savingEdit, setSavingEdit] = useState(false);

  const load = () => {
    setLoading(true);
    api.products.adminCategories()
      .then(({ categories: list }) => setCategories(list))
      .catch((e) => setActionError(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Введите название категории");
      return;
    }
    const hold = Number(holdDays);
    if (isNaN(hold) || hold < 0 || hold > 90) {
      setError("Срок заморозки должен быть от 0 до 90 дней");
      return;
    }
    setCreating(true);
    setError("");
    try {
      await api.products.createCategory({
        name: name.trim(),
        unitLabel: unitLabel.trim() || "шт",
        holdDays: hold,
      });
      setName(""); setUnitLabel("шт"); setHoldDays("0");
      setShowForm(false);
      load();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (c: ApiCategory) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditUnit(c.unitLabel);
    setEditHold(String(c.holdDays));
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (c: ApiCategory) => {
    const hold = Number(editHold);
    if (!editName.trim() || isNaN(hold) || hold < 0 || hold > 90) {
      setActionError("Проверьте название и срок заморозки (0–90 дней)");
      return;
    }
    setSavingEdit(true);
    setActionError("");
    try {
      await api.products.updateCategory({
        id: c.id,
        name: editName.trim(),
        unitLabel: editUnit.trim() || "шт",
        holdDays: hold,
        active: c.active,
      });
      setEditingId(null);
      load();
    } catch (e) {
      setActionError(apiErrorMessage(e));
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleActive = async (c: ApiCategory) => {
    setActionError("");
    try {
      await api.products.updateCategory({
        id: c.id, name: c.name, unitLabel: c.unitLabel, holdDays: c.holdDays, active: !c.active,
      });
      load();
    } catch (e) {
      setActionError(apiErrorMessage(e));
    }
  };

  const handleDelete = async (id: number) => {
    setActionError("");
    try {
      await api.products.deleteCategory(id);
      load();
    } catch (e) {
      setActionError(apiErrorMessage(e));
    }
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display font-semibold text-base text-foreground">Категории каталога</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-border text-xs" onClick={load} disabled={loading}>
            <Icon name={loading ? "Loader" : "RefreshCw"} size={13} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />Обновить
          </Button>
          <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-bold" onClick={() => setShowForm((v) => !v)}>
            <Icon name={showForm ? "X" : "Plus"} size={13} className="mr-1.5" />{showForm ? "Отмена" : "Новая категория"}
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
          <h3 className="font-display font-semibold text-sm text-foreground">Новая категория</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="text-xs text-muted-foreground mb-1 block">Название</label>
              <Input placeholder="Например: Roblox" value={name} onChange={(e) => setName(e.target.value)} className="bg-background border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Единица измерения</label>
              <Input placeholder="шт / UC / US" value={unitLabel} onChange={(e) => setUnitLabel(e.target.value)} className="bg-background border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Заморозка баланса после продажи, дней</label>
              <Input type="number" min={0} max={90} value={holdDays} onChange={(e) => setHoldDays(e.target.value)} className="bg-background border-border text-sm" />
            </div>
          </div>
          <div className="bg-background/50 border border-border rounded-lg p-3 text-xs text-muted-foreground flex items-start gap-2">
            <Icon name="Info" size={13} className="text-gold shrink-0 mt-0.5" />
            Единица измерения — то, в чём продавец указывает количество товара (например «100 UC» для PUBG Mobile). Заморозка — сколько дней деньги продавца будут удержаны после продажи, прежде чем станут доступны для вывода. 0 — без заморозки.
          </div>
          {error && <p className="text-xs text-red-400 flex items-center gap-1"><Icon name="AlertCircle" size={12} />{error}</p>}
          <Button size="sm" className="bg-gold text-background hover:bg-gold/90 font-bold" onClick={handleCreate} disabled={creating}>
            {creating && <Icon name="Loader" size={13} className="animate-spin mr-1.5" />}Создать
          </Button>
        </div>
      )}

      {loading && categories.length === 0 ? (
        <div className="flex justify-center py-10"><Icon name="Loader" size={22} className="text-gold animate-spin" /></div>
      ) : categories.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted-foreground">
          <Icon name="Tags" size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Категорий пока нет</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-4 border border-border rounded-xl bg-surface flex-wrap">
              <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                <Icon name="Tags" size={16} className="text-gold" />
              </div>

              {editingId === c.id ? (
                <div className="flex-1 min-w-[260px] grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-background border-border text-sm h-8" placeholder="Название" />
                  <Input value={editUnit} onChange={(e) => setEditUnit(e.target.value)} className="bg-background border-border text-sm h-8" placeholder="Единица" />
                  <Input type="number" min={0} max={90} value={editHold} onChange={(e) => setEditHold(e.target.value)} className="bg-background border-border text-sm h-8" placeholder="Дней холда" />
                </div>
              ) : (
                <div className="flex-1 min-w-[180px]">
                  <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                    {c.name}
                    {!c.active && (
                      <span className="text-[9px] text-muted-foreground bg-muted/10 border border-border px-1.5 py-0.5 rounded">скрыта</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Единица: {c.unitLabel} · Заморозка: {c.holdDays > 0 ? `${c.holdDays} дней` : "нет"}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 shrink-0">
                {editingId === c.id ? (
                  <>
                    <button onClick={() => saveEdit(c)} disabled={savingEdit} className="w-7 h-7 rounded-lg bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-400/20 transition-colors">
                      <Icon name={savingEdit ? "Loader" : "Check"} size={12} className={savingEdit ? "animate-spin" : ""} />
                    </button>
                    <button onClick={cancelEdit} className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                      <Icon name="X" size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => toggleActive(c)} title={c.active ? "Скрыть категорию" : "Показать категорию"} className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${c.active ? "bg-background border-border text-muted-foreground hover:text-foreground" : "bg-emerald-400/10 border-emerald-400/20 text-emerald-400 hover:bg-emerald-400/20"}`}>
                      <Icon name={c.active ? "EyeOff" : "Eye"} size={12} />
                    </button>
                    <button onClick={() => startEdit(c)} className="w-7 h-7 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center text-gold hover:bg-gold/20 transition-colors">
                      <Icon name="Pencil" size={12} />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="w-7 h-7 rounded-lg bg-red-400/10 border border-red-400/20 flex items-center justify-center text-red-400 hover:bg-red-400/20 transition-colors">
                      <Icon name="Trash2" size={12} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
