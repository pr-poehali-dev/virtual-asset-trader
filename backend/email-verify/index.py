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
    # Приложение должно быть настроено с переменной окружения EMAIL_PASSWORD
    raise EnvironmentError("EMAIL_PASSWORD environment variable not set.")

CODE_LIFETIME_MINUTES = 10
RESEND_INTERVAL_SECONDS = 60

# --- CORS ---
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}

# --- Функции базы данных ---
def get_conn():
    """Получает соединение с базой данных PostgreSQL."""
    try:
        conn = psycopg2.connect(os.environ["DATABASE_URL"])
        conn.autocommit = False
        return conn
    except psycopg2.OperationalError as e:
        print(f"Database connection error: {e}")
        raise

# --- Функции отправки email ---
def send_email(to: str, code: str):
    """Отправляет email с кодом подтверждения на указанный адрес."""
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
        print(f"Email sent successfully to {to}")
    except smtplib.SMTPAuthenticationError:
        print("SMTP Authentication Error: Check FROM_EMAIL and SENDER_PASSWORD (or App Password).")
        raise
    except smtplib.SMTPRecipientsRefused as e:
        print(f"SMTP Recipients Refused: {e}. Check if the 'to' address is valid.")
        raise
    except Exception as e:
        print(f"Generic error sending email to {to}: {e}")
        raise

# --- Основная функция обработчика запросов ---
def handler(event: dict, context) -> dict:
    """Обрабатывает HTTP-запросы для отправки и проверки кодов подтверждения email."""
    headers = CORS.copy() # Копируем CORS заголовки для каждого ответа

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

        # --- POST /email-verify/send — отправить код ---
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
            expires_at = datetime.utcnow() + timedelta(minutes=CODE_LIFETIME_MINUTES)

            cur.execute(
                f"DELETE FROM {SCHEMA}.email_verifications WHERE email=%s AND used=FALSE AND expires_at <= NOW()",
                (email,)
            )
            cur.execute(
                f"INSERT INTO {SCHEMA}.email_verifications (email, code, expires_at) VALUES (%s, %s, %s)",
                (email, code, expires_at)
            )
            conn.commit()

            try:
                send_email(email, code)
            except Exception: # Ловим общую ошибку, так как send_email уже логирует детали
                conn.rollback()
                return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": "send_failed"})}

            return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

        # --- POST /email-verify/verify — проверить код ---
        elif method == "POST" and path.endswith("/verify"):
            email = (body.get("email") or "").strip().lower()
            code = (body.get("code") or "").strip()

            if not email or not code:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "missing_email_or_code"})}

            cur.execute(
                f"SELECT id, expires_at FROM {SCHEMA}.email_verifications WHERE email=%s AND code=%s AND used=FALSE AND expires_at > NOW()",
                (email, code)
            )
            verification_record = cur.fetchone()

            # --- ОТЛАДОЧНЫЙ ВЫВОД ДОБАВЛЕН СЮДА ---
            if verification_record:
                verification_id, expires_at = verification_record
                print(f"Verification record found: ID={verification_id}, Expires at={expires_at}")
            else:
                print("No verification record found for the given email and code.")
            # --- КОНЕЦ ОТЛАДОЧНОГО ВЫВОДА ---

            if not verification_record:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "invalid_code"})}

            verification_id, _ = verification_record # expires_at не используется далее

            cur.execute(
                f"UPDATE {SCHEMA}.email_verifications SET used=TRUE, used_at=NOW() WHERE id=%s",
                (verification_id,)
            )
            conn.commit()

            return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

        else:
            return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "not_found"})}

    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        print(f"Database error: {e}")
        return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": "database_error", "detail": str(e)})}
    except EnvironmentError as e: # Обработка ошибки отсутствия EMAIL_PASSWORD
        print(f"Configuration error: {e}")
        return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": "configuration_error", "detail": str(e)})}
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"An unexpected error occurred: {e}")
        return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": "internal_server_error", "detail": str(e)})}
    finally:
        if conn:
            conn.close()