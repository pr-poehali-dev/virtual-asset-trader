"""
Игры со ставками: администратор создаёт игру (сумма ставки, целевой банк, время),
пользователи делают ставки в общий банк. Когда банк достигает цели или истекает
время — случайно выбирается победитель (шанс пропорционален вкладу) и получает 90% банка.
"""
import json, os, secrets, random
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA") or "t_p38600009_virtual_asset_trader"
WINNER_SHARE = 0.9

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
     winner_id, winner_amount, winner_name, created_by, created_at, expires_at, finished_at,
     participants_count) = row
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
        "createdBy": created_by,
        "createdAt": created_at.isoformat() if created_at else None,
        "expiresAt": expires_at.isoformat() if expires_at else None,
        "finishedAt": finished_at.isoformat() if finished_at else None,
        "participantsCount": participants_count,
    }


def select_game_query(where_clause="", params=()):
    return (
        f"""SELECT g.id, g.title, g.bet_amount, g.target_bank, g.duration_seconds, g.bank,
                   g.status, g.winner_id, g.winner_amount, w.username, g.created_by,
                   g.created_at, g.expires_at, g.finished_at,
                   (SELECT COUNT(DISTINCT user_id) FROM {SCHEMA}.game_bets WHERE game_id=g.id)
            FROM {SCHEMA}.games g
            LEFT JOIN {SCHEMA}.users w ON w.id = g.winner_id
            {where_clause}
            ORDER BY g.created_at DESC""",
        params
    )


def finish_game(cur, game_id):
    """Подводит итоги игры: выбирает победителя пропорционально вкладу и начисляет 90% банка."""
    cur.execute(
        f"SELECT id, bank, status FROM {SCHEMA}.games WHERE id=%s FOR UPDATE",
        (game_id,)
    )
    row = cur.fetchone()
    if not row or row[2] != "active":
        return
    bank = float(row[1])

    cur.execute(
        f"""SELECT user_id, SUM(amount) FROM {SCHEMA}.game_bets
            WHERE game_id=%s GROUP BY user_id""",
        (game_id,)
    )
    contributions = [(uid, float(amt)) for uid, amt in cur.fetchall()]

    if not contributions or bank <= 0:
        cur.execute(
            f"UPDATE {SCHEMA}.games SET status='cancelled', finished_at=NOW() WHERE id=%s",
            (game_id,)
        )
        return

    r = random.uniform(0, bank)
    acc = 0.0
    winner_id = contributions[-1][0]
    for uid, amt in contributions:
        acc += amt
        if r <= acc:
            winner_id = uid
            break

    winner_amount = round(bank * WINNER_SHARE, 2)
    platform_amount = round(bank - winner_amount, 2)

    cur.execute(
        f"UPDATE {SCHEMA}.users SET balance_rub = balance_rub + %s WHERE id=%s",
        (winner_amount, winner_id)
    )
    cur.execute(
        f"""INSERT INTO {SCHEMA}.platform_revenue (source, amount, ref_id, description)
            VALUES ('game', %s, %s, 'Комиссия с игры на ставках')""",
        (platform_amount, game_id)
    )
    cur.execute(
        f"""UPDATE {SCHEMA}.games
            SET status='finished', winner_id=%s, winner_amount=%s, finished_at=NOW()
            WHERE id=%s""",
        (winner_id, winner_amount, game_id)
    )
    add_notification(
        cur, winner_id, "game_won", "Вы выиграли в игре!",
        f"Банк разыгран — вам начислено ₽{winner_amount:,.0f}.", shield=True
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
    conn = get_conn()
    try:
        cur = conn.cursor()
        user = get_user_by_token(cur, token)

        # ── GET /games — список игр (публично) ─────────────────────────────
        if method == "GET" and path.rstrip("/").endswith("/games"):
            finish_expired_games(cur)
            conn.commit()
            q, p = select_game_query()
            cur.execute(q, p)
            games = [game_row_to_dict(r) for r in cur.fetchall()]
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
                f"""SELECT b.id, b.user_id, u.username, b.amount, b.created_at
                    FROM {SCHEMA}.game_bets b JOIN {SCHEMA}.users u ON u.id=b.user_id
                    WHERE b.game_id=%s ORDER BY b.created_at DESC""",
                (game_id,)
            )
            bets = [{
                "id": r[0], "userId": r[1], "username": r[2],
                "amount": float(r[3]), "createdAt": r[4].isoformat()
            } for r in cur.fetchall()]
            game["bets"] = bets
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
            except (TypeError, ValueError):
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_data"})}

            if bet_amount <= 0 or target_bank <= 0 or duration_seconds <= 0:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_data"})}
            if target_bank < bet_amount:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_data"})}

            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.games")
            count = cur.fetchone()[0]
            gid = f"g-{count + 1:04d}-{secrets.token_hex(3)}"

            cur.execute(
                f"""INSERT INTO {SCHEMA}.games
                    (id, title, bet_amount, target_bank, duration_seconds, bank, status, created_by, expires_at)
                    VALUES (%s,%s,%s,%s,%s,0,'active',%s, NOW() + (%s || ' seconds')::interval)""",
                (gid, title, bet_amount, target_bank, duration_seconds, user["id"], duration_seconds)
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

            cur.execute(f"SELECT balance_rub FROM {SCHEMA}.users WHERE id=%s FOR UPDATE", (user["id"],))
            balance = float(cur.fetchone()[0])
            if balance < bet_amount:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "no_balance"})}

            cur.execute(f"UPDATE {SCHEMA}.users SET balance_rub = balance_rub - %s WHERE id=%s",
                        (bet_amount, user["id"]))

            bid = secrets.token_hex(8)
            cur.execute(
                f"""INSERT INTO {SCHEMA}.game_bets (id, game_id, user_id, amount)
                    VALUES (%s,%s,%s,%s)""",
                (bid, game_id, user["id"], bet_amount)
            )
            new_bank = round(bank + bet_amount, 2)
            cur.execute(f"UPDATE {SCHEMA}.games SET bank=%s WHERE id=%s", (new_bank, game_id))

            if new_bank >= target_bank:
                finish_game(cur, game_id)

            conn.commit()

            q, p = select_game_query("WHERE g.id=%s", (game_id,))
            cur.execute(q, p)
            game = game_row_to_dict(cur.fetchone())
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"game": game})}

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

        return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}

    except Exception as e:
        conn.rollback()
        return {"statusCode": 500, "headers": CORS, "body": json.dumps({"error": str(e)})}
    finally:
        conn.close()
