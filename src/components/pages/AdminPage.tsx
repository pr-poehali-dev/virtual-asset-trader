import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { api, apiErrorMessage } from "@/api/client";
import { AdminStatsTab, AdminUsersTab } from "@/components/pages/admin/AdminStatsUsers";
import { AdminDealsTab, AdminRequisitesTab } from "@/components/pages/admin/AdminDealsRequisites";
import {
  AdminWithdrawalsTab,
  AdminDepositsTab,
  AdminStaffTab,
} from "@/components/pages/admin/AdminFinanceStaff";
import { AdminVerificationsTab } from "@/components/pages/admin/AdminVerifications";
import { AdminDepositRequisitesTab, AdminPartnersTab } from "@/components/pages/admin/AdminPartnersRequisites";
import { AdminDisputesTab, AdminSupportTab } from "@/components/pages/admin/AdminSupportDisputes";

const ADMIN_SESSION_KEY = "gs_admin_session";

// ─── ADMIN LOGIN ──────────────────────────────────────────────────────────────
// Использует обычный логин через auth API — токен сохраняется в sessionStorage
// Сессия живёт до закрытия вкладки (sessionStorage очищается автоматически)

export function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const { login, user } = useAuth();
  const [loginVal, setLoginVal] = useState("slumon4ik@gorant.shop");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Восстанавливаем admin-сессию из sessionStorage при монтировании
  useEffect(() => {
    const saved = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (saved === "1" && user?.role === "admin") {
      onSuccess();
    }
  }, [user]);

  const handleLogin = async () => {
    if (!loginVal || !password) { setError("Заполните все поля"); return; }
    setLoading(true);
    setError("");
    try {
      const result = await login(loginVal, password);
      if (result === "ok") {
        // Проверяем что пользователь — администратор
        const { user: me } = await api.auth.me();
        if (me.role !== "admin" && me.role !== "staff") {
          setError("Доступ разрешён только администраторам");
          return;
        }
        sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
        onSuccess();
      } else if (result === "blocked") {
        setError("Аккаунт заблокирован");
      } else if (result === "frozen") {
        setError("Аккаунт заморожен");
      } else {
        setError("Неверный логин или пароль");
      }
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
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
            <h1 className="font-display font-bold text-xl text-foreground mb-1">Панель администратора</h1>
            <p className="text-xs text-muted-foreground">Доступ только для авторизованных администраторов</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Email или логин</label>
              <Input
                placeholder="admin@gorant.shop"
                value={loginVal}
                onChange={(e) => { setLoginVal(e.target.value); setError(""); }}
                className="bg-background border-border"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Пароль</label>
              <Input
                type="password"
                placeholder="Введите пароль..."
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className={`bg-background border-border ${error ? "border-red-400/60" : ""}`}
              />
              {error && (
                <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                  <Icon name="AlertCircle" size={12} />{error}
                </p>
              )}
            </div>
            <Button className="w-full bg-red-500 hover:bg-red-600 text-white font-bold" onClick={handleLogin} disabled={loading}>
              {loading ? <Icon name="Loader" size={16} className="animate-spin mr-2" /> : null}
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
  | "disputes"
  | "support-chat"
  | "requisites"
  | "dep-requisites"
  | "withdrawals"
  | "deposits"
  | "staff"
  | "verifications"
  | "partners";

const TABS: { id: AdminTab; label: string; icon: string }[] = [
  { id: "stats", label: "Статистика", icon: "BarChart2" },
  { id: "users", label: "Пользователи", icon: "Users" },
  { id: "deals", label: "Сделки", icon: "ArrowRightLeft" },
  { id: "disputes", label: "Споры", icon: "AlertTriangle" },
  { id: "support-chat", label: "Поддержка", icon: "Headphones" },
  { id: "requisites", label: "Реквизиты вывода", icon: "CreditCard" },
  { id: "dep-requisites", label: "Реквизиты пополн.", icon: "ArrowDownCircle" },
  { id: "withdrawals", label: "Выводы", icon: "Banknote" },
  { id: "deposits", label: "Пополнения", icon: "PlusCircle" },
  { id: "staff", label: "Сотрудники", icon: "UserCheck" },
  { id: "verifications", label: "Верификации", icon: "ShieldCheck" },
  { id: "partners", label: "Партнёры", icon: "Star" },
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
      {tab === "disputes" && <AdminDisputesTab />}
      {tab === "support-chat" && <AdminSupportTab />}
      {tab === "requisites" && <AdminRequisitesTab />}
      {tab === "dep-requisites" && <AdminDepositRequisitesTab />}
      {tab === "withdrawals" && <AdminWithdrawalsTab />}
      {tab === "deposits" && <AdminDepositsTab />}
      {tab === "staff" && <AdminStaffTab />}
      {tab === "verifications" && <AdminVerificationsTab />}
      {tab === "partners" && <AdminPartnersTab />}
    </div>
  );
}