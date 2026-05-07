"""
Финансы: пополнения, выводы, уведомления, профиль, отзывы, административные действия.
"""
import json, os, secrets
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
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
    path   = event.get("path", "/")
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

        # ── POST /finance/deposit ─────────────────────────────────────────────
        if method == "POST" and path.endswith("/deposit"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            amount   = float(body.get("amount") or 0)
            currency = body.get("currency") or "RUB"
            req_type = body.get("requisite_type") or ""
            if amount <= 0 or not req_type:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_data"})}

            dep_id = "DEP-" + secrets.token_hex(3).upper()
            cur.execute(
                f"""INSERT INTO {SCHEMA}.deposits (id, user_id, amount, currency, requisite_type)
                    VALUES (%s,%s,%s,%s,%s)""",
                (dep_id, user["id"], amount, currency, req_type)
            )
            add_notification(cur, user["id"], "deposit_update",
                "Заявка на пополнение создана",
                f"Заявка {dep_id} на {amount:,.0f} {currency} ожидает подтверждения.")
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"id": dep_id})}

        # ── GET /finance/deposits (admin) ─────────────────────────────────────
        if method == "GET" and path.endswith("/deposits"):
            if not require_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            cur.execute(
                f"""SELECT d.id, d.user_id, u.username, d.amount, d.currency,
                           d.requisite_type, d.status, d.created_at
                    FROM {SCHEMA}.deposits d JOIN {SCHEMA}.users u ON u.id=d.user_id
                    WHERE d.status='pending' ORDER BY d.created_at ASC""",
            )
            deps = [{"id": r[0], "userId": r[1], "username": r[2], "amount": float(r[3]),
                     "currency": r[4], "requisiteType": r[5], "status": r[6],
                     "date": r[7].strftime("%d.%m.%Y")} for r in cur.fetchall()]
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

            # Всего сделок и объём
            cur.execute(
                f"""SELECT COUNT(*), COALESCE(SUM(amount),0)
                    FROM {SCHEMA}.deals WHERE status IN ('completed','refunded','hold_cs2','hold_pubg')"""
            )
            r = cur.fetchone()
            total_deals, total_volume = int(r[0]), float(r[1])

            # Комиссия платформы
            cur.execute(
                f"""SELECT COALESCE(SUM(amount * %s / 100), 0)
                    FROM {SCHEMA}.deals WHERE status='completed'""",
                (PLATFORM_COMMISSION,)
            )
            commission_earned = float(cur.fetchone()[0])

            # Пользователи по статусу
            cur.execute(
                f"""SELECT status, COUNT(*) FROM {SCHEMA}.users
                    WHERE role='user' GROUP BY status"""
            )
            user_stats = {row[0]: row[1] for row in cur.fetchall()}

            # Успешных сделок %
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.deals WHERE status='completed'")
            completed = int(cur.fetchone()[0])
            success_rate = round(completed / total_deals * 100, 1) if total_deals > 0 else 100

            # Зарегистрированных пользователей
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users WHERE role='user'")
            registered = int(cur.fetchone()[0])

            # Ожидающие выводы
            cur.execute(f"SELECT COUNT(*), COALESCE(SUM(amount),0) FROM {SCHEMA}.withdrawals WHERE status='pending'")
            r2 = cur.fetchone()
            pending_withdrawals, pending_volume = int(r2[0]), float(r2[1])

            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "totalDeals": total_deals,
                "totalVolume": total_volume,
                "commissionEarned": commission_earned,
                "successRate": success_rate,
                "registeredUsers": registered,
                "usersByStatus": user_stats,
                "pendingWithdrawals": pending_withdrawals,
                "pendingWithdrawalsVolume": pending_volume,
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

        return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}

    except Exception as e:
        conn.rollback()
        return {"statusCode": 500, "headers": CORS, "body": json.dumps({"error": str(e)})}
    finally:
        conn.close()