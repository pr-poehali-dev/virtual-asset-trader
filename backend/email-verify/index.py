"""
Подтверждение email при регистрации: отправка кода и его проверка.
"""
import json, os, secrets, smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA") or "t_p38600009_virtual_asset_trader"
FROM_EMAIL = "gorant.shop-supp0rt@yandex.ru"
SMTP_HOST  = "smtp.yandex.ru"
SMTP_PORT  = 465
SENDER_PASSWORD = "XZc-G7F-SJL-tA6"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}

def get_conn():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = False
    return conn

def send_email(to: str, code: str):
    password = os.environ.get("EMAIL_PASSWORD", "")
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Код подтверждения — Gorant Shop"
    msg["From"] = FROM_EMAIL
    msg["To"] = to

    html = f"""
    <div style="font-family:Arial,sans-serif;background:#0e0e0e;padding:40px;border-radius:12px;max-width:480px;margin:auto">
      <h2 style="color:#c9a227;font-size:22px;margin-bottom:8px">Gorant Shop</h2>
      <p style="color:#aaa;font-size:14px;margin-bottom:24px">Подтверждение регистрации</p>
      <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px">
        <p style="color:#888;font-size:12px;margin-bottom:8px">Ваш код подтверждения</p>
        <span style="font-size:36px;font-weight:bold;color:#c9a227;letter-spacing:8px">{code}</span>
        <p style="color:#555;font-size:11px;margin-top:12px">Действует 10 минут</p>
      </div>
      <p style="color:#666;font-size:12px">Если вы не регистрировались на Gorant Shop — просто проигнорируйте это письмо.</p>
    </div>
    """
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
        server.login(FROM_EMAIL, password)
        server.sendmail(FROM_EMAIL, to, msg.as_string())

def handler(event: dict, context) -> dict:
    """Отправка и проверка кода подтверждения email."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "POST")
    qs   = event.get("queryStringParameters") or {}
    path = qs.get("_path") or event.get("path") or "/"
    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass

    conn = get_conn()
    try:
        cur = conn.cursor()

        # ── POST /email-verify/send — отправить код ──────────────────────────
        if method == "POST" and path.endswith("/send"):
            email = (body.get("email") or "").strip().lower()
            if not email or "@" not in email:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_email"})}

            # Проверяем не занята ли почта
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE LOWER(email)=%s", (email,))
            if cur.fetchone():
                return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "email_taken"})}

            # Лимит: не чаще 1 раза в 60 секунд
            cur.execute(
                f"SELECT COUNT(*) FROM {SCHEMA}.email_verifications WHERE email=%s AND created_at > NOW() - INTERVAL '60 seconds'",
                (email,)
            )
            if cur.fetchone()[0] > 0:
                return {"statusCode": 429, "headers": CORS, "body": json.dumps({"error": "too_soon"})}

            code = str(secrets.randbelow(900000) + 100000)  # 6 цифр
            cur.execute(
                f"INSERT INTO {SCHEMA}.email_verifications (email, code) VALUES (%s, %s)",
                (email, code)
            )
            conn.commit()

            try:
                send_email(email, code)
            except Exception as e:
                return {"statusCode": 500, "headers": CORS, "body": json.dumps({"error": "send_failed", "detail": str(e)})}

            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── POST /email-verify/check — проверить код ─────────────────────────
        if method == "POST" and path.endswith("/check"):
            email = (body.get("email") or "").strip().lower()
            code  = (body.get("code") or "").strip()
            if not email or not code:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "missing_fields"})}

            cur.execute(
                f"""SELECT id FROM {SCHEMA}.email_verifications
                    WHERE email=%s AND code=%s AND used=FALSE AND expires_at > NOW()
                    ORDER BY created_at DESC LIMIT 1""",
                (email, code)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_code"})}

            # Помечаем использованным
            cur.execute(f"UPDATE {SCHEMA}.email_verifications SET used=TRUE WHERE id=%s", (row[0],))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "verified": True})}

        return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}

    finally:
        conn.close()