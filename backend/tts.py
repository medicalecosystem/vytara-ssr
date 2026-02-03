from elevenlabs import ElevenLabs
from dotenv import load_dotenv
import os

load_dotenv()

ELEVEN_API_KEY = os.getenv("ELEVEN_API_KEY")

client = ElevenLabs(api_key=ELEVEN_API_KEY)

VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Rachel (good default)
MODEL_ID = "eleven_multilingual_v2"

def generate_speech(text: str) -> bytes:
    """
    Returns raw audio bytes (MP3)
    """
    audio = client.text_to_speech.convert(
        voice_id=VOICE_ID,
        model_id=MODEL_ID,
        text=text
    )

    audio_bytes = b"".join(audio)
    return audio_bytes
