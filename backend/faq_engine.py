from faq_data import FAQS

def find_faq_match(user_text: str, lang: str = "en"):
    text = user_text.lower()

    for faq in FAQS:
        for keyword in faq["keywords"]:
            if keyword in text:
                # Always use English answers
                answer = faq["answer"]["en"] if isinstance(faq["answer"], dict) and "en" in faq["answer"] else faq["answer"]
                return {
                    "matched": True,
                    "answer": answer,
                    "handoff": faq["handoff"],
                    "faq_id": faq["id"]
                }

    return {
        "matched": False
    }
