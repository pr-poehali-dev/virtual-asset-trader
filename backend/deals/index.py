"""
Сделки: создание покупки, список, споры, арбитраж.
"""
import json, os, secrets
from datetime import datetime, timedelta
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA") or "t_p38600009_virtual_asset_trader"
PLATFORM_COMMISSION = 5
HOLD_DAYS = {"CS2 скины": 8, "PUBG Mobile": 14}
SUSPICIOUS_PATTERN = "http"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}

def get_conn():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = False
    return conn

def get_user_by_token(cur, token):
    if not token:
        return None
    cur.execute(
        f"""SELECT u.id, u.username, u.balance_rub, u.role, u.is_owner,
                   u.verified, u.status, u.locked_rub, u.perma_banned
            FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id=s.user_id
            WHERE s.token=%s AND s.expires_at > NOW()""",
        (token,)
    )
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "username": row[1], "balance_rub": float(row[2]),
            "role": row[3], "is_owner": row[4], "verified": row[5],
            "status": row[6], "locked_rub": float(row[7]), "perma_banned": row[8]}

SPAM_WINDOW_SEC = 15   # окно наблюдения
SPAM_THRESHOLD  = 15   # кол-во действий за окно → заморозка

def check_and_record_event(cur, user_id, event_type, ip=None):
    """Записывает событие и возвращает True если обнаружен спам → нужна заморозка."""
    cur.execute(
        f"INSERT INTO {SCHEMA}.security_events (user_id, event_type, ip) VALUES (%s,%s,%s)",
        (user_id, event_type, ip)
    )
    cur.execute(
        f"""SELECT COUNT(*) FROM {SCHEMA}.security_events
            WHERE user_id=%s AND created_at >= NOW() - INTERVAL '{SPAM_WINDOW_SEC} seconds'""",
        (user_id,)
    )
    count = cur.fetchone()[0]
    return count >= SPAM_THRESHOLD

def freeze_user_auto(cur, user_id, reason):
    """Автоматическая заморозка аккаунта + блокировка баланса."""
    cur.execute(
        f"""UPDATE {SCHEMA}.users
            SET status='frozen',
                freeze_reason=%s,
                locked_rub = locked_rub + balance_rub,
                balance_rub = 0
            WHERE id=%s AND status='active'""",
        (reason, user_id)
    )
    nid = secrets.token_hex(8)
    cur.execute(
        f"""INSERT INTO {SCHEMA}.notifications (id, user_id, type, title, text, shield)
            VALUES (%s,%s,'system',%s,%s,TRUE)""",
        (nid, user_id,
         "Аккаунт заморожен автоматически",
         f"Система безопасности обнаружила подозрительную активность. Ваш аккаунт заморожен, баланс заблокирован. Причина: {reason}. Обратитесь в поддержку.")
    )

