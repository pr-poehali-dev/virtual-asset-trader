"""
Чат поддержки и управление спорами.
- Пользователи: открыть тикет, отправить сообщение, получить историю
- Операторы/Admins: список тикетов, ответить, закрыть, назначить
- Споры: список, резолюция (возврат / продавцу), назначение арбитра
"""
import json, os, secrets
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA") or "t_p38600009_virtual_asset_trader"
PLATFORM_COMMISSION = 7

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}

def get_conn():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = False
    return conn

def get_user(cur, token):
    if not token: return None
    cur.execute(
        f"""SELECT u.id, u.username, u.role, u.is_owner, u.balance_rub, u.locked_rub,
                   u.chat_banned, u.perma_banned, u.status
            FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id=s.user_id
            WHERE s.token=%s AND s.expires_at > NOW()""",
        (token,)
    )
    row = cur.fetchone()
    if not row: return None
    return {"id": row[0], "username": row[1], "role": row[2],
            "is_owner": row[3], "balance_rub": float(row[4]), "locked_rub": float(row[5]),
            "chat_banned": row[6], "perma_banned": row[7], "status": row[8]}

def is_staff(user):
    return user and (user["role"] in ("admin", "staff") or user["is_owner"])

def add_notification(cur, user_id, ntype, title, text, shield=False):
    nid = secrets.token_hex(8)
    cur.execute(
        f"INSERT INTO {SCHEMA}.notifications (id, user_id, type, title, text, shield) VALUES (%s,%s,%s,%s,%s,%s)",
        (nid, user_id, ntype, title, text, shield)
    )

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    qs = event.get("queryStringParameters") or {}
    path = qs.get("_path") or event.get("path") or "/"
    body = {}
    if event.get("body"):
        try: body = json.loads(event["body"])
        except: pass

    token = (event.get("headers") or {}).get("X-Session-Token")
    conn = get_conn()
    try:
        cur = conn.cursor()
        user = get_user(cur, token)

        # ═══════════════════════════════════════════════════════════════════
        # ── ТИКЕТЫ ПОДДЕРЖКИ ────────────────────────────────────────────────
        # ═══════════════════════════════════════════════════════════════════

        # POST /support/ticket/open — создать тикет или вернуть открытый
        if method == "POST" and path.endswith("/ticket/open"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            subject = (body.get("subject") or "Вопрос в поддержку").strip()
            first_msg = (body.get("message") or "").strip()
            # Проверяем открытый тикет
            cur.execute(
                f"SELECT id FROM {SCHEMA}.support_tickets WHERE user_id=%s AND status='open' ORDER BY created_at DESC LIMIT 1",
                (user["id"],)
            )
            existing = cur.fetchone()
            is_new_ticket = not existing
            if existing:
                ticket_id = existing[0]
            else:
                ticket_id = "SUP-" + secrets.token_hex(4).upper()
                cur.execute(
                    f"INSERT INTO {SCHEMA}.support_tickets (id, user_id, subject) VALUES (%s,%s,%s)",
                    (ticket_id, user["id"], subject)
                )
                cur.execute(
                    f"INSERT INTO {SCHEMA}.support_messages (ticket_id, from_user, role, text) VALUES (%s,%s,'system',%s)",
                    (ticket_id, "system", f"Тикет #{ticket_id} открыт. Оператор ответит в ближайшее время.")
                )
                # Gorant AI сразу приветствует пользователя в новом тикете
                cur.execute(
                    f"INSERT INTO {SCHEMA}.support_messages (ticket_id, from_user, role, text) VALUES (%s,%s,'ai',%s)",
                    (ticket_id, "ai", f"Здравствуйте, {user['username']}! Чем могу вам помочь, я Gorant AI 🤖")
                )
            if first_msg:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.support_messages (ticket_id, from_user, role, text) VALUES (%s,%s,'user',%s)",
                    (ticket_id, user["id"], first_msg)
                )
                cur.execute(
                    f"UPDATE {SCHEMA}.support_tickets SET updated_at=NOW() WHERE id=%s",
                    (ticket_id,)
                )
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ticketId": ticket_id})}

        # GET /support/ticket — получить ТОЛЬКО открытый тикет + историю
        # (закрытые тикеты сюда не попадают, иначе поллинг мешает открыть новое обращение)
        if method == "GET" and path.endswith("/support/ticket"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            cur.execute(
                f"""SELECT t.id, t.subject, t.status, t.operator_id, u.username, t.created_at,
                           t.ai_enabled, t.escalated
                    FROM {SCHEMA}.support_tickets t
                    LEFT JOIN {SCHEMA}.users u ON u.id=t.operator_id
                    WHERE t.user_id=%s AND t.status='open'
                    ORDER BY t.created_at DESC LIMIT 1""",
                (user["id"],)
            )
            ticket_row = cur.fetchone()
            if not ticket_row:
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ticket": None})}
            tid, subject, status, op_id, op_name, created, ai_enabled, escalated = ticket_row
            cur.execute(
                f"SELECT id, from_user, role, text, created_at FROM {SCHEMA}.support_messages WHERE ticket_id=%s ORDER BY created_at",
                (tid,)
            )
            messages = [{"id": r[0], "fromUser": r[1], "role": r[2], "text": r[3],
                         "time": r[4].strftime("%H:%M")} for r in cur.fetchall()]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "ticket": {"id": tid, "subject": subject, "status": status,
                           "operatorName": op_name, "aiEnabled": ai_enabled,
                           "escalated": escalated, "messages": messages}
            })}

        # POST /support/ticket/message — отправить сообщение в тикет (пользователь)
        if method == "POST" and path.endswith("/ticket/message"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            # Проверяем chat_ban
            if user.get("chat_banned"):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "chat_banned"})}
            ticket_id = body.get("ticket_id")
            text = (body.get("text") or "").strip()
            if not ticket_id or not text:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "missing_fields"})}
            cur.execute(f"SELECT user_id, status FROM {SCHEMA}.support_tickets WHERE id=%s", (ticket_id,))
            ticket = cur.fetchone()
            if not ticket or ticket[0] != user["id"]:
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            if ticket[1] == "closed":
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "ticket_closed"})}
            # Anti-spam: слишком много сообщений
            cur.execute(
                f"""SELECT COUNT(*) FROM {SCHEMA}.support_messages
                    WHERE from_user=%s AND created_at >= NOW() - INTERVAL '15 seconds'""",
                (user["id"],)
            )
            msg_count = cur.fetchone()[0]
            if msg_count >= 15:
                cur.execute(
                    f"UPDATE {SCHEMA}.users SET status='frozen', freeze_reason=%s WHERE id=%s AND status='active'",
                    ("Спам в чате поддержки: слишком много сообщений за короткое время", user["id"])
                )
                conn.commit()
                return {"statusCode": 429, "headers": CORS, "body": json.dumps({"error": "spam_detected", "frozen": True})}
            cur.execute(
                f"INSERT INTO {SCHEMA}.support_messages (ticket_id, from_user, role, text) VALUES (%s,%s,'user',%s)",
                (ticket_id, user["id"], text)
            )
            cur.execute(f"UPDATE {SCHEMA}.support_tickets SET updated_at=NOW() WHERE id=%s", (ticket_id,))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # POST /support/ticket/close — закрыть тикет (пользователь)
        if method == "POST" and path.endswith("/ticket/close"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            ticket_id = body.get("ticket_id")
            cur.execute(f"SELECT user_id FROM {SCHEMA}.support_tickets WHERE id=%s", (ticket_id,))
            row = cur.fetchone()
            if not row or (row[0] != user["id"] and not is_staff(user)):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            cur.execute(f"UPDATE {SCHEMA}.support_tickets SET status='closed', updated_at=NOW() WHERE id=%s", (ticket_id,))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── OPERATOR: список всех тикетов ─────────────────────────────────
        # GET /support/admin/tickets
        if method == "GET" and path.endswith("/admin/tickets"):
            if not is_staff(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            status_filter = qs.get("status", "open")
            cur.execute(
                f"""SELECT t.id, t.user_id, u.username, t.subject, t.status,
                           t.operator_id, op.username,
                           t.updated_at,
                           (SELECT COUNT(*) FROM {SCHEMA}.support_messages m WHERE m.ticket_id=t.id AND m.role='user') as msg_count
                    FROM {SCHEMA}.support_tickets t
                    JOIN {SCHEMA}.users u ON u.id=t.user_id
                    LEFT JOIN {SCHEMA}.users op ON op.id=t.operator_id
                    WHERE t.status=%s
                    ORDER BY t.updated_at DESC""",
                (status_filter,)
            )
            tickets = [{
                "id": r[0], "userId": r[1], "username": r[2], "subject": r[3],
                "status": r[4], "operatorId": r[5], "operatorName": r[6],
                "updatedAt": r[7].strftime("%d.%m %H:%M"), "msgCount": r[8]
            } for r in cur.fetchall()]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"tickets": tickets})}

        # GET /support/admin/ticket/{id} — история тикета
        if method == "GET" and "/admin/ticket/" in path:
            if not is_staff(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            ticket_id = path.split("/admin/ticket/")[-1].rstrip("/")
            cur.execute(
                f"""SELECT t.id, t.user_id, u.username, t.subject, t.status, t.operator_id, op.username, t.created_at
                    FROM {SCHEMA}.support_tickets t
                    JOIN {SCHEMA}.users u ON u.id=t.user_id
                    LEFT JOIN {SCHEMA}.users op ON op.id=t.operator_id
                    WHERE t.id=%s""",
                (ticket_id,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            cur.execute(
                f"SELECT id, from_user, role, text, created_at FROM {SCHEMA}.support_messages WHERE ticket_id=%s ORDER BY created_at",
                (ticket_id,)
            )
            messages = [{"id": r[0], "fromUser": r[1], "role": r[2], "text": r[3],
                         "time": r[4].strftime("%H:%M %d.%m")} for r in cur.fetchall()]
            # Имена пользователей для сообщений
            cur.execute(f"SELECT id, username FROM {SCHEMA}.users WHERE role IN ('user','staff','admin')")
            unames = {r[0]: r[1] for r in cur.fetchall()}
            for m in messages:
                if m["fromUser"] in unames:
                    m["fromUsername"] = unames[m["fromUser"]]
                else:
                    m["fromUsername"] = m["fromUser"]
            # Назначаем оператора если ещё не назначен
            if not row[5]:
                cur.execute(f"UPDATE {SCHEMA}.support_tickets SET operator_id=%s WHERE id=%s", (user["id"], ticket_id))
                conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "ticket": {"id": row[0], "userId": row[1], "username": row[2],
                           "subject": row[3], "status": row[4],
                           "operatorId": row[5] or user["id"],
                           "operatorName": row[6] or user["username"],
                           "messages": messages}
            })}

        # POST /support/admin/reply — ответить в тикет
        if method == "POST" and path.endswith("/admin/reply"):
            if not is_staff(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            ticket_id = body.get("ticket_id")
            text = (body.get("text") or "").strip()
            if not ticket_id or not text:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "missing_fields"})}
            cur.execute(f"SELECT user_id, status FROM {SCHEMA}.support_tickets WHERE id=%s", (ticket_id,))
            ticket = cur.fetchone()
            if not ticket:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            cur.execute(
                f"INSERT INTO {SCHEMA}.support_messages (ticket_id, from_user, role, text) VALUES (%s,%s,'operator',%s)",
                (ticket_id, user["id"], text)
            )
            cur.execute(
                f"UPDATE {SCHEMA}.support_tickets SET operator_id=%s, updated_at=NOW() WHERE id=%s",
                (user["id"], ticket_id)
            )
            # Уведомляем пользователя
            add_notification(cur, ticket[0], "system",
                "Ответ от поддержки",
                f"Оператор {user['username']} ответил на ваш тикет #{ticket_id}.")
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # POST /support/admin/assign — назначить оператора на тикет
        if method == "POST" and path.endswith("/admin/assign"):
            if not is_staff(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            ticket_id = body.get("ticket_id")
            operator_id = body.get("operator_id") or user["id"]
            cur.execute(f"UPDATE {SCHEMA}.support_tickets SET operator_id=%s WHERE id=%s", (operator_id, ticket_id))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ═══════════════════════════════════════════════════════════════════
        # ── СПОРЫ ───────────────────────────────────────────────────────────
        # ═══════════════════════════════════════════════════════════════════

        # GET /support/admin/disputes — список всех споров
        if method == "GET" and path.endswith("/admin/disputes"):
            if not is_staff(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            cur.execute(
                f"""SELECT d.id, d.product_name, d.category, d.amount, d.status,
                           d.buyer_id, ub.username as buyer,
                           d.seller_id, us.username as seller,
                           d.arbiter_id, ua.username as arbiter,
                           d.created_at, d.updated_at
                    FROM {SCHEMA}.deals d
                    JOIN {SCHEMA}.users ub ON ub.id=d.buyer_id
                    JOIN {SCHEMA}.users us ON us.id=d.seller_id
                    LEFT JOIN {SCHEMA}.users ua ON ua.id=d.arbiter_id
                    WHERE d.status='dispute'
                    ORDER BY d.updated_at DESC"""
            )
            disputes = [{
                "id": r[0], "product": r[1], "category": r[2],
                "amount": float(r[3]), "status": r[4],
                "buyerId": r[5], "buyerName": r[6],
                "sellerId": r[7], "sellerName": r[8],
                "arbiterId": r[9], "arbiterName": r[10],
                "date": r[11].strftime("%d.%m.%Y"),
                "updatedAt": r[12].strftime("%d.%m %H:%M"),
            } for r in cur.fetchall()]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"disputes": disputes})}

        # GET /support/admin/dispute/{id}/messages — сообщения спора
        if method == "GET" and "/admin/dispute/" in path and path.endswith("/messages"):
            if not is_staff(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            deal_id = path.split("/admin/dispute/")[-1].replace("/messages", "")
            cur.execute(
                f"""SELECT dm.id, dm.from_user, u.username, dm.role, dm.text, dm.is_system, dm.created_at
                    FROM {SCHEMA}.dispute_messages dm
                    LEFT JOIN {SCHEMA}.users u ON u.id=dm.from_user
                    WHERE dm.deal_id=%s ORDER BY dm.created_at""",
                (deal_id,)
            )
            messages = [{
                "id": r[0], "fromUser": r[1], "fromUsername": r[2] or r[3],
                "role": r[3], "text": r[4], "isSystem": r[5],
                "time": r[6].strftime("%H:%M %d.%m")
            } for r in cur.fetchall()]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"messages": messages})}

        # POST /support/admin/dispute/message — отправить сообщение арбитра в спор
        if method == "POST" and path.endswith("/admin/dispute/message"):
            if not is_staff(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            deal_id = body.get("deal_id")
            text = (body.get("text") or "").strip()
            if not deal_id or not text:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "missing_fields"})}
            cur.execute(
                f"INSERT INTO {SCHEMA}.dispute_messages (deal_id, from_user, role, text) VALUES (%s,%s,'arbiter',%s)",
                (deal_id, user["id"], text)
            )
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # POST /support/admin/dispute/resolve — решить спор
        if method == "POST" and path.endswith("/admin/dispute/resolve"):
            if not is_staff(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            deal_id = body.get("deal_id")
            refund_buyer = body.get("refund_buyer", False)  # True = вернуть покупателю, False = отдать продавцу

            cur.execute(
                f"""SELECT d.amount, d.buyer_id, d.seller_id, ub.username, us.username
                    FROM {SCHEMA}.deals d
                    JOIN {SCHEMA}.users ub ON ub.id=d.buyer_id
                    JOIN {SCHEMA}.users us ON us.id=d.seller_id
                    WHERE d.id=%s AND d.status='dispute'""",
                (deal_id,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}

            amount, buyer_id, seller_id, buyer_name, seller_name = row
            amount = float(amount)
            seller_gets = round(amount * (1 - PLATFORM_COMMISSION / 100), 2)

            if refund_buyer:
                # Возврат покупателю
                cur.execute(
                    f"UPDATE {SCHEMA}.users SET balance_rub=balance_rub+%s WHERE id=%s",
                    (amount, buyer_id)
                )
                cur.execute(
                    f"UPDATE {SCHEMA}.users SET locked_rub=GREATEST(0, locked_rub-%s) WHERE id=%s",
                    (seller_gets, seller_id)
                )
                cur.execute(
                    f"UPDATE {SCHEMA}.deals SET status='refunded', updated_at=NOW() WHERE id=%s",
                    (deal_id,)
                )
                add_notification(cur, buyer_id, "deal_bought",
                    "Спор решён — средства возвращены",
                    f"По сделке {deal_id} принято решение в вашу пользу. На баланс возвращено ₽{amount:,.0f}.", shield=True)
                add_notification(cur, seller_id, "deal_sold",
                    "Спор решён — возврат покупателю",
                    f"По сделке {deal_id} принято решение в пользу покупателя.")
            else:
                # Деньги продавцу
                cur.execute(
                    f"""UPDATE {SCHEMA}.users
                        SET balance_rub=balance_rub+%s, locked_rub=GREATEST(0, locked_rub-%s)
                        WHERE id=%s""",
                    (seller_gets, seller_gets, seller_id)
                )
                cur.execute(
                    f"UPDATE {SCHEMA}.deals SET status='completed', updated_at=NOW() WHERE id=%s",
                    (deal_id,)
                )
                add_notification(cur, seller_id, "deal_sold",
                    "Спор решён — средства зачислены",
                    f"По сделке {deal_id} принято решение в вашу пользу. Зачислено ₽{seller_gets:,.0f}.", shield=True)
                add_notification(cur, buyer_id, "deal_bought",
                    "Спор решён",
                    f"По сделке {deal_id} принято решение в пользу продавца.")

            cur.execute(
                f"INSERT INTO {SCHEMA}.dispute_messages (deal_id, from_user, role, text, is_system) VALUES (%s,'system','arbiter',%s,TRUE)",
                (deal_id, f"Спор закрыт арбитром {user['username']}. {'Средства возвращены покупателю.' if refund_buyer else 'Средства переданы продавцу.'}")
            )
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # POST /support/admin/dispute/assign — назначить арбитра
        if method == "POST" and path.endswith("/admin/dispute/assign"):
            if not is_staff(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            deal_id = body.get("deal_id")
            arbiter_id = body.get("arbiter_id") or user["id"]  # если не указан — себе
            cur.execute(f"UPDATE {SCHEMA}.deals SET arbiter_id=%s WHERE id=%s", (arbiter_id, deal_id))
            cur.execute(
                f"INSERT INTO {SCHEMA}.dispute_messages (deal_id, from_user, role, text, is_system) VALUES (%s,'system','arbiter',%s,TRUE)",
                (deal_id, f"Арбитр назначен: {user['username']}.")
            )
            add_notification(cur, arbiter_id, "dispute",
                "Назначен арбитром",
                f"Вы назначены арбитром по сделке {deal_id}.", shield=True)
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # POST /support/admin/chat-ban — навсегда закрыть доступ к чату
        if method == "POST" and path.endswith("/admin/chat-ban"):
            if not is_staff(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            target_id = body.get("user_id")
            cur.execute(f"SELECT is_owner FROM {SCHEMA}.users WHERE id=%s", (target_id,))
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            if row[0]:
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "owner_protected"})}
            cur.execute(f"UPDATE {SCHEMA}.users SET chat_banned=TRUE WHERE id=%s", (target_id,))
            # Закрываем все открытые тикеты
            cur.execute(f"UPDATE {SCHEMA}.support_tickets SET status='closed' WHERE user_id=%s AND status='open'", (target_id,))
            add_notification(cur, target_id, "system",
                "Доступ к чату поддержки закрыт",
                "Доступ к чату поддержки закрыт навсегда за нарушение правил платформы.")
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # POST /support/admin/perma-ban — вечная блокировка аккаунта
        if method == "POST" and path.endswith("/admin/perma-ban"):
            if not is_staff(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            target_id = body.get("user_id")
            cur.execute(f"SELECT is_owner FROM {SCHEMA}.users WHERE id=%s", (target_id,))
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            if row[0]:
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "owner_protected"})}
            cur.execute(
                f"""UPDATE {SCHEMA}.users
                    SET perma_banned=TRUE, status='blocked', chat_banned=TRUE,
                        block_reason='Перманентная блокировка: нарушение правил'
                    WHERE id=%s""",
                (target_id,)
            )
            # Аннулируем все сессии
            cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at=NOW() WHERE user_id=%s", (target_id,))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # GET /support/admin/operators — список доступных операторов
        if method == "GET" and path.endswith("/admin/operators"):
            if not is_staff(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            cur.execute(
                f"""SELECT id, username, role FROM {SCHEMA}.users
                    WHERE role IN ('admin','staff') OR is_owner=TRUE
                    ORDER BY username"""
            )
            ops = [{"id": r[0], "username": r[1], "role": r[2]} for r in cur.fetchall()]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"operators": ops})}

        return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}

    except Exception as e:
        conn.rollback()
        return {"statusCode": 500, "headers": CORS, "body": json.dumps({"error": str(e)})}
    finally:
        conn.close()