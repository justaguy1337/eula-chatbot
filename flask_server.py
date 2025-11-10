import os
import traceback
import logging
from datetime import datetime

from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
from sambanova import SambaNova

from apiKey import openKey, sambaApiKey

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

BASE_URL = os.environ.get("OPENROUTER_BASE_URL",
                          "https://openrouter.ai/api/v1")
HOST = os.environ.get("FLASK_HOST", "0.0.0.0")
PORT = int(os.environ.get("FLASK_PORT", 8000))

client = OpenAI(base_url=BASE_URL, api_key=openKey)

SAMBA_API_KEY = os.environ.get("SAMBA_API_KEY", sambaApiKey or "")
SAMBA_BASE_URL = os.environ.get(
    "SAMBA_BASE_URL", "https://api.sambanova.ai/v1")
samba_client = SambaNova(api_key=SAMBA_API_KEY,
                         base_url=SAMBA_BASE_URL) if SAMBA_API_KEY else None

ALLOWED_MODELS = {
    "chatgpt": "openai/gpt-oss-20b:free",
    "deepseek": "deepseek/deepseek-chat-v3.1:free",
    "meta": "meta-llama/llama-3.3-8b-instruct:free",
    "minimax": "minimax/minimax-m2:free",
    "nemotron": "nvidia/nemotron-nano-12b-v2-vl:free",
}

conversations = {}

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(message)s")


def safe_extract_reply(completion):
    try:
        return completion.choices[0].message.content
    except Exception:
        pass
    try:
        return completion.choices[0].text
    except Exception:
        pass
    try:
        if isinstance(completion, dict):
            choices = completion.get("choices") or completion.get("outputs")
            if choices and isinstance(choices, list):
                c0 = choices[0]
                if isinstance(c0, dict):
                    msg = c0.get("message") or c0.get(
                        "content") or c0.get("text")
                    if isinstance(msg, dict):
                        return msg.get("content") or msg.get("text")
                    if isinstance(msg, str):
                        return msg
        return str(completion)
    except Exception:
        return "<empty reply>"


def ensure_conversation(session_id):
    if session_id not in conversations:
        conversations[session_id] = [
            {"role": "system", "content": "You are a helpful assistant."}]
    return conversations[session_id]


def resolve_model(requested_model: str):
    if not requested_model:
        raise ValueError("no model specified")
    req = requested_model.strip().lower()
    if req in ALLOWED_MODELS:
        return ALLOWED_MODELS[req]
    for val in ALLOWED_MODELS.values():
        if req in val.lower():
            return val
    raise ValueError(f"model not allowed: {requested_model}")


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "time": datetime.utcnow().isoformat() + "Z"}), 200


@app.route("/models", methods=["GET"])
def list_models():
    items = [{"name": k, "id": v} for k, v in sorted(ALLOWED_MODELS.items())]
    return jsonify({"models": items}), 200


@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json(force=True)
        session_id = data.get("session_id", "default")
        user_text = (data.get("message") or "").strip()
        requested_model = data.get("model")

        if not user_text:
            return jsonify({"error": "no message provided"}), 400

        try:
            model_to_use = resolve_model(requested_model)
        except ValueError as ve:
            return jsonify({
                "error": str(ve),
                "allowed": list(ALLOWED_MODELS.keys())
            }), 400

        conv = ensure_conversation(session_id)
        conv.append({"role": "user", "content": user_text})
        app.logger.info("session=%s model=%s message=%s",
                        session_id, model_to_use, user_text)

        if model_to_use == ALLOWED_MODELS["deepseek"]:
            if not samba_client:
                return jsonify({
                    "error": "missing_samba_key",
                    "message": "SAMBA_API_KEY not configured on the server."
                }), 401

            try:
                samba_response = samba_client.chat.completions.create(
                    model="DeepSeek-V3.1",
                    messages=conv,
                    temperature=0.1,
                    top_p=0.1,
                )
                reply = safe_extract_reply(samba_response)
            except Exception as e:
                if "Unauthorized" in str(e) or "Invalid API key" in str(e):
                    app.logger.warning("Invalid Samba API key")
                    return jsonify({
                        "error": "sambanova_auth_invalid",
                        "message": "Invalid SambaNova API key. Please verify your SAMBA_API_KEY."
                    }), 401
                app.logger.error("SambaNova error: %s", traceback.format_exc())
                return jsonify({
                    "error": "sambanova_error",
                    "details": str(e)
                }), 502
        else:
            completion = client.chat.completions.create(
                model=model_to_use,
                messages=conv,
                extra_headers={
                    "HTTP-Referer": "https://example.com",
                    "X-Title": "Eula Chat Backend",
                },
            )
            reply = safe_extract_reply(completion)

        conv.append({"role": "assistant", "content": reply})
        return jsonify({"reply": reply}), 200

    except Exception as e:
        app.logger.error("Exception in /chat: %s", traceback.format_exc())
        return jsonify({"error": "server error", "details": str(e)}), 500


@app.route("/clear/<session_id>", methods=["POST", "GET"])
def clear_session(session_id):
    if session_id in conversations:
        conversations.pop(session_id, None)
        return jsonify({"ok": True, "message": f"cleared session {session_id}"}), 200
    return jsonify({"ok": False, "message": "session not found"}), 404


if __name__ == "__main__":
    app.logger.info("Starting Flask debug server at %s:%d", HOST, PORT)
    app.run(host=HOST, port=PORT, debug=True)
