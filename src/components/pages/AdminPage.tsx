import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ADMIN_PASSWORD } from "@/components/data/constants";
import { AdminStatsTab, AdminUsersTab } from "@/components/pages/admin/AdminStatsUsers";
import { AdminDealsTab, AdminRequisitesTab } from "@/components/pages/admin/AdminDealsRequisites";
import {
  AdminWithdrawalsTab,
  AdminDepositsTab,
  AdminStaffTab,
} from "@/components/pages/admin/AdminFinanceStaff";

// ─── ADMIN LOGIN ──────────────────────────────────────────────────────────────

export function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      onSuccess();
      setError(false);
    } else {
      setError(true);
      setPassword("");
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center animate-fade-in">
      <div className="w-full max-w-sm">
        <div className="bg-surface border border-border rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-red-400/10 border border-red-400/30 flex items-center justify-center mx-auto mb-4">
              <Icon name="ShieldAlert" size={28} className="text-red-400" />
            </div>
            <h1 className="font-display font-bold text-xl text-foreground mb-1">
              Панель администратора
            </h1>
            <p className="text-xs text-muted-foreground">
              Доступ только для авторизованных администраторов
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
                Пароль администратора
              </label>
              <Input
                type="password"
                placeholder="Введите пароль..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className={`bg-background border-border ${error ? "border-red-400/60" : ""}`}
              />
              {error && (
                <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                  <Icon name="AlertCircle" size={12} />
                  Неверный пароль
                </p>
              )}
            </div>
            <Button
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold"
              onClick={handleLogin}
            >
              Войти в панель
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TAB TYPE ─────────────────────────────────────────────────────────────────

type AdminTab =
  | "stats"
  | "users"
  | "deals"
  | "requisites"
  | "withdrawals"
  | "deposits"
  | "staff";

const TABS: { id: AdminTab; label: string; icon: string }[] = [
  { id: "stats", label: "Статистика", icon: "BarChart2" },
  { id: "users", label: "Пользователи", icon: "Users" },
  { id: "deals", label: "Сделки", icon: "ArrowRightLeft" },
  { id: "requisites", label: "Реквизиты", icon: "CreditCard" },
  { id: "withdrawals", label: "Выводы", icon: "Banknote" },
  { id: "deposits", label: "Пополнения", icon: "PlusCircle" },
  { id: "staff", label: "Сотрудники", icon: "UserCheck" },
];

// ─── ADMIN PANEL ─────────────────────────────────────────────────────────────

export function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("stats");

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-red-400/10 border border-red-400/30 flex items-center justify-center">
          <Icon name="ShieldAlert" size={24} className="text-red-400" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground">
            Панель администратора
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">Gorant Shop Admin</span>
            <span className="text-[10px] text-red-400/70 font-semibold bg-red-400/20 px-1.5 py-0.5 rounded">
              Системный доступ
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-surface border border-border rounded-xl mb-8">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t.id
                ? "bg-red-500/20 text-red-400 border border-red-400/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon name={t.icon} size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "stats" && <AdminStatsTab />}
      {tab === "users" && <AdminUsersTab />}
      {tab === "deals" && <AdminDealsTab />}
      {tab === "requisites" && <AdminRequisitesTab />}
      {tab === "withdrawals" && <AdminWithdrawalsTab />}
      {tab === "deposits" && <AdminDepositsTab />}
      {tab === "staff" && <AdminStaffTab />}
    </div>
  );
}