def add_notification(cur, user_id, ntype, title, text, shield=False):
    nid = secrets.token_hex(8)
    cur.execute(
        f"""INSERT INTO {SCHEMA}.notifications (id, user_id, type, title, text, shield)
            VALUES (%s,%s,%s,%s,%s,%s)""",
        (nid, user_id, ntype, title, text, shield)
    )

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    _qs = event.get("queryStringParameters") or {}
    path = _qs.get("_path") or event.get("path") or "/"
    body   = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass

    token = (event.get("headers") or {}).get("X-Session-Token")
    conn  = get_conn()
    try:
        cur = conn.cursor()

        # ── POST /deals/buy ───────────────────────────────────────────────────
        if method == "POST" and path.endswith("/buy"):
            user = get_user_by_token(cur, token)
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}

            product_id = body.get("product_id")
            cur.execute(
                f"SELECT id, seller_id, title, category, price FROM {SCHEMA}.products WHERE id=%s AND active=TRUE",
                (product_id,)
            )
            product = cur.fetchone()
            if not product:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "product_not_found"})}

            pid, seller_id, title, category, price = product
            price = float(price)

            if user["status"] in ("frozen", "blocked") or user.get("perma_banned"):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "account_restricted"})}
            if user["id"] == seller_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "self_buy"})}
            if user["balance_rub"] < price:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "no_balance"})}

            hold_days = HOLD_DAYS.get(category)
            seller_receives = round(price * (1 - PLATFORM_COMMISSION / 100), 2)

            hold_until = None
            if hold_days:
                hold_until = datetime.now() + timedelta(days=hold_days)

            deal_id = "TX-" + secrets.token_hex(3).upper()
            status = "hold_cs2" if category == "CS2 скины" else \
                     "hold_pubg" if category == "PUBG Mobile" else "escrow"

            cur.execute(
                f"""INSERT INTO {SCHEMA}.deals
                    (id, product_id, product_name, category, amount, status,
                     buyer_id, seller_id, hold_days, hold_until)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (deal_id, pid, title, category, price, status,
                 user["id"], seller_id, hold_days, hold_until)
            )

            # Списываем у покупателя
            cur.execute(
                f"UPDATE {SCHEMA}.users SET balance_rub=balance_rub-%s WHERE id=%s",
                (price, user["id"])
            )

            # Если холд — кладём продавцу в locked, иначе сразу или через 2 дня
            if hold_days:
                cur.execute(
                    f"UPDATE {SCHEMA}.users SET locked_rub=locked_rub+%s WHERE id=%s",
                    (seller_receives, seller_id)
                )
            else:
                # Верифицированный получает сразу, неверифицированный — через 2 дня (тоже в locked пока)
                cur.execute(
                    f"UPDATE {SCHEMA}.users SET locked_rub=locked_rub+%s WHERE id=%s",
                    (seller_receives, seller_id)
                )

            # Уведомления
            add_notification(cur, seller_id, "deal_sold",
                "Новая покупка!",
                f"{user['username']} купил «{title}» за ₽{price:,.0f}. Вам будет зачислено ₽{seller_receives:,.0f} после вычета комиссии {PLATFORM_COMMISSION}%.{'  Холд ' + str(hold_days) + ' дней.' if hold_days else ''}",
                shield=True)
            add_notification(cur, user["id"], "deal_bought",
                "Покупка совершена",
                f"Вы купили «{title}» за ₽{price:,.0f}. Сделка ID: {deal_id}.")

            # Anti-spam: фиксируем событие покупки
            ip = (event.get("requestContext") or {}).get("identity", {}).get("sourceIp")
            spam = check_and_record_event(cur, user["id"], "buy", ip)
            if spam:
                freeze_user_auto(cur, user["id"], "Подозрительная активность: слишком много покупок за короткое время")

            conn.commit()
            return {"statusCode": 200, "headers": CORS,
                    "body": json.dumps({"deal_id": deal_id, "status": status})}

        # ── GET /deals ────────────────────────────────────────────────────────
        if method == "GET" and (path.endswith("/deals") or path.endswith("/deals/")):
            user = get_user_by_token(cur, token)
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}

            cur.execute(
                f"""SELECT d.id, d.product_name, d.category, d.amount, d.status,
                           d.buyer_id, ub.username, d.seller_id, us.username,
                           d.hold_days, d.hold_until, d.arbiter_id, d.created_at
                    FROM {SCHEMA}.deals d
                    JOIN {SCHEMA}.users ub ON ub.id=d.buyer_id
                    JOIN {SCHEMA}.users us ON us.id=d.seller_id
                    WHERE d.buyer_id=%s OR d.seller_id=%s
                    ORDER BY d.created_at DESC""",
                (user["id"], user["id"])
            )
            rows = cur.fetchall()
            deals = []
            for r in rows:
                deals.append({
                    "id": r[0], "product": r[1], "category": r[2],
                    "amount": float(r[3]), "status": r[4],
                    "buyerId": r[5], "buyerName": r[6],
                    "sellerId": r[7], "sellerName": r[8],
                    "holdDays": r[9],
                    "holdUntil": r[10].strftime("%d.%m.%Y") if r[10] else None,
                    "arbiterId": r[11],
                    "date": r[12].strftime("%d.%m.%Y"),
                    "step": 3,
                    "disputeMessages": [],
                })
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"deals": deals})}

        # ── POST /deals/dispute ───────────────────────────────────────────────
        if method == "POST" and path.endswith("/dispute"):
            user = get_user_by_token(cur, token)
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            if user["status"] in ("frozen", "blocked") or user.get("perma_banned"):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "account_restricted"})}
            deal_id = body.get("deal_id")
            cur.execute(
                f"UPDATE {SCHEMA}.deals SET status='dispute', updated_at=NOW() WHERE id=%s AND (buyer_id=%s OR seller_id=%s)",
                (deal_id, user["id"], user["id"])
            )
            cur.execute(
                f"""INSERT INTO {SCHEMA}.dispute_messages (deal_id, from_user, role, text, is_system)
                    VALUES (%s,%s,'buyer',%s,TRUE)""",
                (deal_id, "system", f"Спор открыт пользователем {user['username']}. Ожидайте назначения арбитра.")
            )
            # Anti-spam: открытие спора
            ip = (event.get("requestContext") or {}).get("identity", {}).get("sourceIp")
            spam = check_and_record_event(cur, user["id"], "dispute", ip)
            if spam:
                freeze_user_auto(cur, user["id"], "Подозрительная активность: массовое открытие споров")
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── POST /deals/message ───────────────────────────────────────────────
        if method == "POST" and path.endswith("/message"):
            user = get_user_by_token(cur, token)
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            deal_id = body.get("deal_id")
            text    = (body.get("text") or "").strip()

            # Проверка подозрительных ссылок
            warning = ""
            if SUSPICIOUS_PATTERN in text.lower():
                import re
                urls = re.findall(r'https?://[^\s]+', text, re.IGNORECASE)
                safe_urls = [u for u in urls if "gorant.shop" in u]
                if len(urls) > len(safe_urls):
                    warning = "\n\n⚠️ [Предупреждение: обнаружена внешняя ссылка. Gorant Shop не несёт ответственности за переход по сторонним ссылкам]"

            cur.execute(f"SELECT buyer_id, seller_id, arbiter_id FROM {SCHEMA}.deals WHERE id=%s", (deal_id,))
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            buyer_id, seller_id, arbiter_id = row
            role = "arbiter" if user["id"] == arbiter_id else \
                   "buyer" if user["id"] == buyer_id else "seller"

            cur.execute(
                f"""INSERT INTO {SCHEMA}.dispute_messages (deal_id, from_user, role, text)
                    VALUES (%s,%s,%s,%s)""",
                (deal_id, user["username"], role, text + warning)
            )
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── POST /deals/resolve ───────────────────────────────────────────────
        if method == "POST" and path.endswith("/resolve"):
            user = get_user_by_token(cur, token)
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}

            deal_id     = body.get("deal_id")
            refund_buyer = body.get("refund_buyer", False)

            cur.execute(
                f"SELECT buyer_id, seller_id, amount, arbiter_id FROM {SCHEMA}.deals WHERE id=%s AND status='dispute'",
                (deal_id,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            buyer_id, seller_id, amount, arbiter_id = row
            amount = float(amount)

            if user["role"] not in ("admin", "staff") and user["id"] != arbiter_id:
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}

            seller_receives = round(amount * (1 - PLATFORM_COMMISSION / 100), 2)
            new_status = "refunded" if refund_buyer else "completed"

            cur.execute(f"UPDATE {SCHEMA}.deals SET status=%s, updated_at=NOW() WHERE id=%s", (new_status, deal_id))

            if refund_buyer:
                cur.execute(f"UPDATE {SCHEMA}.users SET balance_rub=balance_rub+%s WHERE id=%s", (amount, buyer_id))
            else:
                cur.execute(
                    f"UPDATE {SCHEMA}.users SET balance_rub=balance_rub+%s, locked_rub=GREATEST(0,locked_rub-%s) WHERE id=%s",
                    (seller_receives, seller_receives, seller_id)
                )

            resolution = f"Возврат ₽{amount:,.0f} покупателю." if refund_buyer else f"Средства ₽{seller_receives:,.0f} выплачены продавцу."
            cur.execute(
                f"""INSERT INTO {SCHEMA}.dispute_messages (deal_id, from_user, role, text, is_system)
                    VALUES (%s,'Арбитр','arbiter',%s,TRUE)""",
                (deal_id, f"✅ Решение арбитра: {resolution}")
            )

            add_notification(cur, buyer_id, "dispute", "Спор разрешён",
                f"По сделке {deal_id}: {resolution}")
            add_notification(cur, seller_id, "dispute", "Спор разрешён",
                f"По сделке {deal_id}: {resolution}")

            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── POST /deals/confirm ───────────────────────────────────────────────
        # Покупатель подтверждает получение товара → средства идут продавцу
        if method == "POST" and path.endswith("/confirm"):
            user = get_user_by_token(cur, token)
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}

            deal_id = body.get("deal_id")
            cur.execute(
                f"SELECT buyer_id, seller_id, amount, status FROM {SCHEMA}.deals WHERE id=%s",
                (deal_id,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            buyer_id, seller_id, amount, status = row
            amount = float(amount)

            # Только покупатель может подтвердить, и только из статусов escrow/hold_*
            if user["id"] != buyer_id:
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            if status not in ("escrow", "hold_cs2", "hold_pubg"):
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "wrong_status"})}

            seller_receives = round(amount * (1 - PLATFORM_COMMISSION / 100), 2)

            cur.execute(f"UPDATE {SCHEMA}.deals SET status='completed', updated_at=NOW() WHERE id=%s", (deal_id,))
            # Переводим со locked на реальный баланс продавцу
            cur.execute(
                f"UPDATE {SCHEMA}.users SET balance_rub=balance_rub+%s, locked_rub=GREATEST(0,locked_rub-%s) WHERE id=%s",
                (seller_receives, seller_receives, seller_id)
            )
            cur.execute(
                f"UPDATE {SCHEMA}.users SET deals_count=deals_count+1 WHERE id=%s OR id=%s",
                (buyer_id, seller_id)
            )

            add_notification(cur, seller_id, "deal_sold",
                "Сделка завершена!",
                f"Покупатель подтвердил получение по сделке {deal_id}. ₽{seller_receives:,.0f} зачислены на баланс.",
                shield=True)
            add_notification(cur, buyer_id, "deal_bought",
                "Сделка завершена",
                f"Сделка {deal_id} успешно завершена.")

            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "seller_receives": seller_receives})}

        return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}

    except Exception as e:
        conn.rollback()
        return {"statusCode": 500, "headers": CORS, "body": json.dumps({"error": str(e)})}
    finally:
        conn.close()