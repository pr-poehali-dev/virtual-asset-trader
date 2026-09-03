"""
Игры со ставками: администратор создаёт игру (сумма ставки, целевой банк, время),
пользователи делают ставки в общий банк. Когда банк достигает цели или истекает
время — случайно выбирается победитель (шанс пропорционален вкладу) и получает 90% банка.
"""
import json, os, secrets, random
from datetime import datetime
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA") or "t_p38600009_virtual_asset_trader"
WINNER_SHARE = 0.9
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


# ── DDoS-защита ────────────────────────────────────────────────────────────

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


def get_user_by_token(cur, token):
    if not token:
        return None
    cur.execute(
        f"""SELECT u.id, u.username, u.balance_rub, u.role, u.is_owner, u.status
            FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id=s.user_id
            WHERE s.token=%s AND s.expires_at > NOW()""",
        (token,)
    )
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "username": row[1], "balance_rub": float(row[2]),
            "role": row[3], "is_owner": row[4], "status": row[5]}


def is_admin(user):
    return bool(user) and (user["role"] == "admin" or user.get("is_owner"))


def add_notification(cur, user_id, ntype, title, text, shield=False):
    nid = secrets.token_hex(8)
    cur.execute(
        f"""INSERT INTO {SCHEMA}.notifications (id, user_id, type, title, text, shield)
            VALUES (%s,%s,%s,%s,%s,%s)""",
        (nid, user_id, ntype, title, text, shield)
    )


def game_row_to_dict(row):
    (gid, title, bet_amount, target_bank, duration_seconds, bank, status,
     winner_id, winner_amount, winner_name, winner_ticket_no, winners_count,
     created_by, creator_name, creator_role, creator_is_owner,
     created_at, expires_at, finished_at, participants_count) = row
    return {
        "id": gid,
        "title": title,
        "betAmount": float(bet_amount),
        "targetBank": float(target_bank),
        "durationSeconds": duration_seconds,
        "bank": float(bank),
        "status": status,
        "winnerId": winner_id,
        "winnerName": winner_name,
        "winnerAmount": float(winner_amount) if winner_amount is not None else None,
        "winnerTicketNo": winner_ticket_no,
        "winnersCount": winners_count,
        "createdBy": created_by,
        "creatorName": creator_name,
        "creatorRole": "owner" if creator_is_owner else creator_role,
        "createdAt": created_at.isoformat() if created_at else None,
        "expiresAt": expires_at.isoformat() if expires_at else None,
        "finishedAt": finished_at.isoformat() if finished_at else None,
        "participantsCount": participants_count,
    }


def select_game_query(where_clause="", params=()):
    return (
        f"""SELECT g.id, g.title, g.bet_amount, g.target_bank, g.duration_seconds, g.bank,
                   g.status, g.winner_id, g.winner_amount, w.username, g.winner_ticket_no, g.winners_count,
                   g.created_by, c.username, c.role, c.is_owner,
                   g.created_at, g.expires_at, g.finished_at,
                   (SELECT COUNT(DISTINCT user_id) FROM {SCHEMA}.game_bets WHERE game_id=g.id)
            FROM {SCHEMA}.games g
            LEFT JOIN {SCHEMA}.users w ON w.id = g.winner_id
            LEFT JOIN {SCHEMA}.users c ON c.id = g.created_by
            {where_clause}
            ORDER BY g.created_at DESC""",
        params
    )


def get_game_winners(cur, game_id):
    cur.execute(
        f"""SELECT gw.user_id, u.username, gw.ticket_no, gw.amount
            FROM {SCHEMA}.game_winners gw JOIN {SCHEMA}.users u ON u.id=gw.user_id
            WHERE gw.game_id=%s ORDER BY gw.amount DESC""",
        (game_id,)
    )
    return [{"userId": r[0], "username": r[1], "ticketNo": r[2], "amount": float(r[3])} for r in cur.fetchall()]


