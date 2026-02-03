from faster_whisper import WhisperModel
from groq import Groq
from dotenv import load_dotenv
import os
import numpy as np
import io

load_dotenv()

model = WhisperModel("medium", device="cpu", compute_type="int8")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=GROQ_API_KEY)

def speech_to_text(audio_input, samplerate=None):
    try:
        if isinstance(audio_input, str):
            # audio_input is a file path
            segments, _ = model.transcribe(audio_input, beam_size=1)
        else:
            # audio_input is a numpy array
            if samplerate is None:
                samplerate = 16000  # default
            # Ensure audio is float32 in range [-1, 1]
            audio = audio_input.astype(np.float32)
            # Normalize if the audio appears to be in int16 range
            if np.max(np.abs(audio)) > 1.0:
                audio = audio / 32768.0  # Normalize assuming int16 range
            # Ensure values are in [-1, 1]
            audio = np.clip(audio, -1.0, 1.0)
            segments, _ = model.transcribe(audio, beam_size=1)
        return "".join(seg.text for seg in segments)
    except Exception as e:
        print(f"Error in speech-to-text: {e}")
        return ""

def get_reply(text, lang):
    try:
        system_prompt = (
            "You are a calm healthcare support assistant for our website. "
            "You are not a doctor or nurse; you only help with using the website. "
            "The website allows users to: book appointments, view medical records, update profile, reset password, view pricing, contact support. "
            "Do not give medical diagnosis or advice. "
            "Keep replies short and spoken-friendly. "
            f"Reply in {'Hindi' if lang == 'hi' else 'English'}. "
            "If the question is not about using the website, say: 'I'm sorry, I can only help with website usage. Would you like to connect to customer care?'"
        )

        completion = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ],
        )
        return completion.choices[0].message.content
    except Exception as e:
        print(f"Error in LLM reply: {e}")
        return "I'm sorry, I couldn't process your request right now. Please try again."
