"""
Верификация пользователей: подача заявки, загрузка документов, просмотр статуса.
Администраторы могут одобрять/отклонять заявки.
"""
import json, os, secrets, base64
import psycopg2
import boto3

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}

def get_conn():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = False
    return conn

def get_s3():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )

def get_user_by_token(cur, token):
    if not token:
        return None
    cur.execute(
        f"""SELECT u.id, u.username, u.role, u.is_owner, u.verified
            FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id=s.user_id
            WHERE s.token=%s AND s.expires_at > NOW()""",
        (token,)
    )
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "username": row[1], "role": row[2], "is_owner": row[3], "verified": row[4]}

def upload_file(data_b64: str, filename: str) -> str:
    """Загружает base64-файл в S3 и возвращает CDN URL."""
    s3 = get_s3()
    data = base64.b64decode(data_b64)
    key = f"verifications/{filename}"
    s3.put_object(Bucket="files", Key=key, Body=data, ContentType="image/jpeg")
    access_key = os.environ["AWS_ACCESS_KEY_ID"]
    return f"https://cdn.poehali.dev/projects/{access_key}/bucket/{key}"

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

        # ── POST /verify/submit ───────────────────────────────────────────────
        if method == "POST" and path.endswith("/submit"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            if user["verified"]:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "already_verified"})}

            # Проверяем, нет ли уже ожидающей заявки
            cur.execute(
                f"SELECT id, status FROM {SCHEMA}.verifications WHERE user_id=%s ORDER BY created_at DESC LIMIT 1",
                (user["id"],)
            )
            existing = cur.fetchone()
            if existing and existing[1] == "pending":
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "already_pending"})}

            full_name  = (body.get("full_name") or "").strip()
            doc_type   = body.get("doc_type") or "passport"
            doc_number = (body.get("doc_number") or "").strip()
            doc_photo  = body.get("doc_photo")   # base64
            selfie     = body.get("selfie")       # base64

            if not full_name or not doc_number:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "missing_fields"})}

            ver_id = "VER-" + secrets.token_hex(4).upper()

            # Загружаем фото если есть
            doc_url = None
            selfie_url = None
            if doc_photo:
                try:
                    doc_url = upload_file(doc_photo, f"{ver_id}_doc.jpg")
                except Exception:
                    pass
            if selfie:
                try:
                    selfie_url = upload_file(selfie, f"{ver_id}_selfie.jpg")
                except Exception:
                    pass

            cur.execute(
                f"""INSERT INTO {SCHEMA}.verifications
                    (id, user_id, full_name, doc_type, doc_number, doc_photo, selfie, status)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,'pending')""",
                (ver_id, user["id"], full_name, doc_type, doc_number, doc_url, selfie_url)
            )
            add_notification(cur, user["id"], "system",
                "Заявка на верификацию отправлена",
                f"Заявка {ver_id} принята. Рассмотрение занимает 1–3 рабочих дня.")
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"id": ver_id, "status": "pending"})}

        # ── GET /verify/status ────────────────────────────────────────────────
        if method == "GET" and path.endswith("/status"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            cur.execute(
                f"""SELECT id, status, reject_reason, created_at
                    FROM {SCHEMA}.verifications WHERE user_id=%s ORDER BY created_at DESC LIMIT 1""",
                (user["id"],)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"status": None})}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "id": row[0], "status": row[1], "reject_reason": row[2],
                "date": row[3].strftime("%d.%m.%Y"),
                "verified": user["verified"],
            })}

        # ── GET /verify/admin/list (admin) ────────────────────────────────────
        if method == "GET" and path.endswith("/admin/list"):
            if not user or user["role"] not in ("admin", "staff"):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            cur.execute(
                f"""SELECT v.id, v.user_id, u.username, v.full_name, v.doc_type,
                           v.doc_number, v.doc_photo, v.selfie, v.status,
                           v.reject_reason, v.created_at
                    FROM {SCHEMA}.verifications v JOIN {SCHEMA}.users u ON u.id=v.user_id
                    WHERE v.status='pending' ORDER BY v.created_at ASC"""
            )
            rows = cur.fetchall()
            result = [{
                "id": r[0], "userId": r[1], "username": r[2], "fullName": r[3],
                "docType": r[4], "docNumber": r[5], "docPhoto": r[6], "selfie": r[7],
                "status": r[8], "rejectReason": r[9], "date": r[10].strftime("%d.%m.%Y"),
            } for r in rows]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"verifications": result})}

        # ── POST /verify/admin/approve ────────────────────────────────────────
        if method == "POST" and path.endswith("/approve"):
            if not user or user["role"] not in ("admin", "staff"):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            ver_id = body.get("id")
            cur.execute(
                f"SELECT user_id FROM {SCHEMA}.verifications WHERE id=%s AND status='pending'",
                (ver_id,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            uid = row[0]

            cur.execute(
                f"UPDATE {SCHEMA}.verifications SET status='approved', reviewed_at=NOW() WHERE id=%s",
                (ver_id,)
            )
            cur.execute(f"UPDATE {SCHEMA}.users SET verified=TRUE WHERE id=%s", (uid,))
            add_notification(cur, uid, "system",
                "✅ Верификация одобрена!",
                "Ваш аккаунт верифицирован. Теперь вы можете выводить средства сразу после продажи.",
                shield=True)
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── POST /verify/admin/reject ─────────────────────────────────────────
        if method == "POST" and path.endswith("/reject"):
            if not user or user["role"] not in ("admin", "staff"):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            ver_id = body.get("id")
            reason = (body.get("reason") or "Документы не прошли проверку").strip()
            cur.execute(
                f"SELECT user_id FROM {SCHEMA}.verifications WHERE id=%s AND status='pending'",
                (ver_id,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}
            uid = row[0]

            cur.execute(
                f"UPDATE {SCHEMA}.verifications SET status='rejected', reject_reason=%s, reviewed_at=NOW() WHERE id=%s",
                (reason, ver_id)
            )
            add_notification(cur, uid, "system",
                "❌ Верификация отклонена",
                f"Причина: {reason}. Вы можете подать новую заявку.")
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}

    except Exception as e:
        conn.rollback()
        return {"statusCode": 500, "headers": CORS, "body": json.dumps({"error": str(e)})}
    finally:
        conn.close()
