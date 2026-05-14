# --- Конфигурация ---
# Получаем схему из переменной окружения или используем значение по умолчанию
import os
import secrets
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import psycopg2

# --- Конфигурация ---
SCHEMA = os.environ.get("MAIN_DB_SCHEMA") or "t_p38600009_virtual_asset_trader"

# Email отправителя и данные для SMTP
FROM_EMAIL = "gorant.shop-supp0rt@yandex.ru"
SMTP_HOST = "smtp.yandex.ru"
SMTP_PORT = 465
SENDER_PASSWORD = os.environ.get("VERIFYEMAIL")

if not SENDER_PASSWORD:
    # В продакшене лучше использовать более надежный механизм логирования и обработки ошибок
    # Например, AWS CloudWatch Logs
    raise EnvironmentError("VERIFYEMAIL environment variable not set.")

# Время жизни кода в минутах
CODE_LIFETIME_MINUTES = 10
# Интервал между повторными запросами кода (в секундах)
RESEND_INTERVAL_SECONDS = 60

# --- CORS ---
# Настройки CORS для доступа к API
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
    "Content-Type": "application/json" # Добавлен Content-Type для JSON ответов
}

def get_conn():
    """Устанавливает соединение с базой данных PostgreSQL."""
    try:
        conn = psycopg2.connect(os.environ["DATABASE_URL"])
        conn.autocommit = False  # Отключаем автокоммит для управления транзакциями
        return conn
    except psycopg2.OperationalError as e:
        print(f"Database connection error: {e}")
        # В продакшене лучше использовать AWS CloudWatch Logs
        raise ConnectionError(f"Failed to connect to database: {e}") from e

def send_email(conn, cur, to: str, code: str):
    """Отправляет email с кодом подтверждения и обрабатывает ошибки."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Код подтверждения — Gorant Shop"
    msg["From"] = FROM_EMAIL
    msg["To"] = to

    # HTML-шаблон письма
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
        print(f"Письмо с кодом успешно отправлено на {to}")
        return True # Успешная отправка
    except Exception as e:
        print(f"Error sending email to {to}: {e}")
        # Откат транзакции, если код был сохранен, но письмо не отправлено
        conn.rollback()
        return False # Ошибка отправки

def handler(event: dict, context) -> dict:
    """Обработчик AWS Lambda для API запросов."""
    headers = CORS.copy()
    conn = None # Инициализируем conn как None
    cur = None  # Инициализируем cur как None

    # Обработка OPTIONS запросов для CORS preflight
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": json.dumps({})} # Возвращаем пустой JSON

    method = event.get("httpMethod", "POST")
    qs = event.get("queryStringParameters") or {}
    # Получаем путь запроса, предпочтительно из _path, если есть, иначе из path, по умолчанию "/"
    path = qs.get("_path") or event.get("path") or "/"

    body = {}
    # Парсинг тела запроса, если оно есть
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except json.JSONDecodeError:
            return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "invalid_json_body"})}

    try:
        conn = get_conn()
        cur = conn.cursor()

        # --- ОТПРАВКА КОДА ПОДТВЕРЖДЕНИЯ (/send) ---
        if method == "POST" and path.endswith("/send"):
            email = (body.get("email") or "").strip().lower()
            # Валидация email
            if not email or "@" not in email:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "invalid_email"})}

            # Проверка, существует ли уже такой email в таблице users
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE LOWER(email)=%s", (email,))
            if cur.fetchone():
                return {"statusCode": 409, "headers": headers, "body": json.dumps({"error": "email_taken"})}

            # Проверка интервала повторной отправки
            cur.execute(
                # Используем параметризованный запрос для INTERVAL, если возможно, или оставляем f-string для числа
                # В данном случае, для числового INTERVAL, f-string безопасен.
                f"SELECT COUNT(*) FROM {SCHEMA}.email_verifications WHERE email=%s AND created_at > NOW() - INTERVAL '{RESEND_INTERVAL_SECONDS} seconds'",
                (email,)
            )
            if cur.fetchone()[0] > 0:
                return {"statusCode": 429, "headers": headers, "body": json.dumps({"error": "too_soon"})}

            # Генерация и сохранение кода
            code = str(secrets.randbelow(900000) + 100000) # 6-значный код

            # Вставка кода в БД
            cur.execute(
                # Используем f-string для INTERVAL, если ваша БД не поддерживает параметризацию для него.
                # Убедитесь, что CODE_LIFETIME_MINUTES - это число.
                f"INSERT INTO {SCHEMA}.email_verifications (email, code, expires_at) VALUES (%s, %s, NOW() + INTERVAL '{CODE_LIFETIME_MINUTES} minutes')",
                (email, code)
            )
            conn.commit() # Коммит транзакции после успешной вставки

            # Отправка email
            if not send_email(conn, cur, email, code): # send_email теперь сам делает rollback при ошибке
                 # Если send_email вернул False, значит, он уже сделал rollback
                 return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": "email_sending_failed"})}

            # Успешный ответ клиенту
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"message": "Код подтверждения отправлен на вашу почту."})}

        # --- ПРОВЕРКА КОДА ПОДТВЕРЖДЕНИЯ (/verify или /check) ---
        elif method == "POST" and (path.endswith("/verify") or path.endswith("/check")):
            email = (body.get("email") or "").strip().lower()
            code = (body.get("code") or "").strip()

            # Валидация входных данных
            if not email or not code:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "missing_email_or_code"})}

            # Поиск неиспользованного и действительного кода
            # Убедитесь, что в таблице email_verifications есть столбцы: id, email, code, used (BOOLEAN), expires_at, created_at
            cur.execute(
                f"SELECT id FROM {SCHEMA}.email_verifications WHERE email=%s AND code=%s AND used=FALSE AND expires_at > NOW()",
                (email, code)
            )
            verification_record = cur.fetchone()

            # Если код не найден или недействителен
            if not verification_record:
                print(f"Verification failed for {email} with code {code}: Code not found or invalid.")
                return {"statusCode": 200, "headers": headers, "body": json.dumps({"verified": False, "error": "invalid_code"})}

            verification_id = verification_record[0]

            # Пометка кода как использованного
            cur.execute(
                "UPDATE {}.email_verifications SET used=TRUE, used_at=NOW() WHERE id=%s".format(SCHEMA),
                (verification_id,)
            )
            conn.commit() # Коммит транзакции после успешного обновления

            print(f"Verification successful for {email} with code {code}")
            # Возвращаем подтверждение успешной верификации
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"verified": True, "ok": True})}

        else:
            # Если путь или метод не поддерживается
            return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "not_found"})}

    except ConnectionError as e:
        # Ошибка подключения к БД
        print(f"Database connection error handler: {e}")
        return {"statusCode": 503, "headers": headers, "body": json.dumps({"error": "database_unavailable"})}
    except Exception as e:
        # Обработка прочих ошибок
        if conn:
            conn.rollback() # Откат транзакции при любой ошибке, если соединение установлено
        print(f"General error handler: {e}")
        # В продакшене лучше логировать полный traceback
        return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": "internal_error", "detail": str(e)})}
    finally:
        # Закрытие соединения с БД
        if cur:
            cur.close() # Закрываем курсор
        if conn:
            conn.close() # Закрываем соединение