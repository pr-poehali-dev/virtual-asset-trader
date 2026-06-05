"""
Товары: список, добавление, поднятие в топ, детали продавца.
"""
import json, os
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA") or "t_p38600009_virtual_asset_trader"
BOOST_PRICE = 50
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
        f"""SELECT u.id, u.username, u.balance_rub, u.role, u.is_owner, u.verified
            FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id=s.user_id
            WHERE s.token=%s AND s.expires_at > NOW()""",
        (token,)
    )
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "username": row[1], "balance_rub": float(row[2]),
            "role": row[3], "is_owner": row[4], "verified": row[5]}

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    _qs = event.get("queryStringParameters") or {}
    path = _qs.get("_path") or event.get("path") or "/"
    params = _qs
    body   = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass

    token = (event.get("headers") or {}).get("X-Session-Token")
    conn = get_conn()
    try:
        cur = conn.cursor()

        # ── GET /products ─────────────────────────────────────────────────────
        if method == "GET" and (path.endswith("/products") or path.endswith("/products/")):
            category = params.get("category")
            search   = params.get("search")
            price_max = params.get("price_max")

            sql = f"""
                SELECT p.id, p.seller_id, u.username, p.title, p.category,
                       p.price, p.description, p.active, p.boosted, p.boost_until,
                       p.created_at,
                       COALESCE(AVG(r.rating),0) as avg_rating,
                       COUNT(r.id) as review_count
                FROM {SCHEMA}.products p
                JOIN {SCHEMA}.users u ON u.id=p.seller_id
                LEFT JOIN {SCHEMA}.reviews r ON r.seller_id=p.seller_id
                WHERE p.active=TRUE
            """
            args = []
            if category and category != "Все":
                sql += " AND p.category=%s"; args.append(category)
            if search:
                sql += " AND p.title ILIKE %s"; args.append(f"%{search}%")
            if price_max:
                sql += " AND p.price<=%s"; args.append(float(price_max))

            sql += """
                GROUP BY p.id, p.seller_id, u.username
                ORDER BY p.boosted DESC, p.created_at DESC
                LIMIT 200
            """
            cur.execute(sql, args)
            rows = cur.fetchall()
            products = []
            for r in rows:
                products.append({
                    "id": r[0], "sellerId": r[1], "sellerName": r[2],
                    "title": r[3], "category": r[4], "price": float(r[5]),
                    "description": r[6], "active": r[7],
                    "boosted": r[8], "boostUntil": r[9].isoformat() if r[9] else None,
                    "createdAt": r[10].isoformat(),
                    "rating": round(float(r[11]), 1), "reviews": r[12],
                    "badge": None, "verified": False,
                })
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"products": products})}

        # ── POST /products ────────────────────────────────────────────────────
        if method == "POST" and (path.endswith("/products") or path.endswith("/products/")):
            user = get_user_by_token(cur, token)
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}

            title    = (body.get("title") or "").strip()
            category = body.get("category") or ""
            price    = float(body.get("price") or 0)
            desc     = (body.get("description") or "").strip()

            if not title or not category or price <= 0:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_data"})}

            cur.execute(
                f"""INSERT INTO {SCHEMA}.products (seller_id, title, category, price, description)
                    VALUES (%s,%s,%s,%s,%s) RETURNING id""",
                (user["id"], title, category, price, desc)
            )
            product_id = cur.fetchone()[0]
            conn.commit()
            return {"statusCode": 200, "headers": CORS,
                    "body": json.dumps({"id": product_id, "title": title, "category": category,
                                        "price": price, "sellerId": user["id"], "sellerName": user["username"]})}

        # ── POST /products/boost ──────────────────────────────────────────────
        if method == "POST" and path.endswith("/boost"):
            user = get_user_by_token(cur, token)
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            if user["balance_rub"] < BOOST_PRICE:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "no_balance"})}

            product_id = body.get("product_id")
            cur.execute(f"SELECT seller_id FROM {SCHEMA}.products WHERE id=%s", (product_id,))
            row = cur.fetchone()
            if not row or row[0] != user["id"]:
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}

            cur.execute(
                f"UPDATE {SCHEMA}.products SET boosted=TRUE, boost_until=NOW()+INTERVAL '24 hours' WHERE id=%s",
                (product_id,)
            )
            cur.execute(
                f"UPDATE {SCHEMA}.users SET balance_rub=balance_rub-%s WHERE id=%s",
                (BOOST_PRICE, user["id"])
            )
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── GET /products/seller/{id} ─────────────────────────────────────────
        if method == "GET" and "/seller/" in path:
            seller_id = path.split("/seller/")[-1].rstrip("/")
            cur.execute(
                f"""SELECT id, account_id, username, verified, deals_count, joined_at
                    FROM {SCHEMA}.users WHERE id=%s""",
                (seller_id,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            seller = {
                "id": row[0], "accountId": row[1], "username": row[2],
                "verified": row[3], "deals": row[4],
                "joined": row[5].strftime("%d.%m.%Y") if row[5] else ""
            }

            cur.execute(
                f"""SELECT p.id, p.title, p.category, p.price, p.boosted
                    FROM {SCHEMA}.products p WHERE p.seller_id=%s AND p.active=TRUE""",
                (seller_id,)
            )
            products = [{"id": r[0], "title": r[1], "category": r[2],
                         "price": float(r[3]), "boosted": r[4]} for r in cur.fetchall()]

            cur.execute(
                f"""SELECT r.id, u.username, r.rating, r.text, r.created_at
                    FROM {SCHEMA}.reviews r JOIN {SCHEMA}.users u ON u.id=r.from_user_id
                    WHERE r.seller_id=%s ORDER BY r.created_at DESC""",
                (seller_id,)
            )
            reviews = [{"id": r[0], "fromUser": r[1], "rating": r[2],
                        "text": r[3], "date": r[4].strftime("%d.%m.%Y")} for r in cur.fetchall()]

            avg = round(sum(r["rating"] for r in reviews) / len(reviews), 1) if reviews else 0
            return {"statusCode": 200, "headers": CORS,
                    "body": json.dumps({"seller": seller, "products": products,
                                        "reviews": reviews, "avgRating": avg})}

        # ── DELETE /products/{id} ─────────────────────────────────────────────
        if method == "POST" and path.endswith("/products/delete"):
            user = get_user_by_token(cur, token)
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}

            product_id = body.get("product_id")
            cur.execute(f"SELECT seller_id FROM {SCHEMA}.products WHERE id=%s AND active=TRUE", (product_id,))
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}

            is_admin = user.get("role") in ("admin", "staff")
            if row[0] != user["id"] and not is_admin:
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}

            cur.execute(f"UPDATE {SCHEMA}.products SET active=FALSE WHERE id=%s", (product_id,))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── GET /products/my ──────────────────────────────────────────────────
        if method == "GET" and path.endswith("/products/my"):
            user = get_user_by_token(cur, token)
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            cur.execute(
                f"""SELECT p.id, p.title, p.category, p.price, p.boosted, p.boost_until, p.created_at
                    FROM {SCHEMA}.products p WHERE p.seller_id=%s AND p.active=TRUE
                    ORDER BY p.created_at DESC""",
                (user["id"],)
            )
            products = [{"id": r[0], "title": r[1], "category": r[2], "price": float(r[3]),
                         "boosted": r[4], "boostUntil": r[5].isoformat() if r[5] else None,
                         "createdAt": r[6].isoformat()} for r in cur.fetchall()]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"products": products})}

        return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}

    except Exception as e:
        conn.rollback()
        return {"statusCode": 500, "headers": CORS, "body": json.dumps({"error": str(e)})}
    finally:
        conn.close()