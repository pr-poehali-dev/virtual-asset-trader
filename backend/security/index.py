"""
Защита чувствительных действий одноразовыми кодами на email ("тикеты безопасности"):
- Вывод средств: код обязателен всегда.
- Крупные траты на сайте (покупка/ставка свыше 3000 ₽): код запрашивается один раз в календарный месяц.
Каждое такое действие логируется. Также отдаёт журнал безопасности и список заблокированных IP для админки.
"""
import json, os, secrets, smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA") or "t_p38600009_virtual_asset_trader"
PLATFORM_COMMISSION = 7
WITHDRAW_FEE_FIXED = 50  # фиксированная комиссия за вывод средств, ₽
BIG_SPEND_THRESHOLD = 3000
CODE_LIFETIME_MINUTES = 10
MAX_ATTEMPTS = 5

FROM_EMAIL = "gorant.shop-supp0rt@yandex.ru"
SMTP_HOST = "smtp.yandex.ru"
SMTP_PORT = 465
SENDER_PASSWORD = os.environ.get("VERIFYEMAIL")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}

def get_conn():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = False
    return conn

def get_client_ip(event):
    return (event.get("requestContext") or {}).get("identity", {}).get("sourceIp") or "unknown"

def get_user_by_token(cur, token):
    if not token:
        return None
    cur.execute(
        f"""SELECT u.id, u.username, u.email, u.balance_rub, u.role, u.is_owner, u.status
            FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id=s.user_id
            WHERE s.token=%s AND s.expires_at > NOW()""",
        (token,)
    )
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "username": row[1], "email": row[2], "balance_rub": float(row[3]),
            "role": row[4], "is_owner": row[5], "status": row[6]}

def is_staff(user):
    return bool(user) and (user["role"] in ("admin", "staff") or user.get("is_owner"))

def is_ip_blocked(cur, ip):
    cur.execute(f"SELECT blocked_until FROM {SCHEMA}.blocked_ips WHERE ip=%s", (ip,))
    row = cur.fetchone()
    return bool(row and row[0].timestamp() > datetime.now().timestamp())

def check_rate_limit(cur, ip, bucket, window_sec=60, max_hits=10, block_minutes=15):
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

def log_security_event(cur, user_id, event_type, ip=None):
    cur.execute(
        f"INSERT INTO {SCHEMA}.security_events (user_id, event_type, ip) VALUES (%s,%s,%s)",
        (user_id, event_type, ip)
    )

def add_notification(cur, user_id, ntype, title, text, shield=False):
    nid = secrets.token_hex(8)
    cur.execute(
        f"""INSERT INTO {SCHEMA}.notifications (id, user_id, type, title, text, shield)
            VALUES (%s,%s,%s,%s,%s,%s)""",
        (nid, user_id, ntype, title, text, shield)
    )

def send_code_email(to: str, code: str, purpose: str):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Код подтверждения действия — Gorant Shop"
    msg["From"] = FROM_EMAIL
    msg["To"] = to
    html = f"""
    <div style="font-family:Arial,sans-serif;background:#0e0e0e;padding:40px;border-radius:12px;max-width:480px;margin:auto">
      <h2 style="color:#c9a227;font-size:22px;margin-bottom:8px">Gorant Shop</h2>
      <p style="color:#aaa;font-size:14px;margin-bottom:24px">{purpose}</p>
      <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px">
        <p style="color:#888;font-size:12px;margin-bottom:8px">Код подтверждения</p>
        <span style="font-size:36px;font-weight:bold;color:#c9a227;letter-spacing:8px">{code}</span>
        <p style="color:#555;font-size:11px;margin-top:12px">Действует {CODE_LIFETIME_MINUTES} минут</p>
      </div>
      <p style="color:#666;font-size:12px">Если это были не вы — срочно смените пароль и обратитесь в поддержку.</p>
    </div>
    """
    msg.attach(MIMEText(html, "html"))
    try:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
            server.login(FROM_EMAIL, SENDER_PASSWORD)
            server.sendmail(FROM_EMAIL, to, msg.as_string())
        return True
    except Exception as e:
        print(f"Error sending security code to {to}: {e}")
        return False

def mask_email(email: str) -> str:
    try:
        name, domain = email.split("@")
        if len(name) <= 2:
            masked = name[0] + "*"
        else:
            masked = name[0] + "*" * (len(name) - 2) + name[-1]
        return f"{masked}@{domain}"
    except Exception:
        return email

def create_ticket(cur, user_id, action_type, payload):
    tid = "ST-" + secrets.token_hex(4).upper()
    code = str(secrets.randbelow(900000) + 100000)
    cur.execute(
        f"""INSERT INTO {SCHEMA}.security_tickets (id, user_id, action_type, payload, code, expires_at)
            VALUES (%s,%s,%s,%s,%s, NOW() + INTERVAL '{CODE_LIFETIME_MINUTES} minutes')""",
        (tid, user_id, action_type, json.dumps(payload), code)
    )
    return tid, code