def finish_game(cur, game_id):
    """Подводит итоги игры: разыгрывает 90% банка между N победителями (задаётся при создании
    игры), выбранными случайно без повторов, с шансом пропорциональным сумме ставки."""
    cur.execute(
        f"SELECT id, bank, status, winners_count FROM {SCHEMA}.games WHERE id=%s FOR UPDATE",
        (game_id,)
    )
    row = cur.fetchone()
    if not row or row[2] != "active":
        return
    bank = float(row[1])
    winners_count = max(1, int(row[3] or 1))

    cur.execute(
        f"""SELECT user_id, SUM(amount) as total_amount,
                   (ARRAY_AGG(ticket_no ORDER BY random()))[1] as sample_ticket
            FROM {SCHEMA}.game_bets
            WHERE game_id=%s GROUP BY user_id""",
        (game_id,)
    )
    participants = [(uid, float(amt), tno) for uid, amt, tno in cur.fetchall()]

    if not participants or bank <= 0:
        cur.execute(
            f"UPDATE {SCHEMA}.games SET status='cancelled', finished_at=NOW() WHERE id=%s",
            (game_id,)
        )
        return

    n = min(winners_count, len(participants))

    # Взвешенный случайный выбор N уникальных победителей (шанс пропорционален сумме ставки),
    # без повторов — выбранный участник удаляется из пула перед следующим розыгрышем.
    pool = list(participants)
    chosen = []
    for _ in range(n):
        total_weight = sum(p[1] for p in pool)
        r = random.uniform(0, total_weight)
        acc = 0.0
        pick_idx = len(pool) - 1
        for i, (uid, amt, tno) in enumerate(pool):
            acc += amt
            if r <= acc:
                pick_idx = i
                break
        chosen.append(pool.pop(pick_idx))

    total_prize = round(bank * WINNER_SHARE, 2)
    per_winner = round(total_prize / n, 2)
    platform_amount = round(bank - per_winner * n, 2)

    for uid, amt, tno in chosen:
        cur.execute(
            f"UPDATE {SCHEMA}.users SET balance_rub = balance_rub + %s WHERE id=%s",
            (per_winner, uid)
        )
        cur.execute(
            f"""INSERT INTO {SCHEMA}.game_winners (game_id, user_id, ticket_no, amount)
                VALUES (%s,%s,%s,%s)""",
            (game_id, uid, tno, per_winner)
        )
        add_notification(
            cur, uid, "game_won", "Вы выиграли в игре!",
            f"Билет №{tno} выиграл! Банк разыгран — вам начислено ₽{per_winner:,.0f}."
            + (f" Победителей: {n}." if n > 1 else ""), shield=True
        )

    cur.execute(
        f"""INSERT INTO {SCHEMA}.platform_revenue (source, amount, ref_id, description)
            VALUES ('game', %s, %s, 'Комиссия с игры на ставках')""",
        (platform_amount, game_id)
    )

    # Легаси-поля (первый победитель) — для обратной совместимости со старым UI
    first_uid, _, first_tno = chosen[0]
    cur.execute(
        f"""UPDATE {SCHEMA}.games
            SET status='finished', winner_id=%s, winner_amount=%s, winner_ticket_no=%s, finished_at=NOW()
            WHERE id=%s""",
        (first_uid, per_winner, first_tno, game_id)
    )


def finish_expired_games(cur):
    cur.execute(
        f"SELECT id FROM {SCHEMA}.games WHERE status='active' AND expires_at <= NOW()"
    )
    for (gid,) in cur.fetchall():
        finish_game(cur, gid)


