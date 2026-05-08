import { api } from "@/api/client";
import { getToken } from "@/api/client";

let _userId: string | null = null;

export function setMonitorUserId(id: string | null) {
  _userId = id;
}

async function report(
  event_type: string,
  severity: "info" | "warning" | "error" | "critical",
  title: string,
  description?: string,
  status_code?: number
) {
  try {
    await api.monitor.report({
      event_type,
      severity,
      title,
      description: description?.slice(0, 2000),
      url: window.location.href,
      user_id: _userId ?? undefined,
      status_code,
    });
  } catch {
    // никогда не бросаем ошибки из самого мониторинга
  }
}

// ── Перехват необработанных JS-ошибок ─────────────────────────────────────
window.addEventListener("error", (e) => {
  const msg = e.message || "Unknown JS error";
  const stack = e.error?.stack || `${e.filename}:${e.lineno}:${e.colno}`;
  report("js_error", "error", msg.slice(0, 255), stack);
});

// ── Перехват необработанных Promise-отказов ────────────────────────────────
window.addEventListener("unhandledrejection", (e) => {
  const reason = String(e.reason ?? "Unhandled promise rejection");
  report("promise_rejection", "error", reason.slice(0, 255));
});

export function reportApiError(path: string, status: number) {
  if (status === 401) return; // 401 — не ошибка, просто не авторизован
  const severity = status >= 500 ? "critical" : "warning";
  report("api_error", severity, `HTTP ${status}: ${path}`, undefined, status);
}

export function reportCustom(
  title: string,
  description?: string,
  severity: "info" | "warning" | "error" | "critical" = "info"
) {
  report("custom", severity, title, description);
}

// ── Мониторинг сессии (нет токена но юзер пытается делать запросы) ─────────
export function checkSessionHealth() {
  const token = getToken();
  if (!token && _userId) {
    report("session_lost", "warning", "Сессия потеряна — токен отсутствует, но userId установлен");
  }
}
