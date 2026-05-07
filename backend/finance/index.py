"""
Финансы: пополнения, выводы, уведомления, профиль, отзывы, административные действия.
"""
import json, os, secrets
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA") or "t_p38600009_virtual_asset_trader"
PLATFORM_COMMISSION = 5

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
        f"""SELECT u.id, u.username, u.balance_rub, u.role, u.is_owner, u.verified, u.status
            FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id=s.user_id
            WHERE s.token=%s AND s.expires_at > NOW()""",
        (token,)
    )
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "username": row[1], "balance_rub": float(row[2]),
            "role": row[3], "is_owner": row[4], "verified": row[5], "status": row[6]}

def add_notification(cur, user_id, ntype, title, text, shield=False):
    nid = secrets.token_hex(8)
    cur.execute(
        f"""INSERT INTO {SCHEMA}.notifications (id, user_id, type, title, text, shield)
            VALUES (%s,%s,%s,%s,%s,%s)""",
        (nid, user_id, ntype, title, text, shield)
    )

def require_admin(user):
    return user and user["role"] in ("admin", "staff")

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
        user = get_user_by_token(cur, token)

        # ── GET /finance/notifications ────────────────────────────────────────
        if method == "GET" and path.endswith("/notifications"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            cur.execute(
                f"""SELECT id, type, title, text, shield, read, created_at
                    FROM {SCHEMA}.notifications WHERE user_id=%s ORDER BY created_at DESC LIMIT 50""",
                (user["id"],)
            )
            notifs = [{"id": r[0], "type": r[1], "title": r[2], "text": r[3],
                       "shield": r[4], "read": r[5],
                       "date": r[6].strftime("%d.%m.%Y %H:%M")} for r in cur.fetchall()]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"notifications": notifs})}

        # ── POST /finance/notifications/read ──────────────────────────────────
        if method == "POST" and path.endswith("/read"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            notif_id = body.get("id")
            cur.execute(
                f"UPDATE {SCHEMA}.notifications SET read=TRUE WHERE id=%s AND user_id=%s",
                (notif_id, user["id"])
            )
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── POST /finance/deposit — создать заявку, получить реквизит ───────────
        if method == "POST" and path.endswith("/deposit"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            amount   = float(body.get("amount") or 0)
            currency = body.get("currency") or "RUB"
            if amount <= 0:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_data"})}

            # Проверяем, нет ли уже незакрытой заявки у пользователя
            cur.execute(
                f"""SELECT id, expires_at FROM {SCHEMA}.deposits
                    WHERE user_id=%s AND status='awaiting_payment'
                    AND expires_at > NOW() LIMIT 1""",
                (user["id"],)
            )
            existing = cur.fetchone()
            if existing:
                return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "already_pending", "depId": existing[0]})}

            # Берём рандомный активный реквизит (по кругу)
            cur.execute(
                f"""SELECT id, name, type, details, bank, currency, show_count
                    FROM {SCHEMA}.deposit_requisites WHERE active=TRUE
                    ORDER BY show_count ASC, random() LIMIT 1"""
            )
            req_row = cur.fetchone()
            if not req_row:
                return {"statusCode": 503, "headers": CORS, "body": json.dumps({"error": "no_requisites"})}

            req_id, req_name, req_type_val, req_details, req_bank, req_currency, show_count = req_row

            # Обновляем счётчик показов
            cur.execute(f"UPDATE {SCHEMA}.deposit_requisites SET show_count=show_count+1 WHERE id=%s", (req_id,))
            cur.execute(f"SELECT MIN(show_count), MAX(show_count) FROM {SCHEMA}.deposit_requisites WHERE active=TRUE")
            mn, mx = cur.fetchone()
            if mn == mx and mn > 0:
                cur.execute(f"UPDATE {SCHEMA}.deposit_requisites SET show_count=0 WHERE active=TRUE")

            import datetime as dt
            expires_at = dt.datetime.now() + dt.timedelta(minutes=15)
            dep_id = "DEP-" + secrets.token_hex(3).upper()

            cur.execute(
                f"""INSERT INTO {SCHEMA}.deposits
                    (id, user_id, amount, currency, requisite_type, requisite_id, requisite_name, requisite_details, status, expires_at)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,'awaiting_payment',%s)""",
                (dep_id, user["id"], amount, currency, req_type_val, req_id, req_name, req_details, expires_at)
            )
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "id": dep_id,
                "requisite": {
                    "name": req_name,
                    "type": req_type_val,
                    "details": req_details,
                    "bank": req_bank,
                    "currency": req_currency,
                },
                "expiresAt": expires_at.isoformat(),
                "amount": amount,
            })}

        # ── POST /finance/deposit/paid — пользователь нажал «Оплатил» ─────────
        if method == "POST" and path.endswith("/deposit/paid"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            dep_id = body.get("dep_id")
            cur.execute(
                f"""SELECT id, amount, currency, requisite_name FROM {SCHEMA}.deposits
                    WHERE id=%s AND user_id=%s AND status='awaiting_payment'""",
                (dep_id, user["id"])
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            _, amount, currency, req_name = row

            cur.execute(
                f"UPDATE {SCHEMA}.deposits SET status='pending' WHERE id=%s",
                (dep_id,)
            )
            # Уведомляем пользователя
            add_notification(cur, user["id"], "deposit_update",
                "Заявка на пополнение отправлена",
                f"Заявка {dep_id} на {float(amount):,.0f} {currency} поступила в обработку. Ожидайте подтверждения.")

            # Уведомляем всех админов
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE role='admin' OR is_owner=TRUE")
            for (admin_id,) in cur.fetchall():
                add_notification(cur, admin_id, "deposit_update",
                    f"Новое пополнение от {user['username']}",
                    f"Заявка {dep_id} · {float(amount):,.0f} {currency} · {req_name}. Ожидает подтверждения.",
                    shield=True)
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── POST /finance/deposit/cancel — пользователь отменяет ─────────────
        if method == "POST" and path.endswith("/deposit/cancel"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            dep_id = body.get("dep_id")
            cur.execute(
                f"""UPDATE {SCHEMA}.deposits SET status='cancelled', cancelled_at=NOW()
                    WHERE id=%s AND user_id=%s AND status='awaiting_payment'""",
                (dep_id, user["id"])
            )
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── GET /finance/deposit/active — активная заявка пользователя ────────
        if method == "GET" and path.endswith("/deposit/active"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            cur.execute(
                f"""SELECT id, amount, currency, requisite_name, requisite_details,
                           requisite_id, status, expires_at, created_at
                    FROM {SCHEMA}.deposits
                    WHERE user_id=%s AND status IN ('awaiting_payment','pending')
                    ORDER BY created_at DESC LIMIT 1""",
                (user["id"],)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"deposit": None})}
            # Подтягиваем полные реквизиты
            req_name = row[3]
            req_details = row[4]
            req_id = row[5]
            cur.execute(
                f"SELECT name, type, details, bank, currency FROM {SCHEMA}.deposit_requisites WHERE id=%s",
                (req_id,)
            )
            req_row = cur.fetchone()
            requisite = None
            if req_row:
                requisite = {"name": req_row[0], "type": req_row[1], "details": req_row[2],
                             "bank": req_row[3], "currency": req_row[4]}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "deposit": {
                    "id": row[0], "amount": float(row[1]), "currency": row[2],
                    "requisiteName": req_name, "requisiteDetails": req_details,
                    "status": row[6],
                    "expiresAt": row[7].isoformat() if row[7] else None,
                    "requisite": requisite,
                }
            })}

        # ── GET /finance/deposits (admin) ─────────────────────────────────────
        if method == "GET" and path.endswith("/deposits"):
            if not require_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            cur.execute(
                f"""SELECT d.id, d.user_id, u.username, d.amount, d.currency,
                           d.requisite_type, d.requisite_name, d.requisite_details, d.status, d.created_at
                    FROM {SCHEMA}.deposits d JOIN {SCHEMA}.users u ON u.id=d.user_id
                    WHERE d.status='pending' ORDER BY d.created_at ASC""",
            )
            deps = [{"id": r[0], "userId": r[1], "username": r[2], "amount": float(r[3]),
                     "currency": r[4], "requisiteType": r[5], "requisiteName": r[6],
                     "requisiteDetails": r[7], "status": r[8],
                     "date": r[9].strftime("%d.%m.%Y")} for r in cur.fetchall()]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"deposits": deps})}

        # ── POST /finance/deposits/confirm ────────────────────────────────────
        if method == "POST" and path.endswith("/confirm"):
            if not require_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            dep_id = body.get("id")
            cur.execute(
                f"SELECT user_id, amount, currency FROM {SCHEMA}.deposits WHERE id=%s AND status='pending'",
                (dep_id,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            uid, amount, currency = row
            amount = float(amount)

            if currency == "RUB":
                cur.execute(f"UPDATE {SCHEMA}.users SET balance_rub=balance_rub+%s WHERE id=%s", (amount, uid))
            cur.execute(f"UPDATE {SCHEMA}.deposits SET status='confirmed' WHERE id=%s", (dep_id,))

            add_notification(cur, uid, "deposit_update",
                "Пополнение подтверждено",
                f"Ваш баланс пополнен на {amount:,.0f} {currency}. Заявка {dep_id} обработана.")
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── POST /finance/deposits/reject ─────────────────────────────────────
        if method == "POST" and path.endswith("/reject"):
            if not require_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            dep_id = body.get("id")
            cur.execute(
                f"SELECT user_id FROM {SCHEMA}.deposits WHERE id=%s AND status='pending'",
                (dep_id,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            uid = row[0]
            cur.execute(f"UPDATE {SCHEMA}.deposits SET status='not_found' WHERE id=%s", (dep_id,))
            add_notification(cur, uid, "deposit_update",
                "Оплата не обнаружена",
                f"По заявке {dep_id} оплата не найдена. Обратитесь в поддержку.")
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── POST /finance/withdraw ────────────────────────────────────────────
        if method == "POST" and path.endswith("/withdraw"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            amount    = float(body.get("amount") or 0)
            currency  = body.get("currency") or "RUB"
            req_type  = body.get("requisite_type") or ""
            req_details = body.get("requisite_details") or ""
            commission  = float(body.get("commission") or PLATFORM_COMMISSION)

            if amount <= 0 or not req_type:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_data"})}
            if user["balance_rub"] < amount:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "no_balance"})}

            to_receive = round(amount * (1 - commission / 100), 2)
            wd_id = "WD-" + secrets.token_hex(3).upper()

            cur.execute(
                f"""INSERT INTO {SCHEMA}.withdrawals
                    (id, user_id, amount, currency, commission, to_receive, requisite_type, requisite_details)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
                (wd_id, user["id"], amount, currency, commission, to_receive, req_type, req_details)
            )
            cur.execute(f"UPDATE {SCHEMA}.users SET balance_rub=balance_rub-%s WHERE id=%s", (amount, user["id"]))

            add_notification(cur, user["id"], "withdraw_update",
                "Заявка на вывод создана",
                f"Заявка {wd_id} на вывод {amount:,.0f} {currency} подана. К получению: {to_receive:,.0f}.")
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"id": wd_id, "to_receive": to_receive})}

        # ── GET /finance/withdrawals (user's own) ─────────────────────────────
        if method == "GET" and path.endswith("/withdrawals"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            cur.execute(
                f"""SELECT id, amount, currency, commission, to_receive,
                           requisite_type, requisite_details, status, created_at
                    FROM {SCHEMA}.withdrawals WHERE user_id=%s ORDER BY created_at DESC""",
                (user["id"],)
            )
            wds = [{"id": r[0], "amount": float(r[1]), "currency": r[2],
                    "commission": float(r[3]), "toReceive": float(r[4]),
                    "requisiteType": r[5], "requisiteDetails": r[6],
                    "status": r[7], "date": r[8].strftime("%d.%m.%Y")} for r in cur.fetchall()]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"withdrawals": wds})}

        # ── POST /finance/review ──────────────────────────────────────────────
        if method == "POST" and path.endswith("/review"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            seller_id = body.get("seller_id")
            rating    = int(body.get("rating") or 0)
            text      = (body.get("text") or "").strip()

            if not seller_id or not rating or not text:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_data"})}

            # Только если есть завершённая сделка
            cur.execute(
                f"""SELECT id FROM {SCHEMA}.deals
                    WHERE buyer_id=%s AND seller_id=%s
                    AND status IN ('completed','hold_cs2','hold_pubg','refunded')
                    LIMIT 1""",
                (user["id"], seller_id)
            )
            if not cur.fetchone():
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "not_buyer"})}

            rev_id = "r-" + secrets.token_hex(4)
            cur.execute(
                f"INSERT INTO {SCHEMA}.reviews (id, seller_id, from_user_id, rating, text) VALUES (%s,%s,%s,%s,%s)",
                (rev_id, seller_id, user["id"], rating, text)
            )
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── GET /finance/admin/users (admin only) ─────────────────────────────
        if method == "GET" and path.endswith("/admin/users"):
            if not require_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            cur.execute(
                f"""SELECT id, account_id, username, email, role, is_owner,
                           staff_perms, status, freeze_reason, block_reason,
                           verified, balance_rub, locked_rub, deals_count, joined_at
                    FROM {SCHEMA}.users ORDER BY created_at ASC"""
            )
            cols = ["id","accountId","username","email","role","isOwner","staffPerms",
                    "status","freezeReason","blockReason","verified",
                    "balanceRub","lockedRub","dealsCount","joinedAt"]
            users_list = []
            for row in cur.fetchall():
                d = dict(zip(cols, row))
                d["balanceRub"] = float(d["balanceRub"])
                d["lockedRub"]  = float(d["lockedRub"])
                d["joinedAt"]   = d["joinedAt"].strftime("%d.%m.%Y") if d["joinedAt"] else ""
                users_list.append(d)
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"users": users_list})}

        # ── POST /finance/admin/user-status ───────────────────────────────────
        if method == "POST" and path.endswith("/user-status"):
            if not require_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            target_id = body.get("user_id")
            status    = body.get("status")  # active | frozen | blocked
            reason    = body.get("reason") or ""

            cur.execute(f"SELECT is_owner FROM {SCHEMA}.users WHERE id=%s", (target_id,))
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            if row[0]:
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "owner_protected"})}

            if status == "blocked":
                cur.execute(f"UPDATE {SCHEMA}.users SET status='blocked', block_reason=%s WHERE id=%s", (reason, target_id))
            elif status == "frozen":
                cur.execute(f"UPDATE {SCHEMA}.users SET status='frozen', freeze_reason=%s WHERE id=%s", (reason or "Подозрительная активность на платформе", target_id))
            elif status == "active":
                cur.execute(f"UPDATE {SCHEMA}.users SET status='active', block_reason=NULL, freeze_reason=NULL WHERE id=%s", (target_id,))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── GET /finance/admin/withdrawals ────────────────────────────────────
        if method == "GET" and path.endswith("/admin/withdrawals"):
            if not require_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            cur.execute(
                f"""SELECT w.id, w.user_id, u.username, w.amount, w.currency,
                           w.commission, w.to_receive, w.requisite_type, w.requisite_details,
                           w.status, w.created_at
                    FROM {SCHEMA}.withdrawals w JOIN {SCHEMA}.users u ON u.id=w.user_id
                    ORDER BY w.created_at DESC LIMIT 100"""
            )
            wds = [{"id": r[0], "userId": r[1], "username": r[2],
                    "amount": float(r[3]), "currency": r[4],
                    "commission": float(r[5]), "toReceive": float(r[6]),
                    "requisiteType": r[7], "requisiteDetails": r[8],
                    "status": r[9], "date": r[10].strftime("%d.%m.%Y")} for r in cur.fetchall()]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"withdrawals": wds})}

        # ── POST /finance/admin/withdrawal-status ─────────────────────────────
        if method == "POST" and path.endswith("/withdrawal-status"):
            if not require_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            wd_id  = body.get("id")
            status = body.get("status")
            cur.execute(f"UPDATE {SCHEMA}.withdrawals SET status=%s WHERE id=%s", (status, wd_id))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── GET /finance/admin/stats ──────────────────────────────────────────
        if method == "GET" and path.endswith("/admin/stats"):
            if not require_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}

            # ── Сделки: всего, объём, открытые ───────────────────────────────
            cur.execute(
                f"""SELECT
                    COUNT(*) FILTER (WHERE status IN ('completed','refunded','hold_cs2','hold_pubg')) AS total_deals,
                    COALESCE(SUM(amount) FILTER (WHERE status IN ('completed','refunded','hold_cs2','hold_pubg')), 0) AS total_volume,
                    COUNT(*) FILTER (WHERE status = 'escrow') AS open_deals,
                    COALESCE(SUM(amount) FILTER (WHERE status = 'escrow'), 0) AS open_volume,
                    COUNT(*) FILTER (WHERE status = 'completed') AS completed_deals
                FROM {SCHEMA}.deals"""
            )
            r = cur.fetchone()
            total_deals    = int(r[0])
            total_volume   = float(r[1])
            open_deals     = int(r[2])
            open_volume    = float(r[3])
            completed_deals = int(r[4])
            success_rate = round(completed_deals / total_deals * 100, 1) if total_deals > 0 else 100

            # ── Комиссия заработана ───────────────────────────────────────────
            cur.execute(
                f"""SELECT
                    COALESCE(SUM(amount * %s / 100) FILTER (WHERE status='completed'), 0) AS total,
                    COALESCE(SUM(amount * %s / 100) FILTER (WHERE status='completed' AND created_at >= NOW() - INTERVAL '1 day'), 0) AS day,
                    COALESCE(SUM(amount * %s / 100) FILTER (WHERE status='completed' AND created_at >= NOW() - INTERVAL '7 days'), 0) AS week,
                    COALESCE(SUM(amount * %s / 100) FILTER (WHERE status='completed' AND created_at >= NOW() - INTERVAL '30 days'), 0) AS month
                FROM {SCHEMA}.deals""",
                (PLATFORM_COMMISSION, PLATFORM_COMMISSION, PLATFORM_COMMISSION, PLATFORM_COMMISSION)
            )
            cr = cur.fetchone()
            commission = {
                "total": float(cr[0]),
                "day":   float(cr[1]),
                "week":  float(cr[2]),
                "month": float(cr[3]),
            }

            # ── Пользователи: всего + прирост по периодам ─────────────────────
            cur.execute(
                f"""SELECT
                    COUNT(*) FILTER (WHERE role='user') AS total,
                    COUNT(*) FILTER (WHERE role='user' AND created_at >= NOW() - INTERVAL '1 day') AS day,
                    COUNT(*) FILTER (WHERE role='user' AND created_at >= NOW() - INTERVAL '7 days') AS week,
                    COUNT(*) FILTER (WHERE role='user' AND created_at >= NOW() - INTERVAL '30 days') AS month,
                    status
                FROM {SCHEMA}.users GROUP BY status"""
            )
            # Для прироста — отдельный запрос без GROUP BY
            cur.execute(
                f"""SELECT
                    COUNT(*) FILTER (WHERE role='user') AS total,
                    COUNT(*) FILTER (WHERE role='user' AND created_at >= NOW() - INTERVAL '1 day') AS day,
                    COUNT(*) FILTER (WHERE role='user' AND created_at >= NOW() - INTERVAL '7 days') AS week,
                    COUNT(*) FILTER (WHERE role='user' AND created_at >= NOW() - INTERVAL '30 days') AS month
                FROM {SCHEMA}.users"""
            )
            ur = cur.fetchone()
            users_growth = {
                "total": int(ur[0]),
                "day":   int(ur[1]),
                "week":  int(ur[2]),
                "month": int(ur[3]),
            }

            cur.execute(f"SELECT status, COUNT(*) FROM {SCHEMA}.users WHERE role='user' GROUP BY status")
            user_stats = {row[0]: int(row[1]) for row in cur.fetchall()}

            # ── Выводы: ожидающие + суммы по периодам ────────────────────────
            cur.execute(
                f"""SELECT
                    COUNT(*) FILTER (WHERE status IN ('pending','processing')) AS pending_count,
                    COALESCE(SUM(amount) FILTER (WHERE status IN ('pending','processing')), 0) AS pending_volume,
                    COALESCE(SUM(amount) FILTER (WHERE status IN ('pending','processing') AND created_at >= NOW() - INTERVAL '1 day'), 0) AS day,
                    COALESCE(SUM(amount) FILTER (WHERE status IN ('pending','processing') AND created_at >= NOW() - INTERVAL '7 days'), 0) AS week,
                    COALESCE(SUM(amount) FILTER (WHERE status IN ('pending','processing') AND created_at >= NOW() - INTERVAL '30 days'), 0) AS month
                FROM {SCHEMA}.withdrawals"""
            )
            wr = cur.fetchone()
            withdrawals_stats = {
                "pendingCount":  int(wr[0]),
                "pendingVolume": float(wr[1]),
                "day":   float(wr[2]),
                "week":  float(wr[3]),
                "month": float(wr[4]),
            }

            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                # Сделки
                "totalDeals":   total_deals,
                "totalVolume":  total_volume,
                "openDeals":    open_deals,
                "openVolume":   open_volume,
                "successRate":  success_rate,
                # Комиссия
                "commissionEarned": commission["total"],
                "commission":  commission,
                # Пользователи
                "registeredUsers": users_growth["total"],
                "usersGrowth": users_growth,
                "usersByStatus": user_stats,
                # Выводы
                "pendingWithdrawals":       withdrawals_stats["pendingCount"],
                "pendingWithdrawalsVolume": withdrawals_stats["pendingVolume"],
                "withdrawals": withdrawals_stats,
            })}

        # ── POST /finance/admin/staff ─────────────────────────────────────────
        if method == "POST" and path.endswith("/admin/staff"):
            if not require_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            target_id = body.get("user_id")
            action    = body.get("action")  # add | remove | update
            perms     = body.get("permissions") or []

            cur.execute(f"SELECT is_owner FROM {SCHEMA}.users WHERE id=%s", (target_id,))
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            if row[0]:
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "owner_protected"})}

            if action == "add":
                cur.execute(
                    f"UPDATE {SCHEMA}.users SET role='staff', staff_perms=%s WHERE id=%s",
                    (perms, target_id)
                )
            elif action == "remove":
                cur.execute(
                    f"UPDATE {SCHEMA}.users SET role='user', staff_perms='{{}}' WHERE id=%s",
                    (target_id,)
                )
            elif action == "update":
                cur.execute(
                    f"UPDATE {SCHEMA}.users SET staff_perms=%s WHERE id=%s",
                    (perms, target_id)
                )
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── POST /finance/admin/arbiter ───────────────────────────────────────
        if method == "POST" and path.endswith("/admin/arbiter"):
            if not require_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            deal_id    = body.get("deal_id")
            arbiter_id = body.get("arbiter_id")
            cur.execute(
                f"UPDATE {SCHEMA}.deals SET arbiter_id=%s WHERE id=%s AND status='dispute'",
                (arbiter_id, deal_id)
            )
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ════════════════════════════════════════════════════════════════════
        # ── РЕКВИЗИТЫ ВЫВОДА (личные реквизиты пользователя) ────────────────
        # ════════════════════════════════════════════════════════════════════

        # GET /finance/withdrawal-requisites
        if method == "GET" and path.endswith("/withdrawal-requisites"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            cur.execute(
                f"""SELECT id, type, phone, bank, card_number, card_holder, label, created_at
                    FROM {SCHEMA}.withdrawal_requisites WHERE user_id=%s ORDER BY created_at DESC""",
                (user["id"],)
            )
            rows = cur.fetchall()
            result = []
            for r in rows:
                result.append({
                    "id": r[0], "type": r[1], "phone": r[2], "bank": r[3],
                    "cardNumber": r[4], "cardHolder": r[5], "label": r[6],
                    "createdAt": r[7].strftime("%d.%m.%Y"),
                })
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"requisites": result})}

        # POST /finance/withdrawal-requisites/add
        if method == "POST" and path.endswith("/withdrawal-requisites/add"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            rtype = body.get("type")  # 'sbp' | 'card'
            label = (body.get("label") or "").strip() or None
            rid = "wr-" + secrets.token_hex(5)
            if rtype == "sbp":
                phone = (body.get("phone") or "").strip()
                bank  = (body.get("bank") or "").strip()
                if not phone or not bank:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "missing_fields"})}
                cur.execute(
                    f"INSERT INTO {SCHEMA}.withdrawal_requisites (id, user_id, type, phone, bank, label) VALUES (%s,%s,'sbp',%s,%s,%s)",
                    (rid, user["id"], phone, bank, label)
                )
            elif rtype == "card":
                card_number = (body.get("card_number") or "").strip()
                card_holder = (body.get("card_holder") or "").strip()
                if not card_number or not card_holder:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "missing_fields"})}
                cur.execute(
                    f"INSERT INTO {SCHEMA}.withdrawal_requisites (id, user_id, type, card_number, card_holder, label) VALUES (%s,%s,'card',%s,%s,%s)",
                    (rid, user["id"], card_number, card_holder, label)
                )
            else:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_type"})}
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"id": rid})}

        # POST /finance/withdrawal-requisites/delete
        if method == "POST" and path.endswith("/withdrawal-requisites/delete"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            rid = body.get("id")
            cur.execute(f"DELETE FROM {SCHEMA}.withdrawal_requisites WHERE id=%s AND user_id=%s", (rid, user["id"]))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ════════════════════════════════════════════════════════════════════
        # ── РЕКВИЗИТЫ ПОПОЛНЕНИЯ (рандомный из пула платформы) ───────────────
        # ════════════════════════════════════════════════════════════════════

        # GET /finance/deposit-requisite  — возвращает 1 рандомный активный реквизит
        # Логика: берём реквизит с наименьшим show_count, если все равны — рандом
        if method == "GET" and path.endswith("/deposit-requisite"):
            cur.execute(
                f"""SELECT id, name, type, details, bank, currency, show_count
                    FROM {SCHEMA}.deposit_requisites WHERE active=TRUE
                    ORDER BY show_count ASC, random() LIMIT 1"""
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "no_requisites"})}
            # Увеличиваем счётчик показов; если все реквизиты показаны одинаково много — сбрасываем (цикл)
            cur.execute(f"UPDATE {SCHEMA}.deposit_requisites SET show_count=show_count+1 WHERE id=%s", (row[0],))
            # Проверяем — если все реквизиты имеют одинаковый show_count — сбрасываем цикл
            cur.execute(f"SELECT MIN(show_count), MAX(show_count) FROM {SCHEMA}.deposit_requisites WHERE active=TRUE")
            mn, mx = cur.fetchone()
            if mn == mx and mn > 0:
                cur.execute(f"UPDATE {SCHEMA}.deposit_requisites SET show_count=0 WHERE active=TRUE")
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "id": row[0], "name": row[1], "type": row[2],
                "details": row[3], "bank": row[4], "currency": row[5],
            })}

        # ── Admin: управление реквизитами пополнения ──────────────────────
        # GET /finance/admin/deposit-requisites
        if method == "GET" and path.endswith("/admin/deposit-requisites"):
            if not require_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            cur.execute(f"SELECT id, name, type, details, bank, currency, active, show_count FROM {SCHEMA}.deposit_requisites ORDER BY created_at")
            rows = cur.fetchall()
            result = [{"id": r[0], "name": r[1], "type": r[2], "details": r[3],
                       "bank": r[4], "currency": r[5], "active": r[6], "showCount": r[7]} for r in rows]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"requisites": result})}

        # POST /finance/admin/deposit-requisites/add
        if method == "POST" and path.endswith("/admin/deposit-requisites/add"):
            if not require_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            rid = "dr-" + secrets.token_hex(4)
            cur.execute(
                f"INSERT INTO {SCHEMA}.deposit_requisites (id, name, type, details, bank, currency, active) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                (rid, body.get("name"), body.get("type"), body.get("details"),
                 body.get("bank"), body.get("currency", "RUB"), body.get("active", True))
            )
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"id": rid})}

        # POST /finance/admin/deposit-requisites/toggle
        if method == "POST" and path.endswith("/admin/deposit-requisites/toggle"):
            if not require_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            rid = body.get("id")
            cur.execute(f"UPDATE {SCHEMA}.deposit_requisites SET active=NOT active WHERE id=%s", (rid,))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # POST /finance/admin/deposit-requisites/delete
        if method == "POST" and path.endswith("/admin/deposit-requisites/delete"):
            if not require_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            rid = body.get("id")
            cur.execute(f"DELETE FROM {SCHEMA}.deposit_requisites WHERE id=%s", (rid,))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ════════════════════════════════════════════════════════════════════
        # ── ПАРТНЁРЫ ─────────────────────────────────────────────────────────
        # ════════════════════════════════════════════════════════════════════

        # POST /finance/partner/apply
        if method == "POST" and path.endswith("/partner/apply"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            platforms = body.get("platforms") or []
            if not platforms:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "missing_fields"})}
            # Минимальные требования: хотя бы одна платформа с >=2000 подписчиков и >=1000 просмотров
            valid = any(
                (p.get("subscribers", 0) >= 2000 and p.get("avg_views", 0) >= 1000)
                for p in platforms
            )
            if not valid:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "requirements_not_met"})}
            # Проверяем нет ли уже активной заявки
            cur.execute(f"SELECT id, status FROM {SCHEMA}.partner_applications WHERE user_id=%s ORDER BY created_at DESC LIMIT 1", (user["id"],))
            existing = cur.fetchone()
            if existing and existing[1] == "pending":
                return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "already_pending"})}
            # Уже партнёр?
            cur.execute(f"SELECT id FROM {SCHEMA}.partners WHERE user_id=%s AND active=TRUE", (user["id"],))
            if cur.fetchone():
                return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "already_partner"})}
            app_id = "pa-" + secrets.token_hex(6)
            cur.execute(
                f"INSERT INTO {SCHEMA}.partner_applications (id, user_id, platforms) VALUES (%s,%s,%s::jsonb)",
                (app_id, user["id"], json.dumps(platforms))
            )
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"id": app_id})}

        # GET /finance/partner/status
        if method == "GET" and path.endswith("/partner/status"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            # Проверяем партнёрство
            cur.execute(
                f"SELECT id, ref_code, commission_pct, total_earned, total_referrals, platforms FROM {SCHEMA}.partners WHERE user_id=%s AND active=TRUE",
                (user["id"],)
            )
            p = cur.fetchone()
            if p:
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                    "isPartner": True,
                    "refCode": p[1],
                    "commissionPct": float(p[2]),
                    "totalEarned": float(p[3]),
                    "totalReferrals": p[4],
                    "platforms": p[5],
                    "refUrl": f"https://gorant.shop?ref={p[1]}",
                })}
            # Проверяем заявку
            cur.execute(
                f"SELECT id, status, reject_reason, created_at FROM {SCHEMA}.partner_applications WHERE user_id=%s ORDER BY created_at DESC LIMIT 1",
                (user["id"],)
            )
            app = cur.fetchone()
            if app:
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                    "isPartner": False,
                    "application": {"id": app[0], "status": app[1], "rejectReason": app[2],
                                    "date": app[3].strftime("%d.%m.%Y")},
                })}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"isPartner": False, "application": None})}

        # ── Admin: управление партнёрами ─────────────────────────────────
        # GET /finance/admin/partner-applications
        if method == "GET" and path.endswith("/admin/partner-applications"):
            if not require_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            cur.execute(
                f"""SELECT pa.id, pa.user_id, u.username, u.email, pa.platforms, pa.status, pa.created_at
                    FROM {SCHEMA}.partner_applications pa JOIN {SCHEMA}.users u ON u.id=pa.user_id
                    ORDER BY pa.created_at DESC"""
            )
            rows = cur.fetchall()
            apps = [{"id": r[0], "userId": r[1], "username": r[2], "email": r[3],
                     "platforms": r[4], "status": r[5], "date": r[6].strftime("%d.%m.%Y")} for r in rows]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"applications": apps})}

        # POST /finance/admin/partner-approve
        if method == "POST" and path.endswith("/admin/partner-approve"):
            if not require_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            app_id = body.get("id")
            cur.execute(
                f"SELECT user_id, platforms FROM {SCHEMA}.partner_applications WHERE id=%s AND status='pending'",
                (app_id,)
            )
            app = cur.fetchone()
            if not app:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            target_user_id, platforms = app
            # Генерируем уникальный реф-код
            ref_code = secrets.token_urlsafe(8).upper()[:10]
            partner_id = "p-" + secrets.token_hex(5)
            cur.execute(
                f"INSERT INTO {SCHEMA}.partners (id, user_id, ref_code, platforms) VALUES (%s,%s,%s,%s::jsonb) ON CONFLICT (user_id) DO UPDATE SET active=TRUE",
                (partner_id, target_user_id, ref_code, json.dumps(platforms) if isinstance(platforms, list) else platforms)
            )
            cur.execute(
                f"UPDATE {SCHEMA}.partner_applications SET status='approved', reviewed_at=NOW(), reviewed_by=%s WHERE id=%s",
                (user["id"], app_id)
            )
            add_notification(cur, target_user_id, "system",
                "Заявка на партнёрство одобрена! 🎉",
                f"Ваша заявка одобрена. Ваша реферальная ссылка: https://gorant.shop?ref={ref_code}",
                shield=True)
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "refCode": ref_code})}

        # POST /finance/admin/partner-reject
        if method == "POST" and path.endswith("/admin/partner-reject"):
            if not require_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            app_id = body.get("id")
            reason = body.get("reason") or ""
            cur.execute(f"SELECT user_id FROM {SCHEMA}.partner_applications WHERE id=%s", (app_id,))
            app = cur.fetchone()
            if not app:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            cur.execute(
                f"UPDATE {SCHEMA}.partner_applications SET status='rejected', reject_reason=%s, reviewed_at=NOW(), reviewed_by=%s WHERE id=%s",
                (reason, user["id"], app_id)
            )
            add_notification(cur, app[0], "system",
                "Заявка на партнёрство отклонена",
                f"Причина: {reason or 'Не указана'}. Вы можете подать новую заявку.")
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # GET /finance/admin/partners
        if method == "GET" and path.endswith("/admin/partners"):
            if not require_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            cur.execute(
                f"""SELECT p.id, p.user_id, u.username, u.email, p.ref_code, p.commission_pct,
                           p.total_earned, p.total_referrals, p.active, p.created_at, p.platforms
                    FROM {SCHEMA}.partners p JOIN {SCHEMA}.users u ON u.id=p.user_id
                    ORDER BY p.created_at DESC"""
            )
            rows = cur.fetchall()
            partners = [{"id": r[0], "userId": r[1], "username": r[2], "email": r[3],
                         "refCode": r[4], "commissionPct": float(r[5]),
                         "totalEarned": float(r[6]), "totalReferrals": r[7],
                         "active": r[8], "date": r[9].strftime("%d.%m.%Y"),
                         "platforms": r[10]} for r in rows]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"partners": partners})}

        # POST /finance/admin/partner-toggle
        if method == "POST" and path.endswith("/admin/partner-toggle"):
            if not require_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            pid = body.get("id")
            cur.execute(f"UPDATE {SCHEMA}.partners SET active=NOT active WHERE id=%s", (pid,))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}

    except Exception as e:
        conn.rollback()
        return {"statusCode": 500, "headers": CORS, "body": json.dumps({"error": str(e)})}
    finally:
        conn.close()