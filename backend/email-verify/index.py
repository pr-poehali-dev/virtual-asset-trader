"""
# --- Конфигурация ---
# Получаем имя схемы из переменной окружения, если не установлено, используем значение по умолчанию
import json
import os
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import psycopg2
from datetime import datetime, timedelta
# --- Конфигурация ---
SCHEMA = os.environ.get("MAIN_DB_SCHEMA") or "t_p38600009_virtual_asset_trader"
FROM_EMAIL = "gorant.shop-supp0rt@yandex.ru"
SMTP_HOST = "smtp.yandex.ru"
SMTP_PORT = 465
SENDER_PASSWORD = os.environ.get("EMAIL_PASSWORD")
if not SENDER_PASSWORD:
    raise EnvironmentError("EMAIL_PASSWORD environment variable not set.")
CODE_LIFETIME_MINUTES = 10
RESEND_INTERVAL_SECONDS = 60
# --- CORS ---
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}
def get_conn():
    try:
        conn = psycopg2.connect(os.environ["DATABASE_URL"])
        conn.autocommit = False
        return conn
    except psycopg2.OperationalError as e:
        print(f"Database connection error: {e}")
        raise
def send_email(to: str, code: str):
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
        <p style="color:#555;font-size:11px;margin-top:12px">Действует {CODE_LIFETIME_MINUTES} минут</p>
      </div>
      <p style="color:#666;font-size:12px">Если вы не регистрировались на Gorant Shop — просто проигнорируйте это письмо.</p>
    </div>
    """
    msg.attach(MIMEText(html, "html"))
    try:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
            server.login(FROM_EMAIL, SENDER_PASSWORD)
            server.sendmail(FROM_EMAIL, to, msg.as_string())
    except Exception as e:
        print(f"Error sending email: {e}")
        raise
def handler(event: dict, context) -> dict:
    headers = CORS.copy()
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}
    method = event.get("httpMethod", "POST")
    qs = event.get("queryStringParameters") or {}
    path = qs.get("_path") or event.get("path") or "/"
    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except json.JSONDecodeError:
            return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "invalid_json_body"})}
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor()
        # --- ОТПРАВКА КОДА ---
        if method == "POST" and path.endswith("/send"):
            email = (body.get("email") or "").strip().lower()
            if not email or "@" not in email:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "invalid_email"})}
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE LOWER(email)=%s", (email,))
            if cur.fetchone():
                return {"statusCode": 409, "headers": headers, "body": json.dumps({"error": "email_taken"})}
            cur.execute(
                f"SELECT COUNT(*) FROM {SCHEMA}.email_verifications WHERE email=%s AND created_at > NOW() - INTERVAL '{RESEND_INTERVAL_SECONDS} seconds'",
                (email,)
            )
            if cur.fetchone()[0] > 0:
                return {"statusCode": 429, "headers": headers, "body": json.dumps({"error": "too_soon"})}
            code = str(secrets.randbelow(900000) + 100000)
            # Используем NOW() + интервал для БД, чтобы не было конфликта часовых поясов
            cur.execute(
                f"INSERT INTO {SCHEMA}.email_verifications (email, code, expires_at) VALUES (%s, %s, NOW() + INTERVAL '{CODE_LIFETIME_MINUTES} minutes')",
                (email, code)
            )
            conn.commit()
            try:
                send_email(email, code)
            except Exception:
                conn.rollback()
                return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": "send_failed"})}
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}
        # --- ПРОВЕРКА КОДА (Исправлено: добавлен путь /check) ---
        elif method == "POST" and (path.endswith("/verify") or path.endswith("/check")):
            email = (body.get("email") or "").strip().lower()
            code = (body.get("code") or "").strip()
            if not email or not code:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "missing_email_or_code"})}
            # Проверяем код, который не использован и срок которого не истек
            cur.execute(
                f"SELECT id FROM {SCHEMA}.email_verifications WHERE email=%s AND code=%s AND used=FALSE AND expires_at > NOW()",
                (email, code)
            )
            verification_record = cur.fetchone()
            if not verification_record:
                print(f"Verification failed for {email} with code {code}")
                return {"statusCode": 200, "headers": headers, "body": json.dumps({"verified": False, "error": "invalid_code"})}
            verification_id = verification_record[0]
            cur.execute(
                f"UPDATE {SCHEMA}.email_verifications SET used=TRUE, used_at=NOW() WHERE id=%s",
                (verification_id,)
            )
            conn.commit()
            # Возвращаем verified: True, так как фронтенд ждет именно это поле
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"verified": True, "ok": True})}
        else:
            return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "not_found"})}
    except Exception as e:
        if conn: conn.rollback()
        print(f"Error: {e}")
        return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": "internal_error", "detail": str(e)})}
    finally:
        if conn: conn.close()