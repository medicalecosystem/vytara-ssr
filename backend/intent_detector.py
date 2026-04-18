# ─────────────────────────────────────────────
# intent_detector.py
# ─────────────────────────────────────────────

import os
import re
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

VALID_INTENTS = [
    "user_appointment",
    "user_medication",
    "user_insurance",
    "user_card",
    "summary",
    "platform",
    "greeting",
    "unknown",
]

SYSTEM_PROMPT = """You are an intent classifier for a healthcare app.

Your job is to classify the user's query into ONE intent.

Return ONLY one word. No explanation. No punctuation.

Valid intents:
user_appointment
user_medication
user_insurance
user_card
summary
platform
greeting
unknown

IMPORTANT RULES:

1. greeting:
   - hi, hello, hey, namaste, etc.

2. user_appointment:
   - user asking about THEIR OWN appointments, booking, schedule

3. user_medication:
   - user asking about THEIR OWN medicines, prescriptions, dosage

4. user_insurance:
   - user asking about THEIR OWN insurance, claims, coverage

5. user_card:
   - user asking about THEIR OWN health card or ID

6. summary:
   - summary, report, overview of their data

7. platform:
   - ANY general question or definition
   - HOW something works / WHAT is something
   - ANY informational query
   - ANY language (Hindi, Hinglish, English, etc.)

   Examples:
   - "What is medication?" → platform
   - "What is insurance?" → platform
   - "How to add medication?" → platform
   - "medication kya hota hai?" → platform
   - "platform kaise use kare?" → platform

8. unknown:
   - empty input, random text, completely unrelated queries

IMPORTANT:
- If the question is informational → ALWAYS return "platform"
- Only return user_* when the user is asking about THEIR OWN data
"""


def _get_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise EnvironmentError("GROQ_API_KEY is not set in environment variables.")
    return Groq(api_key=api_key)


def normalize_intent(raw: str) -> str:
    """Map cleaned model output to a valid internal intent."""
    if "platform" in raw:
        return "platform"
    elif "summary" in raw:
        return "summary"
    elif "appointment" in raw:
        return "user_appointment"
    elif "medication" in raw:
        return "user_medication"
    elif "insurance" in raw:
        return "user_insurance"
    elif "card" in raw:
        return "user_card"
    elif "greeting" in raw:
        return "greeting"
    else:
        return "unknown"


def detect_intent(message: str) -> str:
    if not message or not message.strip():
        return "unknown"

    try:
        client = _get_client()
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": message},
            ],
            temperature=0,
            max_tokens=10,
        )

        raw = response.choices[0].message.content.strip().lower()
        raw = re.sub(r"[^a-z_]", "", raw)   # keep only a-z and underscore
        return normalize_intent(raw)

    except EnvironmentError as e:
        print(f"[IntentDetector CONFIG ERROR] {e}")
        return "unknown"
    except Exception as e:
        print(f"[IntentDetector ERROR] {e}")
        return "unknown"
