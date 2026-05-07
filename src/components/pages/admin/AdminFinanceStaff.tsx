import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  INITIAL_WITHDRAWALS,
  WITHDRAW_STATUS_MAP,
  WithdrawRequest,
  DEPOSIT_STATUS_MAP,
  PLATFORM_COMMISSION,
  StaffPermission,
} from "@/components/data/constants";
import { useAuth } from "@/context/AuthContext";

const ALL_PERMISSIONS: { id: StaffPermission; label: string }[] = [
  { id: "manage_users", label: "Управление пользователями" },
  { id: "manage_deals", label: "Управление сделками" },
  { id: "manage_withdrawals", label: "Управление выводами" },
  { id: "manage_deposits", label: "Управление пополнениями" },
  { id: "manage_requisites", label: "Управление реквизитами" },
  { id: "manage_staff", label: "Управление сотрудниками" },
  { id: "arbiter", label: "Арбитр" },
];

// ─── WITHDRAWALS TAB ──────────────────────────────────────────────────────────

export function AdminWithdrawalsTab() {
  const [withdrawals, setWithdrawals] = useState<WithdrawRequest[]>(INITIAL_WITHDRAWALS);
  const [withdrawCommission, setWithdrawCommission] = useState(PLATFORM_COMMISSION);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
        <h2 className="font-display font-semibold text-base text-foreground">Заявки на вывод</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Комиссия вывода:</span>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={withdrawCommission}
              onChange={(e) => setWithdrawCommission(Number(e.target.value))}
              className="bg-background border-border text-sm h-8 w-20 text-center"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {withdrawals.length === 0 && (
          <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted-foreground">
            <Icon name="Inbox" size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Заявок на вывод нет</p>
          </div>
        )}
        {withdrawals.map((w) => {
          const s = WITHDRAW_STATUS_MAP[w.status] ?? {
            label: w.status,
            color: "text-muted-foreground bg-muted/10 border-border",
          };
          const toReceive = Math.round(w.amount * (1 - withdrawCommission / 100));
          return (
            <div key={w.id} className="bg-surface border border-border rounded-xl p-4">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-mono text-xs text-muted-foreground">{w.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${s.color}`}>
                      {s.label}
                    </span>
                  </div>
                  <div className="font-display font-bold text-lg text-gold">
                    ₽ {w.amount.toLocaleString("ru-RU")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {w.username} · {w.requisiteType} · {w.requisiteDetails}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Дата: {w.date} · К выплате:{" "}
                    <span className="text-foreground font-semibold">
                      ₽ {toReceive.toLocaleString("ru-RU")}
                    </span>{" "}
                    (комиссия {withdrawCommission}%)
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 items-end">
                  {w.status === "pending" && (
                    <button
                      onClick={() =>
                        setWithdrawals((prev) =>
                          prev.map((x) => (x.id === w.id ? { ...x, status: "processing" } : x))
                        )
                      }
                      className="text-xs px-2.5 py-1 rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/20 hover:bg-amber-400/20 font-semibold"
                    >
                      В обработку
                    </button>
                  )}
                  {w.status === "processing" && (
                    <button
                      onClick={() =>
                        setWithdrawals((prev) =>
                          prev.map((x) => (x.id === w.id ? { ...x, status: "done" } : x))
                        )
                      }
                      className="text-xs px-2.5 py-1 rounded-lg bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 font-semibold"
                    >
                      Выплачено ✓
                    </button>
                  )}
                  {(w.status === "pending" || w.status === "processing") && (
                    <button
                      onClick={() =>
                        setWithdrawals((prev) =>
                          prev.map((x) => (x.id === w.id ? { ...x, status: "rejected" } : x))
                        )
                      }
                      className="text-xs px-2.5 py-1 rounded-lg bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20 font-semibold"
                    >
                      Отклонить
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── DEPOSITS TAB ─────────────────────────────────────────────────────────────

export function AdminDepositsTab() {
  const { deposits: contextDeposits, confirmDeposit, rejectDeposit } = useAuth();
  const pendingDeposits = contextDeposits.filter((d) => d.status === "pending");

  return (
    <div className="animate-fade-in">
      <h2 className="font-display font-semibold text-base text-foreground mb-5">
        Заявки на пополнение
      </h2>

      {pendingDeposits.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted-foreground">
          <Icon name="Inbox" size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Нет ожидающих заявок на пополнение</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingDeposits.map((dep) => {
            const s = DEPOSIT_STATUS_MAP[dep.status] ?? {
              label: dep.status,
              color: "text-muted-foreground bg-muted/10 border-border",
            };
            return (
              <div key={dep.id} className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{dep.id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${s.color}`}>
                        {s.label}
                      </span>
                    </div>
                    <div className="font-display font-bold text-lg text-gold">
                      {dep.amount.toLocaleString("ru-RU")} {dep.currency}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {dep.username} · {dep.requisiteType}
                    </div>
                    <div className="text-xs text-muted-foreground">Дата: {dep.date}</div>
                  </div>
                  <div className="flex flex-col gap-1.5 items-end">
                    <button
                      onClick={() => confirmDeposit(dep.id)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 font-semibold flex items-center gap-1"
                    >
                      <Icon name="CheckCircle" size={11} />
                      Успешное пополнение
                    </button>
                    <button
                      onClick={() => rejectDeposit(dep.id)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20 font-semibold flex items-center gap-1"
                    >
                      <Icon name="XCircle" size={11} />
                      Оплата не обнаружена
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── STAFF TAB ────────────────────────────────────────────────────────────────

export function AdminStaffTab() {
  const { users, addStaff, removeStaff, updateStaffPerms } = useAuth();
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [newStaffUserId, setNewStaffUserId] = useState("");
  const [newStaffPerms, setNewStaffPerms] = useState<StaffPermission[]>([]);
  const [editingPermsId, setEditingPermsId] = useState<string | null>(null);
  const [editingPerms, setEditingPerms] = useState<StaffPermission[]>([]);

  const staffUsers = users.filter((u) => u.role === "admin" || u.role === "staff");

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display font-semibold text-base text-foreground">Сотрудники</h2>
        <Button
          size="sm"
          className="bg-gold text-background hover:bg-gold/90 font-bold"
          onClick={() => {
            setAddStaffOpen(true);
            setNewStaffUserId("");
            setNewStaffPerms([]);
          }}
        >
          <Icon name="UserPlus" size={14} className="mr-1.5" />
          Добавить сотрудника
        </Button>
      </div>

      {addStaffOpen && (
        <div className="bg-surface border border-gold/20 rounded-xl p-5 mb-6">
          <h3 className="font-display font-semibold text-sm text-foreground mb-4">
            Новый сотрудник
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Пользователь</label>
              <select
                value={newStaffUserId}
                onChange={(e) => setNewStaffUserId(e.target.value)}
                className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm text-foreground"
              >
                <option value="">Выберите пользователя...</option>
                {users
                  .filter((u) => u.role === "user")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.email})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Права доступа</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_PERMISSIONS.map((perm) => (
                  <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStaffPerms.includes(perm.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewStaffPerms((prev) => [...prev, perm.id]);
                        } else {
                          setNewStaffPerms((prev) => prev.filter((p) => p !== perm.id));
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-foreground">{perm.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                className="border-border"
                onClick={() => setAddStaffOpen(false)}
              >
                Отмена
              </Button>
              <Button
                size="sm"
                className="bg-gold text-background hover:bg-gold/90 font-bold"
                onClick={() => {
                  if (!newStaffUserId) return;
                  addStaff(newStaffUserId, newStaffPerms);
                  setAddStaffOpen(false);
                }}
              >
                Добавить
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {staffUsers.length === 0 && (
          <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted-foreground">
            <Icon name="Users" size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Сотрудников пока нет</p>
          </div>
        )}
        {staffUsers.map((u) => (
          <div key={u.id} className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-sm font-bold text-gold">
                  {u.username[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-semibold text-sm text-foreground">
                      {u.username}
                    </span>
                    {u.isOwner && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gold/20 text-gold border border-gold/30">
                        Владелец
                      </span>
                    )}
                    {u.role === "admin" && !u.isOwner && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-400/20 text-red-400 border border-red-400/30">
                        Администратор
                      </span>
                    )}
                    {u.role === "staff" && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-400/20 text-blue-400 border border-blue-400/30">
                        Сотрудник
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>
              </div>

              {!u.isOwner && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingPermsId(u.id);
                      setEditingPerms(u.staffPermissions ?? []);
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg bg-blue-400/10 text-blue-400 border border-blue-400/20 hover:bg-blue-400/20 font-semibold"
                  >
                    Права
                  </button>
                  <button
                    onClick={() => removeStaff(u.id)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20 font-semibold"
                  >
                    Снять
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {(u.staffPermissions ?? []).length === 0 && u.role !== "admin" && (
                <span className="text-xs text-muted-foreground">Нет прав</span>
              )}
              {u.role === "admin" && (
                <span className="text-xs px-2 py-0.5 rounded bg-red-400/10 text-red-400 border border-red-400/20">
                  Полный доступ
                </span>
              )}
              {u.role !== "admin" &&
                (u.staffPermissions ?? []).map((perm) => {
                  const label = ALL_PERMISSIONS.find((p) => p.id === perm)?.label ?? perm;
                  return (
                    <span
                      key={perm}
                      className="text-xs px-2 py-0.5 rounded bg-blue-400/10 text-blue-400 border border-blue-400/20"
                    >
                      {label}
                    </span>
                  );
                })}
            </div>

            {editingPermsId === u.id && (
              <div className="bg-background border border-border rounded-lg p-4 mt-2">
                <p className="text-xs text-muted-foreground font-semibold mb-3">
                  Редактирование прав: {u.username}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {ALL_PERMISSIONS.map((perm) => (
                    <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingPerms.includes(perm.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingPerms((prev) => [...prev, perm.id]);
                          } else {
                            setEditingPerms((prev) => prev.filter((p) => p !== perm.id));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-foreground">{perm.label}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border"
                    onClick={() => setEditingPermsId(null)}
                  >
                    Отмена
                  </Button>
                  <Button
                    size="sm"
                    className="bg-gold text-background hover:bg-gold/90 font-bold"
                    onClick={() => {
                      updateStaffPerms(u.id, editingPerms);
                      setEditingPermsId(null);
                    }}
                  >
                    Сохранить
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
