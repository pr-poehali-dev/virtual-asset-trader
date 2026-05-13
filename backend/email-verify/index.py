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
# Получаем имя схемы из переменной окружения, если не установлено, используем значение по умолчанию
SCHEMA = os.environ.get("MAIN_DB_SCHEMA") or "t_p38600009_virtual_asset_trader"
# Адрес отправителя электронной почты
FROM_EMAIL = "gorant.shop-supp0rt@yandex.ru"  # Убедитесь, что этот email существует и настроен
# Настройки SMTP-сервера Yandex
SMTP_HOST = "smtp.yandex.ru"
SMTP_PORT = 465

SENDER_PASSWORD = os.environ.get("EMAIL_PASSWORD")
if not SENDER_PASSWORD:
    raise EnvironmentError("EMAIL_PASSWORD environment variable not set.")

# Время жизни кода подтверждения (в минутах)
CODE_LIFETIME_MINUTES = 10
# Интервал между отправками кода на один email (в секундах)
RESEND_INTERVAL_SECONDS = 60

# --- CORS (Cross-Origin Resource Sharing) ---
# Настройки для разрешения кросс-доменных запросов
CORS = {
    "Access-Control-Allow-Origin": "*",  # Разрешить запросы с любого домена
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",  # Разрешенные HTTP-методы
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",  # Разрешенные заголовки
}

# --- Функции базы данных ---
def get_conn():
    """
    Получает соединение с базой данных PostgreSQL.
    Использует переменную окружения DATABASE_URL для подключения.
    """
    try:
        # Подключение к базе данных с использованием URL из переменной окружения
        conn = psycopg2.connect(os.environ["DATABASE_URL"])
        # Отключение автокоммита, чтобы управлять транзакциями вручную
        conn.autocommit = False
        return conn
    except psycopg2.OperationalError as e:
        # Обработка ошибок подключения к базе данных
        print(f"Database connection error: {e}")
        raise  # Перебрасываем исключение для дальнейшей обработки

# --- Функции отправки email ---
def send_email(to: str, code: str):
    """
    Отправляет email с кодом подтверждения на указанный адрес.
    Использует SMTP-сервер Yandex.
    """
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
            # Используем переменную SENDER_PASSWORD, полученную из переменной окружения
            server.login(FROM_EMAIL, SENDER_PASSWORD)
            server.sendmail(FROM_EMAIL, to, msg.as_string())
        print(f"Email sent successfully to {to}")
    except Exception as e:
        print(f"Error sending email to {to}: {e}")
        raise  # Перебрасываем исключение для дальнейшей обработки

# --- Основная функция обработчика запросов ---
def handler(event: dict, context) -> dict:
    """
    Обрабатывает входящие HTTP-запросы для отправки и проверки кодов подтверждения email.
    Поддерживает метод OPTIONS для CORS и методы POST/GET для операций с кодами.
    """
    # Обработка OPTIONS-запросов для CORS
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    # Определение HTTP-метода запроса
    method = event.get("httpMethod", "POST")
    # Получение параметров запроса (query string)
    qs = event.get("queryStringParameters") or {}
    # Определение пути запроса
    path = qs.get("_path") or event.get("path") or "/"
    # Парсинг тела запроса, если оно есть
    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except json.JSONDecodeError:
            # Возврат ошибки 400 при некорректном JSON в теле запроса
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_json_body"})}

    conn = None  # Инициализация переменной соединения с БД
    try:
        # Получение соединения с базой данных
        conn = get_conn()
        cur = conn.cursor()  # Создание курсора для выполнения SQL-запросов

        # --- POST /email-verify/send — отправить код ---
        if method == "POST" and path.endswith("/send"):
            # Получение и очистка email из тела запроса
            email = (body.get("email") or "").strip().lower()
            # Проверка корректности формата email
            if not email or "@" not in email:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_email"})}

            # Проверка, существует ли уже пользователь с таким email в базе данных
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE LOWER(email)=%s", (email,))
            if cur.fetchone():
                # Если пользователь существует, возвращаем ошибку 409 (Conflict)
                return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "email_taken"})}

            # Проверка, не отправляли ли код слишком недавно на этот email
            cur.execute(
                f"SELECT COUNT(*) FROM {SCHEMA}.email_verifications WHERE email=%s AND created_at > NOW() - INTERVAL '{RESEND_INTERVAL_SECONDS} seconds'",
                (email,)
            )
            if cur.fetchone()[0] > 0:
                # Если код был отправлен недавно, возвращаем ошибку 429 (Too Many Requests)
                return {"statusCode": 429, "headers": CORS, "body": json.dumps({"error": "too_soon"})}

            # Генерация случайного 6-значного кода подтверждения
            code = str(secrets.randbelow(900000) + 100000)
            # Расчет времени истечения кода
            expires_at = datetime.utcnow() + timedelta(minutes=CODE_LIFETIME_MINUTES)

            # Удаление старых неиспользованных кодов для этого email перед вставкой нового
            cur.execute(
                f"DELETE FROM {SCHEMA}.email_verifications WHERE email=%s AND used=FALSE AND expires_at <= NOW()",
                (email,)
            )

            # Вставка нового кода подтверждения в базу данных
            cur.execute(
                f"INSERT INTO {SCHEMA}.email_verifications (email, code, expires_at) VALUES (%s, %s, %s)",
                (email, code, expires_at)
            )
            # Фиксация транзакции в базе данных
            conn.commit()

            try:
                # Отправка email с кодом подтверждения
                send_email(email, code)
            except Exception as e:
                # Если отправка email не удалась, откатываем транзакцию и возвращаем ошибку
                conn.rollback()
                print(f"Email sending failed for {email}, rolling back transaction: {e}")
                return {"statusCode": 500, "headers": CORS, "body": json.dumps({"error": "send_failed", "detail": str(e)})}

            # Успешная отправка кода
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # --- POST /email-verify/verify — проверить код ---
        elif method == "POST" and path.endswith("/verify"):
            email = (body.get("email") or "").strip().lower()
            code = (body.get("code") or "").strip()

            # Проверка наличия email и кода в теле запроса
            if not email or not code:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "missing_email_or_code"})}

            # Поиск кода подтверждения в базе данных
            cur.execute(
                f"SELECT id, expires_at FROM {SCHEMA}.email_verifications WHERE email=%s AND code=%s AND used=FALSE AND expires_at > NOW()",
                (email, code)
            )
            verification_record = cur.fetchone()

            # Если код не найден или истек
            if not verification_record:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_code"})}

            verification_id, expires_at = verification_record

            # Обновление записи о верификации, помечая код как использованный
            cur.execute(
                f"UPDATE {SCHEMA}.email_verifications SET used=TRUE, used_at=NOW() WHERE id=%s",
                (verification_id,)
            )
            # Фиксация транзакции
            conn.commit()

            # Успешная проверка кода
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # Если путь или метод не поддерживаются
        else:
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}

    except psycopg2.Error as e:
        # Обработка ошибок базы данных
        if conn:
            conn.rollback()  # Откат транзакции при ошибке БД
        print(f"Database error: {e}")
        return {"statusCode": 500, "headers": CORS, "body": json.dumps({"error": "database_error", "detail": str(e)})}
    except Exception as e:
        # Обработка общих ошибок
        if conn:
            conn.rollback()  # Откат транзакции при общей ошибке
        print(f"An unexpected error occurred: {e}")
        return {"statusCode": 500, "headers": CORS, "body": json.dumps({"error": "internal_server_error", "detail": str(e)})}
    finally:
          if conn:
             conn.close()