def handler(event: dict, context) -> dict:
    """Тикеты безопасности: вывод средств и крупные траты требуют одноразовый код с почты."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    qs = event.get("queryStringParameters") or {}
    path = qs.get("_path") or event.get("path") or "/"
    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass

    token = (event.get("headers") or {}).get("X-Session-Token")
    ip = get_client_ip(event)
    conn = get_conn()
    try:
        cur = conn.cursor()
        user = get_user_by_token(cur, token)

        # ── POST /security/withdraw/request — запросить код для вывода средств ──
        if method == "POST" and path.endswith("/withdraw/request"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            if check_rate_limit(cur, ip, "sec_withdraw_req", window_sec=60, max_hits=6, block_minutes=15):
                conn.commit()
                return {"statusCode": 429, "headers": CORS, "body": json.dumps({"error": "rate_limited"})}

            amount = float(body.get("amount") or 0)
            currency = body.get("currency") or "RUB"
            req_type = body.get("requisite_type") or ""
            req_details = body.get("requisite_details") or ""
            commission = WITHDRAW_FEE_FIXED  # фиксированная комиссия вывода, ₽

            if amount <= 0 or not req_type or not req_details:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_data"})}
            if amount <= commission:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "amount_too_small"})}
            if user["balance_rub"] < amount:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "no_balance"})}

            payload = {"amount": amount, "currency": currency, "requisite_type": req_type,
                       "requisite_details": req_details, "commission": commission}
            tid, code = create_ticket(cur, user["id"], "withdraw", payload)
            log_security_event(cur, user["id"], "withdraw_code_requested", ip)
            conn.commit()

            if not send_code_email(user["email"], code, "Подтверждение вывода средств"):
                return {"statusCode": 500, "headers": CORS, "body": json.dumps({"error": "email_sending_failed"})}

            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "ticketId": tid, "maskedEmail": mask_email(user["email"])
            })}

        # ── POST /security/withdraw/confirm — подтвердить код и выполнить вывод ─
        if method == "POST" and path.endswith("/withdraw/confirm"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            if check_rate_limit(cur, ip, "sec_withdraw_confirm", window_sec=60, max_hits=15, block_minutes=15):
                conn.commit()
                return {"statusCode": 429, "headers": CORS, "body": json.dumps({"error": "rate_limited"})}

            ticket_id = body.get("ticket_id")
            code = (body.get("code") or "").strip()

            cur.execute(
                f"""SELECT id, action_type, payload, code, status, attempts, expires_at
                    FROM {SCHEMA}.security_tickets WHERE id=%s AND user_id=%s FOR UPDATE""",
                (ticket_id, user["id"])
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            tid, action_type, payload, real_code, status, attempts, expires_at = row

            if status != "pending":
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "already_used"})}
            if expires_at.timestamp() < datetime.now().timestamp():
                cur.execute(f"UPDATE {SCHEMA}.security_tickets SET status='expired' WHERE id=%s", (tid,))
                conn.commit()
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "code_expired"})}
            if attempts >= MAX_ATTEMPTS:
                cur.execute(f"UPDATE {SCHEMA}.security_tickets SET status='expired' WHERE id=%s", (tid,))
                conn.commit()
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "too_many_attempts"})}

            if code != real_code:
                cur.execute(f"UPDATE {SCHEMA}.security_tickets SET attempts=attempts+1 WHERE id=%s", (tid,))
                conn.commit()
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_code"})}

            payload = payload if isinstance(payload, dict) else json.loads(payload)
            amount = float(payload["amount"])
            currency = payload["currency"]
            req_type = payload["requisite_type"]
            req_details = payload["requisite_details"]
            commission = float(payload["commission"])

            cur.execute(f"SELECT balance_rub FROM {SCHEMA}.users WHERE id=%s FOR UPDATE", (user["id"],))
            balance = float(cur.fetchone()[0])
            if balance < amount:
                cur.execute(f"UPDATE {SCHEMA}.security_tickets SET status='expired' WHERE id=%s", (tid,))
                conn.commit()
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "no_balance"})}

            to_receive = round(amount - commission, 2)  # commission — фиксированная сумма, ₽
            wd_id = "WD-" + secrets.token_hex(3).upper()
            cur.execute(
                f"""INSERT INTO {SCHEMA}.withdrawals
                    (id, user_id, amount, currency, commission, to_receive, requisite_type, requisite_details)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
                (wd_id, user["id"], amount, currency, commission, to_receive, req_type, req_details)
            )
            cur.execute(f"UPDATE {SCHEMA}.users SET balance_rub=balance_rub-%s WHERE id=%s", (amount, user["id"]))
            cur.execute(
                f"UPDATE {SCHEMA}.security_tickets SET status='confirmed', confirmed_at=NOW() WHERE id=%s",
                (tid,)
            )
            add_notification(cur, user["id"], "withdraw_update",
                "Заявка на вывод создана",
                f"Заявка {wd_id} на вывод {amount:,.0f} {currency} подтверждена. К получению: {to_receive:,.0f}.")
            log_security_event(cur, user["id"], "withdraw_confirmed", ip)
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"id": wd_id, "to_receive": to_receive})}

        # ── POST /security/spend/request — код для подтверждения крупной траты ──
        if method == "POST" and path.endswith("/spend/request"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            if check_rate_limit(cur, ip, "sec_spend_req", window_sec=60, max_hits=6, block_minutes=15):
                conn.commit()
                return {"statusCode": 429, "headers": CORS, "body": json.dumps({"error": "rate_limited"})}

            tid, code = create_ticket(cur, user["id"], "big_spend", {})
            log_security_event(cur, user["id"], "big_spend_code_requested", ip)
            conn.commit()

            if not send_code_email(user["email"], code, "Подтверждение крупной покупки на платформе"):
                return {"statusCode": 500, "headers": CORS, "body": json.dumps({"error": "email_sending_failed"})}

            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "ticketId": tid, "maskedEmail": mask_email(user["email"])
            })}

        # ── POST /security/spend/confirm — подтвердить код: снимает лимит на месяц ─
        if method == "POST" and path.endswith("/spend/confirm"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            if check_rate_limit(cur, ip, "sec_spend_confirm", window_sec=60, max_hits=15, block_minutes=15):
                conn.commit()
                return {"statusCode": 429, "headers": CORS, "body": json.dumps({"error": "rate_limited"})}

            ticket_id = body.get("ticket_id")
            code = (body.get("code") or "").strip()

            cur.execute(
                f"""SELECT id, status, attempts, expires_at, code FROM {SCHEMA}.security_tickets
                    WHERE id=%s AND user_id=%s AND action_type='big_spend' FOR UPDATE""",
                (ticket_id, user["id"])
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            tid, status, attempts, expires_at, real_code = row

            if status != "pending":
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "already_used"})}
            if expires_at.timestamp() < datetime.now().timestamp():
                cur.execute(f"UPDATE {SCHEMA}.security_tickets SET status='expired' WHERE id=%s", (tid,))
                conn.commit()
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "code_expired"})}
            if attempts >= MAX_ATTEMPTS:
                cur.execute(f"UPDATE {SCHEMA}.security_tickets SET status='expired' WHERE id=%s", (tid,))
                conn.commit()
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "too_many_attempts"})}
            if code != real_code:
                cur.execute(f"UPDATE {SCHEMA}.security_tickets SET attempts=attempts+1 WHERE id=%s", (tid,))
                conn.commit()
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_code"})}

            month_key = datetime.now().strftime("%Y-%m")
            cur.execute(
                f"UPDATE {SCHEMA}.users SET big_spend_verified_month=%s WHERE id=%s",
                (month_key, user["id"])
            )
            cur.execute(
                f"UPDATE {SCHEMA}.security_tickets SET status='confirmed', confirmed_at=NOW() WHERE id=%s",
                (tid,)
            )
            log_security_event(cur, user["id"], "big_spend_confirmed", ip)
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── GET /security/admin/log — журнал безопасности (для админки) ─────────
        if method == "GET" and path.endswith("/admin/log"):
            if not is_staff(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            cur.execute(
                f"""SELECT se.id, se.user_id, u.username, se.event_type, se.ip, se.created_at
                    FROM {SCHEMA}.security_events se
                    LEFT JOIN {SCHEMA}.users u ON u.id=se.user_id
                    ORDER BY se.created_at DESC LIMIT 200"""
            )
            log = [{"id": r[0], "userId": r[1], "username": r[2] or "—", "eventType": r[3],
                    "ip": r[4], "time": r[5].strftime("%d.%m.%Y %H:%M:%S")} for r in cur.fetchall()]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"log": log})}

        # ── GET /security/admin/blocked-ips — список заблокированных IP ─────────
        if method == "GET" and path.endswith("/admin/blocked-ips"):
            if not is_staff(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            cur.execute(
                f"""SELECT ip, reason, blocked_until, created_at FROM {SCHEMA}.blocked_ips
                    WHERE blocked_until > NOW() ORDER BY created_at DESC LIMIT 100"""
            )
            ips = [{"ip": r[0], "reason": r[1], "blockedUntil": r[2].isoformat(),
                    "createdAt": r[3].strftime("%d.%m.%Y %H:%M")} for r in cur.fetchall()]
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.blocked_ips WHERE blocked_until > NOW()")
            active_count = cur.fetchone()[0]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"blockedIps": ips, "activeCount": active_count})}

        # ── POST /security/admin/unblock-ip — снять блокировку IP ────────────────
        if method == "POST" and path.endswith("/admin/unblock-ip"):
            if not is_staff(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            target_ip = body.get("ip")
            cur.execute(f"DELETE FROM {SCHEMA}.blocked_ips WHERE ip=%s", (target_ip,))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}

    except Exception as e:
        conn.rollback()
        return {"statusCode": 500, "headers": CORS, "body": json.dumps({"error": str(e)})}
    finally:
        conn.close()