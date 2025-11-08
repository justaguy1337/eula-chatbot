# Eula Chatbot

A Flask-based AI chatbot with a React Native front-end, featuring real-time communication, speech recognition, and seamless OpenAI API integration.

---

## Features

- **Flask Backend API**
  - Handles chat requests and responses through OpenRouter / OpenAI endpoints.
  - Maintains in-memory conversation sessions.
  - Includes health check and session reset endpoints.

- **AI Chat Interface (React Native)**
  - Modern mobile UI built with React Native and Expo.
  - Real-time assistant responses with message bubbles and timestamps.
  - Dynamic typing indicator for assistant responses.
  - Smooth animations for better user experience.

- **Voice Recognition**
  - Integrated speech-to-text using SpeechRecognition and PyAudio.
  - Trigger voice input directly from the mobile interface.
  - Automatic transcription displayed before sending.

- **Configurable and Extensible**
  - Easily modify API endpoints, models, and UI theme.
  - Local server setup for quick development and debugging.

---

## Requirements

### Backend
- Python 3.9+
- Flask 3.1+
- Flask-CORS
- OpenAI Python SDK
- SpeechRecognition
- PyAudio

### Frontend
- Node.js 18+
- React Native (Expo)
- Android Studio or iOS Simulator

---

## Installation

### 1. Clone the repository
```bash
git clone https://github.com/justaguy1337/eula-chatbot.git
cd eula-chatbot
```

### 2. Set up the backend

my_api_key = "your_api_key_here"
```bash
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

