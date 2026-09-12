"""
Автоперевод текста сообщений (чаты сделок, споры, поддержка, описания товаров)
на язык, который просит фронтенд. Используется бесплатный публичный
эндпоинт Google Translate (без API-ключа) — только для коротких сообщений чата.
"""
import json
import urllib.request
import urllib.parse

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}

MAX_LEN = 1000
ALLOWED_TARGET_LANGS = {"ru", "en", "kk", "uk", "de", "zh"}
# Коды языка платформы -> коды Google Translate (казахский в Google — "kk")
LANG_MAP = {"kz": "kk"}


def translate_text(text: str, target: str) -> str:
    q = urllib.parse.quote(text)
    url = (
        "https://translate.googleapis.com/translate_a/single"
        f"?client=gtx&sl=auto&tl={target}&dt=t&q={q}"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=4) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    # Формат ответа: [[["переведённый текст","исходный",...], ...], ...]
    return "".join(chunk[0] for chunk in data[0] if chunk and chunk[0])


def handler(event: dict, context) -> dict:
    """Переводит один или несколько текстов на целевой язык пользователя."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    if event.get("httpMethod") != "POST":
        return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "method_not_allowed"})}

    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass

    target = (body.get("target") or "ru").lower()
    target = LANG_MAP.get(target, target)
    if target not in ALLOWED_TARGET_LANGS:
        target = "ru"

    texts = body.get("texts")
    single_text = body.get("text")

    if texts is not None:
        if not isinstance(texts, list) or len(texts) > 30:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_data"})}
        results = []
        for t in texts:
            t = (t or "")[:MAX_LEN]
            if not t.strip():
                results.append("")
                continue
            try:
                results.append(translate_text(t, target))
            except Exception:
                results.append(t)
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"translations": results})}

    text = (single_text or "").strip()[:MAX_LEN]
    if not text:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid_data"})}
    try:
        translated = translate_text(text, target)
    except Exception:
        return {"statusCode": 502, "headers": CORS, "body": json.dumps({"error": "translate_unavailable"})}
    return {"statusCode": 200, "headers": CORS, "body": json.dumps({"translated": translated})}
