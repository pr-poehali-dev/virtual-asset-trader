"""
Раздачи: администратор создаёт раздачу с призом и условием участия
(пополнить баланс на сумму X за период / продать на сумму X за период).
Пользователи, выполнившие условие в указанный период, могут принять участие.
По истечении срока среди участников случайно выбираются победители.
"""
import json, os, secrets, random
from datetime import datetime
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA") or "t_p38600009_virtual_asset_trader"

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
        f"""SELECT u.id, u.username, u.role, u.is_owner, u.status
            FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id=s.user_id
            WHERE s.token=%s AND s.expires_at > NOW()""",
        (token,)
    )
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "username": row[1], "role": row[2], "is_owner": row[3], "status": row[4]}


def is_admin(user):
    return bool(user) and (user["role"] in ("admin", "staff") or user.get("is_owner"))


def add_notification(cur, user_id, ntype, title, text, shield=False):
    nid = secrets.token_hex(8)
    cur.execute(
        f"INSERT INTO {SCHEMA}.notifications (id, user_id, type, title, text, shield) VALUES (%s,%s,%s,%s,%s,%s)",
        (nid, user_id, ntype, title, text, shield)
    )


def giveaway_row_to_dict(row):
    (gid, title, description, prize_description, prize_amount,
     requirement_type, requirement_amount, requirement_days,
     winners_count, status, visible, created_by, creator_name,
     created_at, expires_at, finished_at, participants_count) = row
    return {
        "id": gid, "title": title, "description": description,
        "prizeDescription": prize_description,
        "prizeAmount": float(prize_amount) if prize_amount is not None else None,
        "requirementType": requirement_type,
        "requirementAmount": float(requirement_amount),
        "requirementDays": requirement_days,
        "winnersCount": winners_count,
        "status": status, "visible": visible,
        "createdBy": created_by, "creatorName": creator_name,
        "createdAt": created_at.isoformat() if created_at else None,
        "expiresAt": expires_at.isoformat() if expires_at else None,
        "finishedAt": finished_at.isoformat() if finished_at else None,
        "participantsCount": participants_count,
    }


def select_giveaway_query(where_clause="", params=()):
    return (
        f"""SELECT g.id, g.title, g.description, g.prize_description, g.prize_amount,
                   g.requirement_type, g.requirement_amount, g.requirement_days,
                   g.winners_count, g.status, g.visible, g.created_by, c.username,
                   g.created_at, g.expires_at, g.finished_at,
                   (SELECT COUNT(*) FROM {SCHEMA}.giveaway_participants WHERE giveaway_id=g.id)
            FROM {SCHEMA}.giveaways g
            LEFT JOIN {SCHEMA}.users c ON c.id = g.created_by
            {where_clause}
            ORDER BY g.created_at DESC""",
        params
    )


def get_giveaway_winners(cur, giveaway_id):
    cur.execute(
        f"""SELECT gw.user_id, u.username FROM {SCHEMA}.giveaway_winners gw
            JOIN {SCHEMA}.users u ON u.id=gw.user_id WHERE gw.giveaway_id=%s""",
        (giveaway_id,)
    )
    return [{"userId": r[0], "username": r[1]} for r in cur.fetchall()]


def user_meets_requirement(cur, user_id, req_type, req_amount, since_dt):
    """Проверяет, выполнил ли пользователь условие участия за период с since_dt по сейчас."""
    if req_type == "deposit":
        cur.execute(
            f"""SELECT COALESCE(SUM(amount),0) FROM {SCHEMA}.deposits
                WHERE user_id=%s AND status='confirmed' AND created_at >= %s""",
            (user_id, since_dt)
        )
    else:  # 'sell'
        cur.execute(
            f"""SELECT COALESCE(SUM(amount),0) FROM {SCHEMA}.deals
                WHERE seller_id=%s AND status IN ('completed','hold','hold_cs2','hold_pubg')
                AND created_at >= %s""",
            (user_id, since_dt)
        )
    total = float(cur.fetchone()[0])
    return total >= req_amount, total


