import threading
import time
from faq_engine import find_faq_match

from assistant_state import AssistantState
from audio import speak, play_audio
from llm import get_reply
from language import detect_language
from faq import faq_reply

from llm import speech_to_text

class AssistantController:
    def __init__(self):
        self.state = AssistantState.IDLE
        self.waiting_for_handoff = False

    def transcribe_audio(self, path: str):
        # Faster-Whisper can read file directly
        return speech_to_text(path)

    def get_state(self):
        return self.state.value

    def _speak_async(self, reply: str):
        self.state = AssistantState.SPEAKING
        audio_bytes = speak(reply)
        play_audio(audio_bytes)
        self.state = AssistantState.IDLE

    def _speak_sync(self, reply: str):
        self.state = AssistantState.SPEAKING
        audio_bytes = speak(reply)
        self.state = AssistantState.IDLE
        return audio_bytes

    def process_text(self, text: str, speak: bool = True):
        # THINKING
        self.state = AssistantState.THINKING
        # time.sleep(0)  # no delay for instant response

        lang = detect_language(text)

        # Check if waiting for handoff response
        if self.waiting_for_handoff:
            if any(word in text.lower() for word in ["yes", "yeah", "sure", "okay", "haan", "ji", "हाँ", "जी"]):
                reply = (
                    "Connecting you to customer care."
                    if lang == "en"
                    else
                    "आपको ग्राहक सेवा से जोड़ रहा हूँ।"
                )
                self.state = AssistantState.HANDOFF
            else:
                reply = (
                    "Okay, let me know if you have any other questions about using the website."
                    if lang == "en"
                    else
                    "ठीक है, अगर आपको वेबसाइट के उपयोग के बारे में कोई अन्य प्रश्न हैं तो बताएं।"
                )
                self.state = AssistantState.IDLE
            self.waiting_for_handoff = False

            # Speak reply only if speak is True
            if speak:
                audio_bytes = self._speak_sync(reply)
            else:
                audio_bytes = None

            return reply, audio_bytes

        # 1️⃣ Try FAQ engine first
        faq_result = find_faq_match(text)

        if faq_result.get("matched"):
            reply = faq_result["answer"]

            # If FAQ says handoff is needed
            if faq_result.get("handoff"):
                self.state = AssistantState.HANDOFF

            # Speak FAQ reply only if speak is True
            if speak:
                audio_bytes = self._speak_sync(reply)
            else:
                audio_bytes = None

            return reply, audio_bytes

        # 2️⃣ Check for emergency keywords
        if any(word in text.lower() for word in ["pain", "emergency"]):
            reply = (
                "For medical emergencies, please contact a doctor or emergency services."
                if lang == "en"
                else
                "आपात स्थिति में कृपया डॉक्टर या आपात सेवाओं से संपर्क करें।"
            )
        else:
            # 3️⃣ Fallback to LLM (support-safe)
            reply = get_reply(text, lang)

            # Check if LLM offered handoff
            if "Would you like to connect to customer care?" in reply or "क्या आप ग्राहक सेवा से जुड़ना चाहेंगे?" in reply:
                self.waiting_for_handoff = True
                self.state = AssistantState.WAITING_FOR_HANDOFF

        # Speak reply only if speak is True
        if speak:
            audio_bytes = self._speak_sync(reply)
        else:
            audio_bytes = None

        return reply, audio_bytes

