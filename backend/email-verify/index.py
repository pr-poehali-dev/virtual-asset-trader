"""
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
CODE_LIFETIME_MINUTES = 10
RESEND_INTERVAL_SECONDS = 60
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}
def get_conn():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    return conn
def send_email(to: str, code: str):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"{code} — код подтверждения Gorant Shop"
    msg["From"] = FROM_EMAIL
    msg["To"] = to
    html = f"<div style='background:#000;color:#fff;padding:20px;'>Код: <b>{code}</b></div>"
    msg.attach(MIMEText(html, "html"))
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
        server.login(FROM_EMAIL, SENDER_PASSWORD)
        server.sendmail(FROM_EMAIL, to, msg.as_string())
def handler(event: dict, context) -> dict:
    headers = CORS.copy()
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}
    path = (event.get("path") or "").lower()
    # Если путь пустой, пробуем взять из параметров (для некоторых прокси)
    if not path or path == "/":
        qs = event.get("queryStringParameters") or {}
        path = (qs.get("_path") or "").lower()
    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except: pass
    conn = get_conn()
    cur = conn.cursor()
    try:
        # --- ОТПРАВКА (поддерживает /send) ---
        if "/send" in path:
            email = (body.get("email") or "").strip().lower()
            if not email: return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "no_email"})}
            
            code = str(secrets.randbelow(900000) + 100000)
            cur.execute(f"INSERT INTO {SCHEMA}.email_verifications (email, code, expires_at) VALUES (%s, %s, NOW() + INTERVAL '10 minutes')", (email, code))
            conn.commit()
            send_email(email, code)
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}
        # --- ПРОВЕРКА (поддерживает /check и /verify) ---
        elif "/check" in path or "/verify" in path:
            email = (body.get("email") or "").strip().lower()
            code = (body.get("code") or "").strip()
            # Ищем последнюю активную запись
            cur.execute(
                f"SELECT id FROM {SCHEMA}.email_verifications WHERE email=%s AND code=%s AND used=FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
                (email, code)
            )
            res = cur.fetchone()
            if res:
                cur.execute(f"UPDATE {SCHEMA}.email_verifications SET used=TRUE, used_at=NOW() WHERE id=%s", (res[0],))
                conn.commit()
                # Возвращаем ОБА варианта ответа для надежности
                return {"statusCode": 200, "headers": headers, "body": json.dumps({"verified": True, "ok": True})}
            else:
                return {"statusCode": 200, "headers": headers, "body": json.dumps({"verified": False, "ok": False, "error": "invalid_code"})}
        return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "not_found", "path": path})}
    except Exception as e:
        return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": str(e)})}
    finally:
        cur.close()
        conn.close()