def finish_giveaway(cur, giveaway_id):
    cur.execute(
        f"SELECT status, winners_count, prize_amount FROM {SCHEMA}.giveaways WHERE id=%s FOR UPDATE",
        (giveaway_id,)
    )
    row = cur.fetchone()
    if not row or row[0] != "active":
        return
    winners_count, prize_amount = max(1, int(row[1] or 1)), row[2]

    cur.execute(
        f"SELECT user_id FROM {SCHEMA}.giveaway_participants WHERE giveaway_id=%s",
        (giveaway_id,)
    )
    participants = [r[0] for r in cur.fetchall()]

    if not participants:
        cur.execute(
            f"UPDATE {SCHEMA}.giveaways SET status='cancelled', finished_at=NOW() WHERE id=%s",
            (giveaway_id,)
        )
        return

    n = min(winners_count, len(participants))
    winners = random.sample(participants, n)

    for uid in winners:
        cur.execute(
            f"INSERT INTO {SCHEMA}.giveaway_winners (giveaway_id, user_id) VALUES (%s,%s)",
            (giveaway_id, uid)
        )
        if prize_amount:
            per_winner = round(float(prize_amount) / n, 2)
            cur.execute(
                f"UPDATE {SCHEMA}.users SET balance_rub = balance_rub + %s WHERE id=%s",
                (per_winner, uid)
            )
            add_notification(cur, uid, "giveaway_won", "Вы выиграли в раздаче!",
                f"Поздравляем! Вам начислено ₽{per_winner:,.0f}.", shield=True)
        else:
            add_notification(cur, uid, "giveaway_won", "Вы выиграли в раздаче!",
                "Поздравляем! Администрация свяжется с вами для выдачи приза.", shield=True)

    cur.execute(
        f"UPDATE {SCHEMA}.giveaways SET status='finished', finished_at=NOW() WHERE id=%s",
        (giveaway_id,)
    )


def finish_expired_giveaways(cur):
    cur.execute(f"SELECT id FROM {SCHEMA}.giveaways WHERE status='active' AND expires_at <= NOW()")
    for (gid,) in cur.fetchall():
        finish_giveaway(cur, gid)


