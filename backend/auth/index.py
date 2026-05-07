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

    conn = get_conn()
    try:
        cur = conn.cursor()

        # ── POST /register ────────────────────────────────────────────────────
        if method == "POST" and path.endswith("/register"):
            username = (body.get("username") or "").strip()
            email    = (body.get("email") or "").strip().lower()
            password = body.get("password") or ""

            if not username or not email or not password:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "missing_fields"})}
            if len(password) < 6:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "password_too_short"})}

            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE email=%s OR username=%s", (email, username))
            if cur.fetchone():
                return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "exists"})}

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
                           u.balance_rub,u.locked_rub,u.deals_count,u.joined_at
                    FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id=s.user_id
                    WHERE s.token=%s AND s.expires_at > NOW()""",
                (token,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "invalid_token"})}

            cols = ["id","account_id","username","email","role","is_owner","staff_perms",
                    "status","freeze_reason","block_reason","verified",
                    "balance_rub","locked_rub","deals_count","joined_at"]
            user = user_row_to_dict(row, cols)
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"user": user})}

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