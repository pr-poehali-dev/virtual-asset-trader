"""
Cron-задача: автоматически снимает холд с истёкших сделок CS2/PUBG.
Запускается по расписанию (каждые 6 часов).
Также: освобождает locked_rub неверифицированных продавцов через 2 дня.
"""
import json, os, secrets
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA") or "t_p38600009_virtual_asset_trader"
PLATFORM_COMMISSION = 7

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Cron-Secret",
}

CRON_SECRET = os.environ.get("CRON_SECRET", "gorant_cron_2024")

def get_conn():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = False
    return conn

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

    # Проверяем секрет (вызывается только платформой или вручную)
    secret = (event.get("headers") or {}).get("X-Cron-Secret", "")
    if secret != CRON_SECRET:
        return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}

    conn = get_conn()
    released_holds = 0
    released_unverified = 0

    try:
        cur = conn.cursor()

        # ── 1. Снимаем холд с истёкших CS2/PUBG сделок ───────────────────────
        cur.execute(
            f"""SELECT id, seller_id, amount FROM {SCHEMA}.deals
                WHERE status IN ('hold_cs2', 'hold_pubg')
                AND hold_until IS NOT NULL
                AND hold_until <= NOW()"""
        )
        expired_deals = cur.fetchall()

        for deal_id, seller_id, amount in expired_deals:
            amount = float(amount)
            seller_receives = round(amount * (1 - PLATFORM_COMMISSION / 100), 2)

            cur.execute(
                f"UPDATE {SCHEMA}.deals SET status='completed', updated_at=NOW() WHERE id=%s",
                (deal_id,)
            )
            cur.execute(
                f"""UPDATE {SCHEMA}.users
                    SET balance_rub = balance_rub + %s,
                        locked_rub  = GREATEST(0, locked_rub - %s)
                    WHERE id = %s""",
                (seller_receives, seller_receives, seller_id)
            )
            add_notification(cur, seller_id, "deal_sold",
                "Холд снят — средства зачислены",
                f"По сделке {deal_id} период холда истёк. На баланс зачислено ₽{seller_receives:,.0f}.",
                shield=True)
            released_holds += 1

        # ── 2. Разблокируем средства неверифицированных продавцов (2 дня) ─────
        # Сделки: status=completed (обычные, не холд), возраст >= 2 дня,
        # продавец не верифицирован, locked_rub > 0
        cur.execute(
            f"""SELECT DISTINCT d.seller_id,
                       SUM(ROUND(d.amount * %s / 100, 2)) as to_release
                FROM {SCHEMA}.deals d
                JOIN {SCHEMA}.users u ON u.id = d.seller_id
                WHERE d.status = 'completed'
                AND d.updated_at <= NOW() - INTERVAL '2 days'
                AND u.verified = FALSE
                AND u.locked_rub > 0
                GROUP BY d.seller_id""",
            (100 - PLATFORM_COMMISSION,)
        )
        unverified_rows = cur.fetchall()

        for seller_id, to_release in unverified_rows:
            to_release = float(to_release)
            if to_release <= 0:
                continue
            cur.execute(
                f"""UPDATE {SCHEMA}.users
                    SET balance_rub = balance_rub + LEAST(locked_rub, %s),
                        locked_rub  = GREATEST(0, locked_rub - %s)
                    WHERE id = %s""",
                (to_release, to_release, seller_id)
            )
            add_notification(cur, seller_id, "deal_sold",
                "Средства разблокированы",
                f"₽{to_release:,.0f} переведены с замороженного баланса на основной (2-дневный период истёк).")
            released_unverified += 1

        conn.commit()

        return {
            "statusCode": 200,
            "headers": CORS,
            "body": json.dumps({
                "ok": True,
                "released_holds": released_holds,
                "released_unverified": released_unverified,
            })
        }

    except Exception as e:
        conn.rollback()
        return {"statusCode": 500, "headers": CORS, "body": json.dumps({"error": str(e)})}
    finally:
        conn.close()