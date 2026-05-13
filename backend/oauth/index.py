"""
OAuth авторизация через Google и ВКонтакте.
Обменивает code на токен, получает профиль пользователя,
создаёт или находит аккаунт и возвращает сессионный токен.
"""
import json, os, secrets, hashlib, time, random, string
import psycopg2
import urllib.request
import urllib.parse

SCHEMA = os.environ.get("MAIN_DB_SCHEMA") or "t_p38600009_virtual_asset_trader"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}

GOOGLE_CLIENT_ID     = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")


def get_conn():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = False
    return conn


def make_token():
    return secrets.token_hex(32)


def make_account_id():
    ts   = format(int(time.time()), 'x').upper()
    rand = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"GS-{ts}-{rand}"


def make_user_id(conn):
    cur = conn.cursor()
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users")
    count = cur.fetchone()[0]
    return f"u-{str(count + 1).zfill(3)}"


def http_get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "GorantShop/1.0"})
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read().decode())


def http_post(url, data: dict):
    payload = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(url, data=payload, headers={
        "User-Agent": "GorantShop/1.0",
        "Content-Type": "application/x-www-form-urlencoded",
    })
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read().decode())


def find_or_create_user(conn, provider: str, provider_id: str, email: str, name: str) -> dict:
    cur = conn.cursor()

    # Ищем по provider_id
    cur.execute(
        f"SELECT id, account_id, username, email, role, is_owner, staff_perms, status, "
        f"freeze_reason, block_reason, verified, balance_rub, locked_rub, deals_count, joined_at "
        f"FROM {SCHEMA}.users WHERE oauth_provider=%s AND oauth_id=%s",
        (provider, provider_id)
    )
    row = cur.fetchone()

    if row:
        cols = ["id","account_id","username","email","role","is_owner","staff_perms",
                "status","freeze_reason","block_reason","verified",
                "balance_rub","locked_rub","deals_count","joined_at"]
        user = dict(zip(cols, row))
        user["balance_rub"] = float(user.get("balance_rub", 0))
        user["locked_rub"]  = float(user.get("locked_rub", 0))
        if user.get("joined_at"):
            user["joined_at"] = user["joined_at"].strftime("%d.%m.%Y")
        return user

    # Если есть аккаунт с таким email — привязываем провайдера
    if email:
        cur.execute(
            f"SELECT id FROM {SCHEMA}.users WHERE LOWER(email)=%s",
            (email.lower(),)
        )
        existing = cur.fetchone()
        if existing:
            cur.execute(
                f"UPDATE {SCHEMA}.users SET oauth_provider=%s, oauth_id=%s WHERE id=%s",
                (provider, provider_id, existing[0])
            )
            conn.commit()
            cur.execute(
                f"SELECT id, account_id, username, email, role, is_owner, staff_perms, "
                f"status, freeze_reason, block_reason, verified, balance_rub, locked_rub, deals_count, joined_at "
                f"FROM {SCHEMA}.users WHERE id=%s",
                (existing[0],)
            )
            row = cur.fetchone()
            cols = ["id","account_id","username","email","role","is_owner","staff_perms",
                    "status","freeze_reason","block_reason","verified",
                    "balance_rub","locked_rub","deals_count","joined_at"]
            user = dict(zip(cols, row))
            user["balance_rub"] = float(user.get("balance_rub", 0))
            user["locked_rub"]  = float(user.get("locked_rub", 0))
            if user.get("joined_at"):
                user["joined_at"] = user["joined_at"].strftime("%d.%m.%Y")
            return user

    # Создаём нового пользователя
    uid    = make_user_id(conn)
    acc_id = make_account_id()

    # Генерируем уникальный username из имени
    base_username = (name or "user").lower().replace(" ", "_")[:20]
    base_username = ''.join(c for c in base_username if c.isalnum() or c == '_') or "user"
    username = base_username
    suffix   = 1
    while True:
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE username=%s", (username,))
        if not cur.fetchone():
            break
        username = f"{base_username}{suffix}"
        suffix  += 1

    cur.execute(
        f"""INSERT INTO {SCHEMA}.users
            (id, account_id, username, email, password_hash, role, verified,
             balance_rub, oauth_provider, oauth_id)
            VALUES (%s,%s,%s,%s,%s,'user',TRUE,0,%s,%s)""",
        (uid, acc_id, username, email or "", "", provider, provider_id)
    )
    conn.commit()

    return {
        "id": uid, "account_id": acc_id, "username": username,
        "email": email or "", "role": "user", "is_owner": False,
        "staff_perms": None, "status": "active", "freeze_reason": None,
        "block_reason": None, "verified": True,
        "balance_rub": 0.0, "locked_rub": 0.0, "deals_count": 0,
        "joined_at": time.strftime("%d.%m.%Y"),
    }


def handler(event: dict, context) -> dict:
    """OAuth вход через Google или ВКонтакте."""
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

    # ── POST /oauth/google ────────────────────────────────────────────────────
    if path.endswith("/google"):
        code         = body.get("code", "")
        redirect_uri = body.get("redirect_uri", "")
        if not code:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "missing_code"})}

        try:
            token_data = http_post("https://oauth2.googleapis.com/token", {
                "code":          code,
                "client_id":     GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri":  redirect_uri,
                "grant_type":    "authorization_code",
            })
        except Exception as e:
            return {"statusCode": 502, "headers": CORS, "body": json.dumps({"error": "google_token_failed", "detail": str(e)})}

        access_token = token_data.get("access_token")
        if not access_token:
            return {"statusCode": 502, "headers": CORS, "body": json.dumps({"error": "no_access_token"})}

        try:
            profile = http_get(f"https://www.googleapis.com/oauth2/v2/userinfo?access_token={access_token}")
        except Exception as e:
            return {"statusCode": 502, "headers": CORS, "body": json.dumps({"error": "google_profile_failed", "detail": str(e)})}

        provider_id = str(profile.get("id", ""))
        email       = profile.get("email", "")
        name        = profile.get("name", profile.get("given_name", ""))

        conn = get_conn()
        try:
            user  = find_or_create_user(conn, "google", provider_id, email, name)
            if user.get("status") == "blocked":
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "blocked", "reason": user.get("block_reason")})}
            token = make_token()
            cur   = conn.cursor()
            cur.execute(f"INSERT INTO {SCHEMA}.sessions (token, user_id) VALUES (%s,%s)", (token, user["id"]))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"token": token, "user": user})}
        finally:
            conn.close()

    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}