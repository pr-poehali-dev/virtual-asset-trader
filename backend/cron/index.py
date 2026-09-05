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

        # ── 1. Снимаем холд с истёкших сделок (срок задан категорией в админке) ─
        cur.execute(
            f"""SELECT id, seller_id, amount FROM {SCHEMA}.deals
                WHERE status IN ('hold', 'hold_cs2', 'hold_pubg')
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

        # ── 2. Авто-завершение обычных сделок (без спец. холда) через 72 часа ──
        # Если покупатель за 72 часа не подтвердил получение и не открыл спор,
        # сделка считается успешной и деньги переходят продавцу автоматически.
        # Это применяется ко ВСЕМ продавцам (не только неверифицированным) —
        # раньше верифицированные продавцы могли остаться без выплаты навсегда,
        # если покупатель просто не заходил подтвердить получение.
        cur.execute(
            f"""SELECT id, seller_id, buyer_id, amount FROM {SCHEMA}.deals
                WHERE status = 'escrow'
                AND created_at <= NOW() - INTERVAL '72 hours'"""
        )
        escrow_expired = cur.fetchall()

        for deal_id, seller_id, buyer_id, amount in escrow_expired:
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
            cur.execute(
                f"UPDATE {SCHEMA}.users SET deals_count=deals_count+1 WHERE id=%s OR id=%s",
                (buyer_id, seller_id)
            )
            add_notification(cur, seller_id, "deal_sold",
                "Сделка автоматически завершена",
                f"Прошло 72 часа с момента покупки без спора. По сделке {deal_id} на баланс зачислено ₽{seller_receives:,.0f}.",
                shield=True)
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