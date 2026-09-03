"""
ИИ-ассистент в чате поддержки: отвечает пользователям вместо оператора, пока тикет открыт
и не эскалирован. Если пользователь пишет "вызвать администратора" (и похожие фразы) —
бот сообщает, что обращение передано администратору, и отключается для этого тикета
(admin видит всю переписку бота с пользователем). При следующем новом тикете ИИ снова работает.
"""
import json, os, secrets, urllib.request, urllib.error
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA") or "t_p38600009_virtual_asset_trader"
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_MODEL = "gpt-4o-mini"

ESCALATION_TRIGGERS = [
    "вызвать администратора", "вызови администратора", "позови администратора",
    "позвать администратора", "нужен администратор", "нужен оператор",
    "позвать оператора", "вызвать оператора", "живой человек", "хочу оператора",
    "соедините с администратором", "соедините с оператором", "позовите человека",
]

SYSTEM_PROMPT = (
    "Ты — вежливый ИИ-ассистент поддержки эскроу-платформы Gorant Shop. "
    "Помогаешь пользователям с вопросами о сделках, эскроу, комиссии (5%), холде для CS2 скинов (8 дней) "
    "и PUBG Mobile (14 дней), пополнении и выводе средств, верификации, спорах. "
    "Отвечай кратко, дружелюбно, по делу, на русском языке. "
    "Если вопрос требует действий администратора (разбан, ручная проверка, спорная ситуация, финансовая проблема) — "
    "предложи пользователю написать «Вызвать администратора»."
)

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
    if not token:
        return None
    cur.execute(
        f"""SELECT u.id, u.username FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id=s.user_id
            WHERE s.token=%s AND s.expires_at > NOW()""",
        (token,)
    )
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "username": row[1]}

def is_escalation_request(text: str) -> bool:
    t = text.lower().strip()
    return any(trigger in t for trigger in ESCALATION_TRIGGERS)

def call_openai(history):
    if not OPENAI_API_KEY:
        return None
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history
    payload = json.dumps({
        "model": OPENAI_MODEL,
        "messages": messages,
        "max_tokens": 400,
        "temperature": 0.5,
    }).encode()
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode())
            return data["choices"][0]["message"]["content"].strip()
    except urllib.error.HTTPError as e:
        print(f"OpenAI HTTP error: {e.code} {e.read()}")
        return None
    except Exception as e:
        print(f"OpenAI error: {e}")
        return None

def handler(event: dict, context) -> dict:
    """ИИ-ассистент поддержки: анализирует сообщение пользователя и отвечает автоматически."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    qs = event.get("queryStringParameters") or {}
    path = qs.get("_path") or event.get("path") or "/"
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
        user = get_user(cur, token)

        # ── POST /ai-support/respond — сгенерировать ответ бота на последнее сообщение ─
        if method == "POST" and path.endswith("/respond"):
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "unauthorized"})}
            ticket_id = body.get("ticket_id")
            if not ticket_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "missing_fields"})}

            cur.execute(
                f"""SELECT user_id, status, ai_enabled, escalated FROM {SCHEMA}.support_tickets
                    WHERE id=%s""",
                (ticket_id,)
            )
            row = cur.fetchone()
            if not row or row[0] != user["id"]:
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}
            _, status, ai_enabled, escalated = row

            if status != "open":
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"replied": False})}

            # Последнее сообщение пользователя
            cur.execute(
                f"""SELECT text FROM {SCHEMA}.support_messages
                    WHERE ticket_id=%s AND role='user' ORDER BY created_at DESC LIMIT 1""",
                (ticket_id,)
            )
            last_msg_row = cur.fetchone()
            last_text = last_msg_row[0] if last_msg_row else ""

            # Если уже эскалировано или ИИ отключён — не отвечаем
            if escalated or not ai_enabled:
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"replied": False, "escalated": True})}

            # Проверяем фразу вызова администратора
            if is_escalation_request(last_text):
                cur.execute(
                    f"UPDATE {SCHEMA}.support_tickets SET escalated=TRUE, ai_enabled=FALSE, updated_at=NOW() WHERE id=%s",
                    (ticket_id,)
                )
                cur.execute(
                    f"""INSERT INTO {SCHEMA}.support_messages (ticket_id, from_user, role, text)
                        VALUES (%s,'system','system',%s)""",
                    (ticket_id, "Обращение передано администратору. ИИ-ассистент временно отключён для этого тикета — оператор ответит вам в ближайшее время.")
                )
                conn.commit()
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"replied": True, "escalated": True})}

            # Собираем историю переписки для контекста (последние 20 сообщений)
            cur.execute(
                f"""SELECT role, text FROM {SCHEMA}.support_messages
                    WHERE ticket_id=%s AND role IN ('user','ai') ORDER BY created_at DESC LIMIT 20""",
                (ticket_id,)
            )
            history_rows = list(reversed(cur.fetchall()))
            history = [{"role": "assistant" if r == "ai" else "user", "content": t} for r, t in history_rows]

            answer = call_openai(history)
            if not answer:
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"replied": False, "error": "ai_unavailable"})}

            cur.execute(
                f"""INSERT INTO {SCHEMA}.support_messages (ticket_id, from_user, role, text)
                    VALUES (%s,'ai','ai',%s)""",
                (ticket_id, answer)
            )
            cur.execute(f"UPDATE {SCHEMA}.support_tickets SET updated_at=NOW() WHERE id=%s", (ticket_id,))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"replied": True, "text": answer})}

        return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not_found"})}

    except Exception as e:
        conn.rollback()
        return {"statusCode": 500, "headers": CORS, "body": json.dumps({"error": str(e)})}
    finally:
        conn.close()
