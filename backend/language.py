import re

def detect_language(text):
    # Check for Devanagari script
    if re.search(r"[\u0900-\u097F]", text):
        return "hi"

    # Check for common Hindi words/phrases (require at least 2 matches to avoid false positives)
    hindi_indicators = [
        "hai", "ka", "ki", "ke", "ko", "se", "ne", "ho", "tha", "thi",
        "नहीं", "हाँ", "क्या", "कौन", "कहाँ", "कब", "कैसे", "क्यों", "मैं", "तुम", "हम", "यह", "वह",
        "कर", "रहा", "है", "हो", "गया", "करें", "बात", "काम", "समय", "दिन", "रात"
    ]

    text_lower = text.lower()
    hindi_count = 0
    for word in hindi_indicators:
        if word in text_lower:
            hindi_count += 1

    # Require at least 1 Hindi indicator to classify as Hindi
    if hindi_count >= 1:
        return "hi"

    return "en"
