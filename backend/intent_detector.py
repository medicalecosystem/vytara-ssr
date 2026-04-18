# ─────────────────────────────────────────────
# intent_detector.py
# ─────────────────────────────────────────────

import os
import re
import random
from groq import Groq
from dotenv import load_dotenv


load_dotenv()

GREETING_RESPONSES = [
    "Hello! How can I help you today?",
    "Hi there! What can I do for you?",
    "Hey! Need any help?",
    "Namaste! How can I assist you?",
    "Hi! Ask me anything about your health info.",
    "Hello! I'm here to help you.",
    "Hey there! What would you like to know?",
    "Hi! How can I support you today?",
    "Hello! Need help with appointments or medicines?",
    "Hey! I'm ready to assist you.",
    "Hi! What can I help you with today?",
    "Hello! Feel free to ask anything.",
    "Hey! How's it going? Need help?",
    "Hi there! Let me know what you need.",
    "Hello! I'm here whenever you need help."
]

def get_greeting_response() -> str:
    return random.choice(GREETING_RESPONSES)


VALID_INTENTS = [
    "user_appointment",
    "user_medication",
    "user_insurance",
    "profile_card",
    "summary",
    "platform",
    "greeting",
    "unknown",
]

SYSTEM_PROMPT = """You are an intent classifier for a healthcare app.

Classify the user's message into EXACTLY ONE intent.
Return ONLY the intent word. No explanation. No punctuation. No extra text.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VALID INTENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
user_appointment
user_medication
user_insurance
profile_card
summary
platform
greeting
unknown

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GOLDEN RULE (apply first)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- "my / mera / meri / mujhe" + topic  →  user_* intent (personal data)
- "what is / how does / kya hota hai" + topic  →  platform (general info)
- When in doubt between two intents, pick the one that matches the PRIMARY action.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTENT DEFINITIONS + EXAMPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. greeting
   Trigger: casual hello/hi with no real question.
   Examples: "hi", "hello", "hey", "namaste", "good morning", "hii", "yo"
   NOT: "hi, what is my appointment?" → user_appointment (has a real query)

2. user_appointment
   Trigger: user asking about THEIR OWN appointments or schedule.
   Examples: "show my appointments", "when is my next doctor visit?", "mera appointment kab hai?", "cancel my booking", "reschedule my checkup"
   NOT: "what is an appointment?" → platform

3. user_medication
   Trigger: user asking about THEIR OWN medicines or prescriptions.
   Examples: "what medicines am I taking?", "show my prescriptions", "meri dawai kaunsi hai?", "my tablet dosage"
   NOT: "what is metformin?" → platform, "how does insulin work?" → platform

4. user_insurance
   Trigger: user asking about THEIR OWN insurance or claims.
   Examples: "what is my insurance coverage?", "mera claim status kya hai?", "show my policy details", "my reimbursement status"
   NOT: "what is health insurance?" → platform, "how does a claim work?" → platform

5. profile_card
   Trigger: user asking about THEIR OWN personal/demographic details.
   Examples: "show my profile", "what is my age on record?", "mera address kya hai?", "my height and weight", "update my contact number"
   NOT: "what details does the app store?" → platform, "show my health report" → summary

6. summary
   Trigger: user asking for a health overview or lab/test results.
   Examples: "show my health summary", "my blood test results", "mera WBC level kya hai?", "hemoglobin report dikhao", "give me a full health report"
   NOT: "what is hemoglobin?" → platform, "my profile" → profile_card

7. platform
   Trigger: ANY general/informational question not about the user's own data.
   Examples: "what is an insurance claim?", "how do I add a medication?", "appointment kaise book karte hain?", "insurance kya hota hai?", "what does this app do?", "how does the summary section work?"

8. unknown
   Trigger: gibberish, empty input, or completely off-topic messages.
   Examples: "asdfgh", "12345", "what is cricket?", (empty message)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONFLICT RESOLUTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- personal possessive ("my/mera") → prefer user_* over platform
- general/definition question → always platform, even if topic matches a user_* category
- profile vs summary: profile = who you are (name, age, address); summary = health data (reports, labs)
- greeting + real question → ignore greeting, classify the real question
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
    elif "profile_card" in raw or "card" in raw:
        return "profile_card"
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


def detect_intent_with_response(message: str):
    intent = detect_intent(message)

    if intent == "greeting":
        return {
            "intent": intent,
            "answer": get_greeting_response()
        }

    if intent == "unknown":
        return {
            "intent": intent,
            "answer": "Sorry, I can only assist with platform-related queries. Please ask something relevant."
        }

    return {
        "intent": intent,
        "answer": f"Detected intent: {intent}"
    }
