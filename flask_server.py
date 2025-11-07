# flask_server.py
import os
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
from datetime import datetime
from apiKey import my_api_key

app = Flask(__name__)
CORS(app)  # for development only; lock origins in production

# --- Configuration ---
BASE_URL = os.environ.get("OPENROUTER_BASE_URL",
                          "https://openrouter.ai/api/v1")
DEFAULT_MODEL = os.environ.get(
    "OPENROUTER_MODEL", "deepseek/deepseek-chat-v3.1")

HOST = os.environ.get("FLASK_HOST", "0.0.0.0")
PORT = int(os.environ.get("FLASK_PORT", 8000))

# --- Client init ---
client = OpenAI(base_url=BASE_URL, api_key=my_api_key)

# --- In-memory conversation store (for dev) ---
conversations = {}  # { session_id: [ {role, content}, ... ] }

# --- Helpers ---


def safe_extract_reply(completion):
    """
    Try several common response shapes and return a string reply.
    """
    try:
        # preferred accessor used by newer SDKs
        return completion.choices[0].message.content
    except Exception:
        pass
    try:
        # fallback if older shape
        return completion.choices[0].text
    except Exception:
        pass
    # as last resort return stringified object
    try:
        return str(completion)
    except Exception:
        return "<empty reply>"


def ensure_conversation(session_id):
    if session_id not in conversations:
        conversations[session_id] = [
            {"role": "system", "content": "You are a helpful assistant."}]
    return conversations[session_id]

# --- Routes ---


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "time": datetime.utcnow().isoformat() + "Z"}), 200


@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json(force=True)
        app.logger.debug("Incoming payload: %s", data)

        session_id = data.get("session_id", "default")
        user_text = (data.get("message") or "").strip()

        if not user_text:
            return jsonify({"error": "no message provided"}), 400

        conv = ensure_conversation(session_id)
        conv.append({"role": "user", "content": user_text})

        app.logger.info("session=%s user_message=%s", session_id, user_text)

        # Call OpenRouter
        completion = client.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=conv,
            extra_headers={
                "HTTP-Referer": "https://example.com",
                "X-Title": "Mobile Chat Proxy"
            },
        )

        app.logger.debug("Raw completion object: %s", getattr(
            completion, "__dict__", str(completion)))

        reply = safe_extract_reply(completion)
        conv.append({"role": "assistant", "content": reply})

        return jsonify({"reply": reply}), 200

    except Exception as e:
        app.logger.error("Exception in /chat: %s", traceback.format_exc())
        return jsonify({"error": "server error", "details": str(e)}), 500

# --- Useful dev endpoint: clear conversation (optional) ---


@app.route("/clear/<session_id>", methods=["POST", "GET"])
def clear_session(session_id):
    if session_id in conversations:
        conversations.pop(session_id, None)
        return jsonify({"ok": True, "message": f"cleared session {session_id}"}), 200
    return jsonify({"ok": False, "message": "session not found"}), 404


# --- Main ---
if __name__ == "__main__":
    app.logger.info("Starting Flask debug server at %s:%d", HOST, PORT)
    app.run(host=HOST, port=PORT, debug=True)
