"""
Сделки: создание покупки, список, споры, арбитраж.
"""
import json, os, secrets
from datetime import datetime, timedelta
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA") or "t_p38600009_virtual_asset_trader"
PLATFORM_COMMISSION = 7
SUSPICIOUS_PATTERN = "http"
BIG_SPEND_THRESHOLD = 3000

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

# ── DDoS-защита: ограничение запросов с одного IP ──────────────────────────

def get_client_ip(event):
    return (event.get("requestContext") or {}).get("identity", {}).get("sourceIp") or "unknown"

def is_ip_blocked(cur, ip):
    cur.execute(f"SELECT blocked_until FROM {SCHEMA}.blocked_ips WHERE ip=%s", (ip,))
    row = cur.fetchone()
    return bool(row and row[0].timestamp() > datetime.now().timestamp())

def check_rate_limit(cur, ip, bucket, window_sec=60, max_hits=20, block_minutes=15):
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
    ip = get_client_ip(event)
    conn  = get_conn()
    try:
        cur = conn.cursor()

        if is_ip_blocked(cur, ip):
            return {"statusCode": 429, "headers": CORS, "body": json.dumps({"error": "ip_blocked"})}

        # ── POST /deals/buy ───────────────────────────────────────────────────
        if method == "POST" and path.endswith("/buy"):
            user = get_user_by_token(cur, token)
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            if check_rate_limit(cur, ip, "deals_buy", window_sec=30, max_hits=15, block_minutes=10):
                conn.commit()
                return {"statusCode": 429, "headers": CORS, "body": json.dumps({"error": "rate_limited"})}

            product_id = body.get("product_id")
            buyer_contact = (body.get("buyer_contact") or "").strip()[:500]
            try:
                quantity = int(body.get("quantity") or 1)
            except (TypeError, ValueError):
                quantity = 1
            if quantity <= 0 or quantity > 100000:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_quantity"})}
            if not buyer_contact:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "buyer_contact_required"})}

            cur.execute(
                f"""SELECT id, seller_id, title, category, price, stock, unit_label
                    FROM {SCHEMA}.products WHERE id=%s AND active=TRUE FOR UPDATE""",
                (product_id,)
            )
            product = cur.fetchone()
            if not product:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "product_not_found"})}

            pid, seller_id, title, category, unit_price, stock, unit_label = product
            unit_price = float(unit_price)
            if quantity > stock:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "not_enough_stock"})}
            price = round(unit_price * quantity, 2)

            if user["status"] in ("frozen", "blocked") or user.get("perma_banned"):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "account_restricted"})}
            if user["id"] == seller_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "self_buy"})}
            if user["balance_rub"] < price:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "no_balance"})}

            if price > BIG_SPEND_THRESHOLD:
                month_key = datetime.now().strftime("%Y-%m")
                cur.execute(f"SELECT big_spend_verified_month FROM {SCHEMA}.users WHERE id=%s", (user["id"],))
                row_bs = cur.fetchone()
                verified_month = row_bs[0] if row_bs else None
                if verified_month != month_key:
                    return {"statusCode": 403, "headers": CORS,
                            "body": json.dumps({"error": "big_spend_verification_required"})}

            # Срок холда берём из настроек категории в БД (админ управляет им в панели)
            cur.execute(f"SELECT hold_days FROM {SCHEMA}.categories WHERE name=%s", (category,))
            cat_row = cur.fetchone()
            hold_days = cat_row[0] if cat_row and cat_row[0] else None

            seller_receives = round(price * (1 - PLATFORM_COMMISSION / 100), 2)

            hold_until = None
            if hold_days:
                hold_until = datetime.now() + timedelta(days=hold_days)

            deal_id = "TX-" + secrets.token_hex(3).upper()
            status = "hold" if hold_days else "escrow"

            cur.execute(
                f"""INSERT INTO {SCHEMA}.deals
                    (id, product_id, product_name, category, amount, status,
                     buyer_id, seller_id, hold_days, hold_until, quantity, unit_label, buyer_contact)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (deal_id, pid, title, category, price, status,
                 user["id"], seller_id, hold_days, hold_until, quantity, unit_label, buyer_contact)
            )

            # Списываем остаток товара у продавца, деактивируем при обнулении
            cur.execute(
                f"""UPDATE {SCHEMA}.products SET stock = stock - %s,
                        active = CASE WHEN stock - %s <= 0 THEN FALSE ELSE active END
                    WHERE id=%s""",
                (quantity, quantity, pid)
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
                           d.hold_days, d.hold_until, d.arbiter_id, d.created_at,
                           d.quantity, d.unit_label, d.buyer_contact, d.seller_shipped,
                           d.seller_shipped_at, d.cancel_reason
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
                    "quantity": r[13], "unitLabel": r[14],
                    "buyerContact": r[15], "sellerShipped": r[16],
                    "sellerShippedAt": r[17].strftime("%d.%m.%Y %H:%M") if r[17] else None,
                    "cancelReason": r[18],
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
                f"""UPDATE {SCHEMA}.deals SET status='dispute', updated_at=NOW()
                    WHERE id=%s AND (buyer_id=%s OR seller_id=%s)
                    AND status IN ('escrow','hold','hold_cs2','hold_pubg')""",
                (deal_id, user["id"], user["id"])
            )
            if cur.rowcount == 0:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "cannot_open_dispute"})}
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
            is_staff = user.get("role") in ("admin", "staff") or user.get("is_owner")
            if user["id"] not in (buyer_id, seller_id, arbiter_id) and not is_staff:
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
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
            if status not in ("escrow", "hold", "hold_cs2", "hold_pubg"):
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

        # ── POST /deals/ship — продавец подтверждает, что отправил товар ───────
        if method == "POST" and path.endswith("/ship"):
            user = get_user_by_token(cur, token)
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}

            deal_id = body.get("deal_id")
            cur.execute(
                f"SELECT buyer_id, seller_id, status FROM {SCHEMA}.deals WHERE id=%s",
                (deal_id,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            buyer_id, seller_id, status = row

            if user["id"] != seller_id:
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            if status not in ("escrow", "hold", "hold_cs2", "hold_pubg"):
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "wrong_status"})}

            cur.execute(
                f"UPDATE {SCHEMA}.deals SET seller_shipped=TRUE, seller_shipped_at=NOW() WHERE id=%s",
                (deal_id,)
            )
            add_notification(cur, buyer_id, "deal_bought",
                "Продавец отправил товар",
                f"Продавец подтвердил передачу по сделке {deal_id}. Проверьте и подтвердите получение.")

            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── POST /deals/cancel — продавец отменяет сделку до подтверждения ─────
        # Покупателю возвращается полная сумма, сделка не учитывается в статистике админа
        # (статус 'cancelled' исключён из всех агрегатов admin/stats)
        if method == "POST" and path.endswith("/cancel"):
            user = get_user_by_token(cur, token)
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}

            deal_id = body.get("deal_id")
            reason  = (body.get("reason") or "").strip()[:300]
            cur.execute(
                f"""SELECT buyer_id, seller_id, amount, status, product_id, quantity
                    FROM {SCHEMA}.deals WHERE id=%s FOR UPDATE""",
                (deal_id,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            buyer_id, seller_id, amount, status, product_id, quantity = row
            amount = float(amount)

            # Только продавец (или админ/владелец) может отменить, и только пока сделка не завершена
            is_staff = user.get("role") in ("admin", "staff") or user.get("is_owner")
            if user["id"] != seller_id and not is_staff:
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            if status not in ("escrow", "hold", "hold_cs2", "hold_pubg"):
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "wrong_status"})}

            seller_would_receive = round(amount * (1 - PLATFORM_COMMISSION / 100), 2)

            cur.execute(
                f"UPDATE {SCHEMA}.deals SET status='cancelled', cancel_reason=%s, updated_at=NOW() WHERE id=%s",
                (reason or "Отменено продавцом", deal_id)
            )
            # Полный возврат покупателю
            cur.execute(f"UPDATE {SCHEMA}.users SET balance_rub=balance_rub+%s WHERE id=%s", (amount, buyer_id))
            # Снимаем удержанные (locked) средства у продавца — они не были ему выплачены
            cur.execute(
                f"UPDATE {SCHEMA}.users SET locked_rub=GREATEST(0,locked_rub-%s) WHERE id=%s",
                (seller_would_receive, seller_id)
            )
            # Возвращаем товар на склад продавца
            if product_id:
                cur.execute(
                    f"UPDATE {SCHEMA}.products SET stock=stock+%s, active=TRUE WHERE id=%s",
                    (quantity, product_id)
                )

            add_notification(cur, buyer_id, "deal_bought",
                "Сделка отменена продавцом",
                f"Продавец отменил сделку {deal_id}. Средства ₽{amount:,.0f} возвращены на ваш баланс.",
                shield=True)
            add_notification(cur, seller_id, "deal_sold",
                "Сделка отменена",
                f"Вы отменили сделку {deal_id}. Товар возвращён на склад.")

            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── GET /deals/chat?deal_id=... — переписка покупателя и продавца ──────
        if method == "GET" and path.endswith("/chat"):
            user = get_user_by_token(cur, token)
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            deal_id = _qs.get("deal_id")
            cur.execute(f"SELECT buyer_id, seller_id FROM {SCHEMA}.deals WHERE id=%s", (deal_id,))
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            buyer_id, seller_id = row
            if user["id"] not in (buyer_id, seller_id):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            cur.execute(
                f"""SELECT id, from_user_id, role, text, created_at
                    FROM {SCHEMA}.deal_chat_messages WHERE deal_id=%s ORDER BY created_at""",
                (deal_id,)
            )
            messages = [{"id": r[0], "fromUserId": r[1], "role": r[2], "text": r[3],
                         "time": r[4].strftime("%d.%m.%Y %H:%M")} for r in cur.fetchall()]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"messages": messages})}

        # ── POST /deals/chat — отправить сообщение в чат по сделке ─────────────
        if method == "POST" and path.endswith("/chat"):
            user = get_user_by_token(cur, token)
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            if user["status"] in ("frozen", "blocked") or user.get("perma_banned"):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "account_restricted"})}
            if check_rate_limit(cur, ip, "deal_chat", window_sec=30, max_hits=20, block_minutes=5):
                conn.commit()
                return {"statusCode": 429, "headers": CORS, "body": json.dumps({"error": "rate_limited"})}

            deal_id = body.get("deal_id")
            text    = (body.get("text") or "").strip()[:2000]
            if not text:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "empty_message"})}

            cur.execute(f"SELECT buyer_id, seller_id FROM {SCHEMA}.deals WHERE id=%s", (deal_id,))
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            buyer_id, seller_id = row
            if user["id"] not in (buyer_id, seller_id):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            role = "buyer" if user["id"] == buyer_id else "seller"
            other_id = seller_id if role == "buyer" else buyer_id

            cur.execute(
                f"""INSERT INTO {SCHEMA}.deal_chat_messages (deal_id, from_user_id, role, text)
                    VALUES (%s,%s,%s,%s)""",
                (deal_id, user["id"], role, text)
            )
            add_notification(cur, other_id, "system",
                "Новое сообщение по сделке",
                f"{user['username']} написал(а) вам по сделке {deal_id}.")
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}

    except Exception as e:
        conn.rollback()
        return {"statusCode": 500, "headers": CORS, "body": json.dumps({"error": str(e)})}
    finally:
        conn.close()