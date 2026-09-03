"""
Аутентификация: регистрация, вход, выход, проверка сессии.
"""
import json, os, secrets, hashlib
import psycopg2
from datetime import datetime

SCHEMA = os.environ.get("MAIN_DB_SCHEMA") or "t_p38600009_virtual_asset_trader"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}

def get_conn():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = False
    return conn

# ── DDoS-защита: ограничение количества запросов с одного IP ──────────────────

def get_client_ip(event):
    return (event.get("requestContext") or {}).get("identity", {}).get("sourceIp") or "unknown"

def is_ip_blocked(cur, ip):
    cur.execute(f"SELECT blocked_until FROM {SCHEMA}.blocked_ips WHERE ip=%s", (ip,))
    row = cur.fetchone()
    return bool(row and row[0].timestamp() > datetime.now().timestamp())

def check_rate_limit(cur, ip, bucket, window_sec=60, max_hits=20, block_minutes=15):
    """Возвращает True если IP заблокирован или превысил лимит (и блокирует его)."""
    if is_ip_blocked(cur, ip):
        return True
    cur.execute(f"INSERT INTO {SCHEMA}.ip_hits (ip, bucket) VALUES (%s,%s)", (ip, bucket))
    cur.execute(
        f"""SELECT COUNT(*) FROM {SCHEMA}.ip_hits
            WHERE ip=%s AND bucket=%s AND created_at >= NOW() - INTERVAL '{window_sec} seconds'""",
        (ip, bucket)
    )
    count = cur.fetchone()[0]
    if count > max_hits:
        cur.execute(
            f"""INSERT INTO {SCHEMA}.blocked_ips (ip, reason, blocked_until)
                VALUES (%s,%s, NOW() + INTERVAL '{block_minutes} minutes')
                ON CONFLICT (ip) DO UPDATE SET blocked_until=EXCLUDED.blocked_until, reason=EXCLUDED.reason, created_at=NOW()""",
            (ip, f"Превышен лимит запросов: {bucket} ({count} за {window_sec}с)")
        )
        return True
    return False

def hash_password(pw: str) -> str:
    salt = "gorant_salt_2024"
    return hashlib.sha256((salt + pw).encode()).hexdigest()

def make_token():
    return secrets.token_hex(32)

def make_account_id():
    import time, random, string
    ts = format(int(time.time()), 'x').upper()
    rand = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"GS-{ts}-{rand}"

def make_user_id(conn):
    cur = conn.cursor()
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users")
    count = cur.fetchone()[0]
    return f"u-{str(count + 1).zfill(3)}"

