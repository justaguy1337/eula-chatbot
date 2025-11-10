# Eula Chatbot

A modern AI chatbot featuring a Flask backend and a React Native (Expo) frontend.  
It supports text and voice chat, real-time responses, and multiple AI model integrations — including DeepSeek via SambaNova and OpenRouter-hosted models like ChatGPT, Meta LLaMA, and Nvidia Nemotron.

---

## Features

### Backend (Flask + OpenRouter + SambaNova)
- Unified chat API supporting multiple model providers.
- Automatic routing:
  - DeepSeek → SambaNova API
  - All others → OpenRouter API
- Session-based chat memory (per session ID).
- Health-check and session-clear endpoints.
- Built-in rate-limit and error handling.

### Frontend (React Native + Expo)
- Clean modern chat UI with timestamped message bubbles.
- Model selector (ChatGPT, DeepSeek, Meta LLaMA, etc).
- Animated typing indicator.
- Voice input modal with pulsing mic animation.
- Auto-scroll to the latest message.

### Voice Recognition
- Local Flask microservice (`voice_server.py`) using SpeechRecognition + PyAudio.
- Transcribes speech to text and injects it into chat input automatically.

---

## Requirements

### Backend
| Dependency | Version | Description |
|-------------|----------|-------------|
| Python | 3.9 or higher | Required runtime |
| Flask | 3.1+ | Backend web server |
| Flask-CORS | – | Cross-origin support |
| openai | Latest | For OpenRouter API |
| sambanova | Latest | For DeepSeek via SambaNova |
| SpeechRecognition | – | Voice input transcription |
| PyAudio | – | Microphone input |

### Frontend
| Dependency | Version | Description |
|-------------|----------|-------------|
| Node.js | 18 or higher | JavaScript runtime |
| Expo CLI | Latest | For running the RN app |
| React Native | 0.7x | UI framework |
| Android Studio / Xcode | – | To run emulator/simulator |

---

## Installation

### 1. Clone the repository
```bash
git clone https://github.com/justaguy1337/eula-chatbot.git
cd eula-chatbot


### 1. Clone the repository
```bash
git clone https://github.com/justaguy1337/eula-chatbot.git
cd eula-chatbot
```

### 2. Set up the backend
```bash
openKey = "your_openrouter_api_key_here"
sambaApiKey = "your_sambanova_api_key_here"

pip install -r requirements.txt
python flask_server.py
```

### 4. Set up frontend
```bash
python voice_server.py
```

### 4. Set up frontend
```bash
cd eula
npx expo start
```

