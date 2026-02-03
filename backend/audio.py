import sounddevice as sd
import numpy as np
import time
import pygame
import tempfile
import os
from elevenlabs import ElevenLabs, stream
from dotenv import load_dotenv

pygame.mixer.init()

load_dotenv()

ELEVEN_API_KEY = os.getenv("ELEVEN_API_KEY")

eleven = ElevenLabs(api_key=ELEVEN_API_KEY)

VOICE_ID = "21m00Tcm4TlvDq8ikWAM"
MODEL_NAME = "eleven_turbo_v2"

def record_audio(duration=5, samplerate=16000):
    print("🎤 Listening...")
    try:
        audio = sd.rec(int(duration * samplerate), samplerate=samplerate, channels=1)
        sd.wait()
        audio = audio.flatten()
        # Check if audio has data
        if len(audio) == 0 or np.all(audio == 0):
            print("Warning: No audio data recorded or audio is silent.")
            return None, samplerate
        print(f"Audio recorded: {len(audio)} samples at {samplerate} Hz")
        return audio, samplerate
    except Exception as e:
        print(f"Error recording audio: {e}")
        return None, samplerate

def record_audio_with_vad(max_duration=10, silence_threshold=0.015, silence_duration=2.0, samplerate=16000):
    """
    Record audio with voice activity detection.
    Stops recording when silence is detected for silence_duration seconds.
    """
    print("🎤 Listening with VAD...")
    chunk_duration = 0.1  # 100ms chunks
    chunk_samples = int(chunk_duration * samplerate)
    recorded_audio = []
    silence_start = None
    voice_detected = False

    try:
        with sd.InputStream(samplerate=samplerate, channels=1, dtype='float32') as stream:
            start_time = time.time()
            while time.time() - start_time < max_duration:
                # Read a chunk
                chunk, overflowed = stream.read(chunk_samples)
                chunk = chunk.flatten()

                # Calculate RMS energy
                rms = np.sqrt(np.mean(chunk**2))
                # print(f"RMS: {rms:.4f}")  # Debug: uncomment to see RMS values

                # Check if this chunk has voice
                if rms > silence_threshold:
                    # Voice detected
                    if not voice_detected:
                        print("Voice detected, starting recording...")
                        voice_detected = True
                    silence_start = None
                    recorded_audio.extend(chunk)
                else:
                    # Silence detected
                    if voice_detected:  # Only start silence timer if we had voice before
                        if silence_start is None:
                            silence_start = time.time()
                            print(f"Silence started...")
                        elif time.time() - silence_start >= silence_duration:
                            # Silence duration exceeded, stop recording
                            print(f"Silence detected for {silence_duration}s, stopping recording.")
                            break

                # Safety check: if we have too much audio, stop
                if len(recorded_audio) > max_duration * samplerate:
                    break

        if recorded_audio:
            audio = np.array(recorded_audio)
            print(f"Audio recorded with VAD: {len(audio)} samples ({len(audio)/samplerate:.1f}s) at {samplerate} Hz")
            return audio, samplerate
        else:
            print("Warning: No audio data recorded with VAD.")
            return None, samplerate

    except Exception as e:
        print(f"Error in VAD recording: {e}")
        return None, samplerate

def speak(text):
    try:
        audio_bytes = b"".join(eleven.text_to_speech.convert(
            text=text,
            voice_id=VOICE_ID,
            model_id=MODEL_NAME
        ))
        return audio_bytes
    except Exception as e:
        print(f"Error in text-to-speech: {e}")
        return None

def play_audio(audio_bytes):
    if audio_bytes is None:
        return
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as temp_file:
            temp_file.write(audio_bytes)
            temp_file_path = temp_file.name
        pygame.mixer.music.load(temp_file_path)
        pygame.mixer.music.play()
        while pygame.mixer.music.get_busy():
            time.sleep(0.1)
        os.unlink(temp_file_path)
    except Exception as e:
        print(f"Error playing audio: {e}")