def user_row_to_dict(row, columns):
    d = dict(zip(columns, row))
    d["balance_rub"] = float(d.get("balance_rub", 0))
    d["locked_rub"] = float(d.get("locked_rub", 0))
    if d.get("joined_at"):
        d["joined_at"] = d["joined_at"].strftime("%d.%m.%Y")
    d.pop("password_hash", None)
    return d

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    _qs = event.get("queryStringParameters") or {}
    path = _qs.get("_path") or event.get("path") or "/"
    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass

    ip = get_client_ip(event)
    conn = get_conn()
    try:
        cur = conn.cursor()

        if is_ip_blocked(cur, ip):
            return {"statusCode": 429, "headers": CORS, "body": json.dumps({"error": "ip_blocked"})}

        # ── POST /register ────────────────────────────────────────────────────
        if method == "POST" and path.endswith("/register"):
            if check_rate_limit(cur, ip, "auth_register", window_sec=60, max_hits=10, block_minutes=15):
                conn.commit()
                return {"statusCode": 429, "headers": CORS, "body": json.dumps({"error": "rate_limited"})}
            username = (body.get("username") or "").strip()
            email    = (body.get("email") or "").strip().lower()
            password = body.get("password") or ""

            if not username or not email or not password:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "missing_fields"})}
            if len(password) < 6:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "password_too_short"})}

            cur.execute(
                f"SELECT id FROM {SCHEMA}.users WHERE LOWER(email)=%s OR LOWER(username)=%s",
                (email, username.lower())
            )
            if cur.fetchone():
                return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "exists"})}

            # Требуем подтверждённый код на email (использован в течение последних 30 минут)
            cur.execute(
                f"""SELECT id FROM {SCHEMA}.email_verifications
                    WHERE email=%s AND used=TRUE AND used_at > NOW() - INTERVAL '30 minutes'
                    ORDER BY used_at DESC LIMIT 1""",
                (email,)
            )
            if not cur.fetchone():
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "email_not_verified"})}

            uid = make_user_id(conn)
            acc_id = make_account_id()
            pw_hash = hash_password(password)
            cur.execute(
                f"""INSERT INTO {SCHEMA}.users
                    (id, account_id, username, email, password_hash, role, verified, balance_rub)
                    VALUES (%s,%s,%s,%s,%s,'user',FALSE,0)""",
                (uid, acc_id, username, email, pw_hash)
            )
            token = make_token()
            cur.execute(
                f"INSERT INTO {SCHEMA}.sessions (token, user_id) VALUES (%s,%s)",
                (token, uid)
            )
            conn.commit()
            return {
                "statusCode": 200, "headers": CORS,
                "body": json.dumps({
                    "token": token,
                    "user": {"id": uid, "accountId": acc_id, "username": username,
                             "email": email, "role": "user", "verified": False,
                             "status": "active", "balance_rub": 0, "locked_rub": 0,
                             "deals_count": 0, "joined_at": datetime.now().strftime("%d.%m.%Y")}
                })
            }

        # ── POST /login ───────────────────────────────────────────────────────
        if method == "POST" and path.endswith("/login"):
            if check_rate_limit(cur, ip, "auth_login", window_sec=60, max_hits=15, block_minutes=15):
                conn.commit()
                return {"statusCode": 429, "headers": CORS, "body": json.dumps({"error": "rate_limited"})}
            login    = (body.get("login") or "").strip().lower()
            password = body.get("password") or ""
            pw_hash  = hash_password(password)

            cur.execute(
                f"""SELECT id,account_id,username,email,role,is_owner,staff_perms,
                           status,freeze_reason,block_reason,verified,
                           balance_rub,locked_rub,deals_count,joined_at
                    FROM {SCHEMA}.users
                    WHERE (LOWER(email)=%s OR LOWER(username)=%s) AND password_hash=%s""",
                (login, login, pw_hash)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "wrong"})}

            cols = ["id","account_id","username","email","role","is_owner","staff_perms",
                    "status","freeze_reason","block_reason","verified",
                    "balance_rub","locked_rub","deals_count","joined_at"]
            user = user_row_to_dict(row, cols)

            if user["status"] == "blocked":
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "blocked", "reason": user.get("block_reason")})}
            if user["status"] == "frozen":
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "frozen", "reason": user.get("freeze_reason")})}

            token = make_token()
            cur.execute(f"INSERT INTO {SCHEMA}.sessions (token, user_id) VALUES (%s,%s)", (token, user["id"]))
            conn.commit()

            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"token": token, "user": user})}

        # ── GET /me ───────────────────────────────────────────────────────────
        if method == "GET" and path.endswith("/me"):
            token = (event.get("headers") or {}).get("X-Session-Token") or \
                    (event.get("queryStringParameters") or {}).get("token")
            if not token:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "no_token"})}

            cur.execute(
                f"""SELECT u.id,u.account_id,u.username,u.email,u.role,u.is_owner,u.staff_perms,
                           u.status,u.freeze_reason,u.block_reason,u.verified,
                           u.balance_rub,u.locked_rub,u.deals_count,u.joined_at,
                           u.perma_banned,u.chat_banned
                    FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id=s.user_id
                    WHERE s.token=%s AND s.expires_at > NOW()""",
                (token,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "invalid_token"})}

            cols = ["id","account_id","username","email","role","is_owner","staff_perms",
                    "status","freeze_reason","block_reason","verified",
                    "balance_rub","locked_rub","deals_count","joined_at",
                    "perma_banned","chat_banned"]
            user = user_row_to_dict(row, cols)
            cur.execute(f"UPDATE {SCHEMA}.users SET last_seen_at=NOW() WHERE id=%s", (user["id"],))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"user": user})}

        # ── POST /heartbeat — обновление статуса "онлайн" (для команды сайта) ───
        if method == "POST" and path.endswith("/heartbeat"):
            token = (event.get("headers") or {}).get("X-Session-Token")
            if not token:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "no_token"})}
            cur.execute(
                f"""SELECT u.id FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id=s.user_id
                    WHERE s.token=%s AND s.expires_at > NOW()""",
                (token,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "invalid_token"})}
            cur.execute(f"UPDATE {SCHEMA}.users SET last_seen_at=NOW() WHERE id=%s", (row[0],))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── GET /team — команда сайта: роли + онлайн-статус (публичный эндпоинт —
        # список видят и гости на главной странице, и админка) ──────────────────
        if method == "GET" and path.endswith("/team"):
            cur.execute(
                f"""SELECT id, username, role, is_owner, last_seen_at
                    FROM {SCHEMA}.users
                    WHERE role IN ('admin','staff') OR is_owner=TRUE
                    ORDER BY is_owner DESC, role, username"""
            )
            team = []
            for uid, uname, role, is_owner, last_seen in cur.fetchall():
                online = bool(last_seen and (datetime.now() - last_seen.replace(tzinfo=None)).total_seconds() < 90)
                team.append({
                    "id": uid, "username": uname, "role": role, "isOwner": is_owner,
                    "online": online,
                    "lastSeen": last_seen.isoformat() if last_seen else None,
                })
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"team": team})}

        # ── POST /logout ──────────────────────────────────────────────────────
        if method == "POST" and path.endswith("/logout"):
            token = (event.get("headers") or {}).get("X-Session-Token")
            if token:
                cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at=NOW() WHERE token=%s", (token,))
                conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}

    except Exception as e:
        conn.rollback()
        return {"statusCode": 500, "headers": CORS, "body": json.dumps({"error": str(e)})}
    finally:
        conn.close()