def handler(event: dict, context) -> dict:
    """Игры со ставками: список, детали, создание (админ), ставка, отмена (админ)."""
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
    ip = get_client_ip(event)
    conn = get_conn()
    try:
        cur = conn.cursor()

        if is_ip_blocked(cur, ip):
            return {"statusCode": 429, "headers": CORS, "body": json.dumps({"error": "ip_blocked"})}

        user = get_user_by_token(cur, token)

        # ── GET /games — список игр (публично) ─────────────────────────────
        if method == "GET" and path.rstrip("/").endswith("/games"):
            finish_expired_games(cur)
            conn.commit()
            q, p = select_game_query()
            cur.execute(q, p)
            games = [game_row_to_dict(r) for r in cur.fetchall()]
            for g in games:
                if g["status"] == "finished":
                    g["winners"] = get_game_winners(cur, g["id"])
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"games": games})}

        # ── GET /games/history — история завершённых и отменённых игр ───────
        if method == "GET" and path.rstrip("/").endswith("/games/history"):
            finish_expired_games(cur)
            conn.commit()
            q, p = select_game_query("WHERE g.status IN ('finished','cancelled')")
            cur.execute(q, p)
            games = [game_row_to_dict(r) for r in cur.fetchall()]
            for g in games:
                if g["status"] == "finished":
                    g["winners"] = get_game_winners(cur, g["id"])
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"games": games})}

        # ── GET /games/{id} — детали игры + ставки ──────────────────────────
        if method == "GET" and "/games/" in path:
            game_id = path.rstrip("/").split("/games/")[-1]
            finish_expired_games(cur)
            conn.commit()
            q, p = select_game_query("WHERE g.id=%s", (game_id,))
            cur.execute(q, p)
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            game = game_row_to_dict(row)

            cur.execute(
                f"""SELECT b.id, b.user_id, u.username, b.amount, b.ticket_no, b.created_at
                    FROM {SCHEMA}.game_bets b JOIN {SCHEMA}.users u ON u.id=b.user_id
                    WHERE b.game_id=%s ORDER BY b.ticket_no DESC""",
                (game_id,)
            )
            bets = [{
                "id": r[0], "userId": r[1], "username": r[2],
                "amount": float(r[3]), "ticketNo": r[4], "createdAt": r[5].isoformat()
            } for r in cur.fetchall()]
            game["bets"] = bets
            game["winners"] = get_game_winners(cur, game_id)
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"game": game})}

        # ── POST /games — создать игру (только админ) ───────────────────────
        if method == "POST" and path.rstrip("/").endswith("/games"):
            if not is_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}

            title = (body.get("title") or "Игра на ставках").strip()
            try:
                bet_amount = float(body.get("bet_amount"))
                target_bank = float(body.get("target_bank"))
                duration_seconds = int(body.get("duration_seconds"))
                winners_count = int(body.get("winners_count") or 1)
            except (TypeError, ValueError):
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_data"})}

            if bet_amount <= 0 or target_bank <= 0 or duration_seconds <= 0:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_data"})}
            if target_bank < bet_amount:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_data"})}
            if winners_count < 1 or winners_count > 20:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_data"})}

            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.games")
            count = cur.fetchone()[0]
            gid = f"g-{count + 1:04d}-{secrets.token_hex(3)}"

            cur.execute(
                f"""INSERT INTO {SCHEMA}.games
                    (id, title, bet_amount, target_bank, duration_seconds, bank, status, created_by, expires_at, winners_count)
                    VALUES (%s,%s,%s,%s,%s,0,'active',%s, NOW() + (%s || ' seconds')::interval, %s)""",
                (gid, title, bet_amount, target_bank, duration_seconds, user["id"], duration_seconds, winners_count)
            )
            conn.commit()

            q, p = select_game_query("WHERE g.id=%s", (gid,))
            cur.execute(q, p)
            game = game_row_to_dict(cur.fetchone())
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"game": game})}

        # ── POST /games/bet — сделать ставку ────────────────────────────────
        if method == "POST" and path.rstrip("/").endswith("/games/bet"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            if user["status"] in ("frozen", "blocked"):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            if check_rate_limit(cur, ip, "games_bet", window_sec=10, max_hits=10, block_minutes=5):
                conn.commit()
                return {"statusCode": 429, "headers": CORS, "body": json.dumps({"error": "rate_limited"})}

            game_id = body.get("game_id")
            if not game_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "missing_fields"})}

            cur.execute(
                f"""SELECT bet_amount, target_bank, bank, status, expires_at
                    FROM {SCHEMA}.games WHERE id=%s FOR UPDATE""",
                (game_id,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            bet_amount, target_bank, bank, status, expires_at = row
            bet_amount = float(bet_amount)
            target_bank = float(target_bank)
            bank = float(bank)

            if status != "active":
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "wrong_status"})}

            cur.execute(f"SELECT balance_rub, big_spend_verified_month FROM {SCHEMA}.users WHERE id=%s FOR UPDATE", (user["id"],))
            balance, verified_month = cur.fetchone()
            balance = float(balance)
            if balance < bet_amount:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "no_balance"})}

            if bet_amount > BIG_SPEND_THRESHOLD:
                month_key = datetime.now().strftime("%Y-%m")
                if verified_month != month_key:
                    return {"statusCode": 403, "headers": CORS,
                            "body": json.dumps({"error": "big_spend_verification_required"})}

            cur.execute(f"UPDATE {SCHEMA}.users SET balance_rub = balance_rub - %s WHERE id=%s",
                        (bet_amount, user["id"]))

            cur.execute(f"SELECT COALESCE(MAX(ticket_no),0) FROM {SCHEMA}.game_bets WHERE game_id=%s", (game_id,))
            ticket_no = cur.fetchone()[0] + 1

            bid = secrets.token_hex(8)
            cur.execute(
                f"""INSERT INTO {SCHEMA}.game_bets (id, game_id, user_id, amount, ticket_no)
                    VALUES (%s,%s,%s,%s,%s)""",
                (bid, game_id, user["id"], bet_amount, ticket_no)
            )
            new_bank = round(bank + bet_amount, 2)
            cur.execute(f"UPDATE {SCHEMA}.games SET bank=%s WHERE id=%s", (new_bank, game_id))

            if new_bank >= target_bank:
                finish_game(cur, game_id)

            conn.commit()

            q, p = select_game_query("WHERE g.id=%s", (game_id,))
            cur.execute(q, p)
            game = game_row_to_dict(cur.fetchone())
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"game": game, "ticketNo": ticket_no})}

        # ── POST /games/cancel — отменить игру и вернуть ставки (только админ) ─
        if method == "POST" and path.rstrip("/").endswith("/games/cancel"):
            if not is_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            game_id = body.get("game_id")
            if not game_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "missing_fields"})}

            cur.execute(f"SELECT status FROM {SCHEMA}.games WHERE id=%s FOR UPDATE", (game_id,))
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            if row[0] != "active":
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "wrong_status"})}

            cur.execute(
                f"""SELECT user_id, SUM(amount) FROM {SCHEMA}.game_bets
                    WHERE game_id=%s GROUP BY user_id""",
                (game_id,)
            )
            for uid, amt in cur.fetchall():
                cur.execute(f"UPDATE {SCHEMA}.users SET balance_rub = balance_rub + %s WHERE id=%s",
                            (float(amt), uid))
                add_notification(cur, uid, "game_cancelled", "Игра отменена",
                                  "Администратор отменил игру, ваша ставка возвращена на баланс.")

            cur.execute(
                f"UPDATE {SCHEMA}.games SET status='cancelled', finished_at=NOW() WHERE id=%s",
                (game_id,)
            )
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── POST /games/finish-now — досрочно закрыть игру и разыграть банк (только админ) ─
        if method == "POST" and path.rstrip("/").endswith("/games/finish-now"):
            if not is_admin(user):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            game_id = body.get("game_id")
            if not game_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "missing_fields"})}

            cur.execute(f"SELECT status FROM {SCHEMA}.games WHERE id=%s FOR UPDATE", (game_id,))
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            if row[0] != "active":
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "wrong_status"})}

            finish_game(cur, game_id)
            conn.commit()

            q, p = select_game_query("WHERE g.id=%s", (game_id,))
            cur.execute(q, p)
            game = game_row_to_dict(cur.fetchone())
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"game": game})}

        return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}

    except Exception as e:
        conn.rollback()
        return {"statusCode": 500, "headers": CORS, "body": json.dumps({"error": str(e)})}
    finally:
        conn.close()