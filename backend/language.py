import re

def detect_language(text):
    # Check for Devanagari script
    if re.search(r"[\u0900-\u097F]", text):
        return "hi"

    # Check for common Hindi words/phrases
    hindi_indicators = [
        "hai", "ka", "ki", "ke", "ko", "se", "me", "ne", "ho", "tha", "thi", "the",
        "doctor", "treatment", "medicine", "hospital", "patient", "health", "pain",
        "emergency", "help", "please", "thank", "sorry", "yes", "no", "good", "bad"
    ]

    text_lower = text.lower()
    for word in hindi_indicators:
        if word in text_lower:
            return "hi"

    return "en"