def handler(event: dict, context) -> dict:
    """Раздачи: список, участие, создание/скрытие (админ)."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    _qs = event.get("queryStringParameters") or {}
    path = _qs.get("_path") or event.get("path") or "/"
    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass

    token = (event.get("headers") or {}).get("X-Session-Token")
    conn = get_conn()
    try:
        cur = conn.cursor()
        user = get_user_by_token(cur, token)

        # ── GET /giveaways — публичный список видимых активных раздач ──────────
        if method == "GET" and path.rstrip("/").endswith("/giveaways"):
            finish_expired_giveaways(cur)
            conn.commit()
            q, p = select_giveaway_query("WHERE g.visible=TRUE AND g.status='active'")
            cur.execute(q, p)
            giveaways = [giveaway_row_to_dict(r) for r in cur.fetchall()]

            # Помечаем участвует ли текущий пользователь
            if user and giveaways:
                ids = [g["id"] for g in giveaways]
                cur.execute(
                    f"SELECT giveaway_id FROM {SCHEMA}.giveaway_participants WHERE user_id=%s AND giveaway_id = ANY(%s)",
                    (user["id"], ids)
                )
                joined_ids = {r[0] for r in cur.fetchall()}
                for g in giveaways:
                    g["joined"] = g["id"] in joined_ids
            else:
                for g in giveaways:
                    g["joined"] = False
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"giveaways": giveaways})}

        # ── GET /giveaways/history — завершённые (публично) ────────────────────
        if method == "GET" and path.rstrip("/").endswith("/giveaways/history"):
            finish_expired_giveaways(cur)
            conn.commit()
            q, p = select_giveaway_query("WHERE g.status IN ('finished','cancelled') AND g.visible=TRUE")
            cur.execute(q, p)
            giveaways = [giveaway_row_to_dict(r) for r in cur.fetchall()]
            for g in giveaways:
                if g["status"] == "finished":
                    g["winners"] = get_giveaway_winners(cur, g["id"])
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"giveaways": giveaways})}

        # ── GET /giveaways/admin — все раздачи (для админки, включая скрытые) ──
        if method == "GET" and path.rstrip("/").endswith("/giveaways/admin"):
            if not is_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            finish_expired_giveaways(cur)
            conn.commit()
            q, p = select_giveaway_query()
            cur.execute(q, p)
            giveaways = [giveaway_row_to_dict(r) for r in cur.fetchall()]
            for g in giveaways:
                if g["status"] == "finished":
                    g["winners"] = get_giveaway_winners(cur, g["id"])
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"giveaways": giveaways})}

        # ── POST /giveaways — создать раздачу (только админ) ────────────────────
        if method == "POST" and path.rstrip("/").endswith("/giveaways"):
            if not is_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}

            title = (body.get("title") or "").strip()
            description = (body.get("description") or "").strip()
            prize_description = (body.get("prize_description") or "").strip()
            prize_amount = body.get("prize_amount")
            requirement_type = body.get("requirement_type")
            winners_count = int(body.get("winners_count") or 1)

            try:
                requirement_amount = float(body.get("requirement_amount"))
                requirement_days = int(body.get("requirement_days"))
                duration_days = int(body.get("duration_days"))
            except (TypeError, ValueError):
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_data"})}

            if not title or not prize_description or requirement_type not in ("deposit", "sell"):
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_data"})}
            if requirement_amount <= 0 or requirement_days <= 0 or duration_days <= 0:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_data"})}
            if winners_count < 1 or winners_count > 50:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_data"})}
            if prize_amount is not None:
                try:
                    prize_amount = float(prize_amount)
                except (TypeError, ValueError):
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_data"})}

            gid = "gv-" + secrets.token_hex(4)
            cur.execute(
                f"""INSERT INTO {SCHEMA}.giveaways
                    (id, title, description, prize_description, prize_amount,
                     requirement_type, requirement_amount, requirement_days,
                     winners_count, status, visible, created_by, expires_at)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,'active',TRUE,%s, NOW() + (%s || ' days')::interval)""",
                (gid, title, description, prize_description, prize_amount,
                 requirement_type, requirement_amount, requirement_days,
                 winners_count, user["id"], duration_days)
            )
            conn.commit()
            q, p = select_giveaway_query("WHERE g.id=%s", (gid,))
            cur.execute(q, p)
            giveaway = giveaway_row_to_dict(cur.fetchone())
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"giveaway": giveaway})}

        # ── POST /giveaways/toggle-visibility — скрыть/показать (админ) ─────────
        if method == "POST" and path.rstrip("/").endswith("/giveaways/toggle-visibility"):
            if not is_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            gid = body.get("id")
            if not gid:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "missing_fields"})}
            cur.execute(f"UPDATE {SCHEMA}.giveaways SET visible = NOT visible WHERE id=%s", (gid,))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── POST /giveaways/cancel — отменить раздачу (админ) ────────────────────
        if method == "POST" and path.rstrip("/").endswith("/giveaways/cancel"):
            if not is_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            gid = body.get("id")
            if not gid:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "missing_fields"})}
            cur.execute(
                f"UPDATE {SCHEMA}.giveaways SET status='cancelled', finished_at=NOW() WHERE id=%s AND status='active'",
                (gid,)
            )
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── POST /giveaways/join — принять участие ──────────────────────────────
        if method == "POST" and path.rstrip("/").endswith("/giveaways/join"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            if user["status"] in ("frozen", "blocked"):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            gid = body.get("id")
            if not gid:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "missing_fields"})}

            cur.execute(
                f"""SELECT requirement_type, requirement_amount, requirement_days, status
                    FROM {SCHEMA}.giveaways WHERE id=%s FOR UPDATE""",
                (gid,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            req_type, req_amount, req_days, status = row
            req_amount = float(req_amount)
            if status != "active":
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "wrong_status"})}

            cur.execute(
                f"SELECT 1 FROM {SCHEMA}.giveaway_participants WHERE giveaway_id=%s AND user_id=%s",
                (gid, user["id"])
            )
            if cur.fetchone():
                return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "already_joined"})}

            from datetime import timedelta
            since_dt = datetime.now() - timedelta(days=req_days)
            ok, total = user_meets_requirement(cur, user["id"], req_type, req_amount, since_dt)
            if not ok:
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({
                    "error": "requirement_not_met", "current": total, "required": req_amount
                })}

            cur.execute(
                f"INSERT INTO {SCHEMA}.giveaway_participants (giveaway_id, user_id) VALUES (%s,%s)",
                (gid, user["id"])
            )
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}

    except Exception as e:
        conn.rollback()
        return {"statusCode": 500, "headers": CORS, "body": json.dumps({"error": str(e)})}
    finally:
        conn.close()
