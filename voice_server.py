import speech_recognition as sr
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

ENERGY_THRESHOLD = 300
PAUSE_THRESHOLD = 0.8
DYNAMIC_ENERGY_ADJUSTMENT_DAMPING = 0.15
DYNAMIC_ENERGY_RATIO = 1.5


@app.route('/listen', methods=['POST'])
def listen():
    recognizer = sr.Recognizer()
    recognizer.energy_threshold = ENERGY_THRESHOLD
    recognizer.pause_threshold = PAUSE_THRESHOLD
    recognizer.dynamic_energy_adjustment_damping = DYNAMIC_ENERGY_ADJUSTMENT_DAMPING
    recognizer.dynamic_energy_ratio = DYNAMIC_ENERGY_RATIO

    try:
        with sr.Microphone(sample_rate=44100) as source:
            print("Adjusting for ambient noise...")
            recognizer.adjust_for_ambient_noise(source, duration=2)
            print("Listening...")
            audio = recognizer.listen(
                source,
                timeout=15,
                phrase_time_limit=15,
            )
            print("Processing speech...")
            text = recognizer.recognize_google(
                audio,
                language="en-US",
                show_all=False
            )
            text = text.strip()
            print(f"Recognized: {text}")
            return jsonify({"success": True, "text": text})

    except sr.WaitTimeoutError:
        return jsonify({
            "success": False,
            "error": "No speech detected. Please try again and speak clearly."
        })
    except sr.RequestError as e:
        return jsonify({
            "success": False,
            "error": f"Service error: {str(e)}"
        })
    except sr.UnknownValueError:
        return jsonify({
            "success": False,
            "error": "Could not understand audio. Please speak more slowly and clearly."
        })
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"An error occurred: {str(e)}"
        })


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8001)
