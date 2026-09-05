"""Мониторинг ошибок платформы — приём, хранение и чтение событий для админов."""
import json
import os
import psycopg2

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
}
SCHEMA = "t_p38600009_virtual_asset_trader"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def get_user_by_token(cur, token):
    if not token:
        return None
    cur.execute(
        f"""SELECT u.id, u.role, u.is_owner
            FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id=s.user_id
            WHERE s.token=%s AND s.expires_at > NOW()""",
        (token,)
    )
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "role": row[1], "is_owner": row[2]}


def is_admin(user):
    return bool(user) and (user["role"] in ("admin", "staff") or user.get("is_owner"))


def handler(event: dict, context) -> dict:
    """Мониторинг ошибок: POST /report — отправить событие, GET /list — список для админа, POST /resolve — закрыть событие."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    qs   = event.get("queryStringParameters") or {}
    path = qs.get("_path") or event.get("path") or "/"
    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass

    token = (event.get("headers") or {}).get("X-Session-Token")

    # ── POST /report — фронтенд присылает пойманную ошибку (доступно всем) ────
    if path.endswith("/report"):
        event_type  = body.get("event_type", "frontend_error")
        severity    = body.get("severity", "error")
        title       = (body.get("title") or "Неизвестная ошибка")[:255]
        description = body.get("description") or ""
        url         = (body.get("url") or "")[:500]
        user_id     = body.get("user_id") or None
        status_code = body.get("status_code") or None
        ip          = (event.get("requestContext") or {}).get("identity", {}).get("sourceIp") or None

        conn = get_conn()
        try:
            cur = conn.cursor()

            # Дедупликация — не дублируем одну и ту же ошибку чаще чем раз в 5 минут
            cur.execute(
                f"""SELECT id FROM {SCHEMA}.monitor_events
                    WHERE event_type = %s AND title = %s AND resolved = FALSE
                    AND created_at > NOW() - INTERVAL '5 minutes'
                    LIMIT 1""",
                (event_type, title),
            )
            if cur.fetchone():
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "duplicate": True})}

            cur.execute(
                f"""INSERT INTO {SCHEMA}.monitor_events
                    (event_type, severity, title, description, url, user_id, ip, status_code)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                (event_type, severity, title, description, url, user_id, ip, status_code),
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "id": new_id})}
        finally:
            conn.close()

    # ── GET /list — список событий для админа ─────────────────────────────────
    if path.endswith("/list"):
        only_active = qs.get("active", "true") == "true"
        limit       = min(int(qs.get("limit", 100)), 200)
        conn = get_conn()
        try:
            cur = conn.cursor()
            if not is_admin(get_user_by_token(cur, token)):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            where = "WHERE resolved = FALSE" if only_active else ""
            cur.execute(
                f"""SELECT id, event_type, severity, title, description, url,
                           user_id, ip, status_code, resolved, resolved_at,
                           created_at
                    FROM {SCHEMA}.monitor_events
                    {where}
                    ORDER BY created_at DESC
                    LIMIT %s""",
                (limit,),
            )
            cols = ["id","event_type","severity","title","description","url",
                    "user_id","ip","status_code","resolved","resolved_at","created_at"]
            rows = []
            for row in cur.fetchall():
                r = dict(zip(cols, row))
                r["created_at"]  = r["created_at"].isoformat() if r["created_at"] else None
                r["resolved_at"] = r["resolved_at"].isoformat() if r["resolved_at"] else None
                rows.append(r)

            # Сводка
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.monitor_events WHERE resolved = FALSE")
            open_count = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.monitor_events WHERE resolved = FALSE AND severity = 'critical'")
            critical_count = cur.fetchone()[0]

            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "events": rows,
                "open_count": open_count,
                "critical_count": critical_count,
            })}
        finally:
            conn.close()

    # ── POST /resolve — закрыть событие ───────────────────────────────────────
    if path.endswith("/resolve"):
        event_id = body.get("id")
        if not event_id:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "missing_id"})}
        conn = get_conn()
        try:
            cur = conn.cursor()
            if not is_admin(get_user_by_token(cur, token)):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            cur.execute(
                f"UPDATE {SCHEMA}.monitor_events SET resolved=TRUE, resolved_at=NOW() WHERE id=%s",
                (event_id,),
            )
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}
        finally:
            conn.close()

    # ── POST /resolve-all — закрыть все ───────────────────────────────────────
    if path.endswith("/resolve-all"):
        conn = get_conn()
        try:
            cur = conn.cursor()
            if not is_admin(get_user_by_token(cur, token)):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            cur.execute(f"UPDATE {SCHEMA}.monitor_events SET resolved=TRUE, resolved_at=NOW() WHERE resolved=FALSE")
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}
        finally:
            conn.close()

    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}