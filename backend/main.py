import os
import logging
import numpy as np
from scipy.io.wavfile import write
from assistant_state import AssistantState
from audio import record_audio, record_audio_with_vad, speak
from llm import speech_to_text, get_reply
from language import detect_language
from faq_engine import find_faq_match

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

print("🎙 Voice Assistant Ready")

state = AssistantState.IDLE
waiting_for_handoff = False

while True:
    try:
        state = AssistantState.LISTENING
        print("STATE:", state.value)
        logging.info(f"State changed to: {state.value}")

        audio, samplerate = record_audio(5)
        if audio is None:
            logging.warning("Audio recording failed, skipping...")
            continue

        logging.info(f"Audio recorded successfully: {len(audio)} samples")
        user_text = speech_to_text(audio, samplerate).strip()

        if not user_text:
            logging.info("No speech detected, continuing...")
            continue

        print("You:", user_text)
        logging.info(f"User input: {user_text}")

        if user_text.lower() in ["exit", "quit", "bye"]:
            logging.info("User requested exit")
            break

        state = AssistantState.THINKING
        print("STATE:", state.value)
        logging.info(f"State changed to: {state.value}")

        lang = detect_language(user_text)
        logging.info(f"Detected language: {lang}")

        # Check if waiting for handoff response
        if waiting_for_handoff:
            if any(word in user_text.lower() for word in ["yes", "yeah", "sure", "okay", "haan", "ji", "हाँ", "जी"]):
                reply = (
                    "Connecting you to customer care."
                    if lang == "en"
                    else
                    "आपको ग्राहक सेवा से जोड़ रहा हूँ।"
                )
                state = AssistantState.HANDOFF
                print("STATE:", state.value)
                logging.info(f"State changed to: {state.value}")
            else:
                reply = (
                    "Okay, let me know if you have any other questions about using the website."
                    if lang == "en"
                    else
                    "ठीक है, अगर आपको वेबसाइट के उपयोग के बारे में कोई अन्य प्रश्न हैं तो बताएं।"
                )
                state = AssistantState.IDLE
                logging.info(f"State changed to: {state.value}")
            waiting_for_handoff = False
        else:
            faq_result = find_faq_match(user_text, lang)
            if faq_result.get("matched"):
                reply = faq_result["answer"]
                logging.info(f"FAQ match found: {faq_result['faq_id']}")
                if faq_result.get("handoff"):
                    state = AssistantState.HANDOFF
                    print("STATE:", state.value)
                    logging.info(f"State changed to: {state.value}")
            else:
                reply = get_reply(user_text, lang)
                logging.info("Generated LLM reply")

                # Check if LLM offered handoff
                if "Would you like to connect to customer care?" in reply or "क्या आप ग्राहक सेवा से जुड़ना चाहेंगे?" in reply:
                    waiting_for_handoff = True
                    state = AssistantState.WAITING_FOR_HANDOFF
                    print("STATE:", state.value)
                    logging.info(f"State changed to: {state.value}")

            if any(word in user_text.lower() for word in ["pain", "emergency"]):
                reply = (
                    "For medical emergencies, please contact a doctor or emergency services."
                    if lang == "en"
                    else
                    "आपात स्थिति में कृपया डॉक्टर या आपात सेवाओं से संपर्क करें।"
                )
                logging.info("Emergency keywords detected, overriding reply")

        state = AssistantState.SPEAKING
        print("STATE:", state.value)
        logging.info(f"State changed to: {state.value}")

        import threading
        from audio import play_audio
        threading.Thread(target=lambda: play_audio(speak(reply)), daemon=True).start()
        logging.info("Reply speaking started")

        state = AssistantState.IDLE
        logging.info(f"State changed to: {state.value}")
    except Exception as e:
        print(f"Error in main loop: {e}")
        logging.error(f"Error in main loop: {e}")
        state = AssistantState.IDLE
        continue
