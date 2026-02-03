FAQS = {
    "upload documents": {
        "en": "Go to Vault and click Upload.",
        "hi": "Vault में जाकर Upload पर क्लिक करें।"
    },
    "data secure": {
        "en": "Your medical data is encrypted and secure.",
        "hi": "आपका मेडिकल डेटा सुरक्षित और एन्क्रिप्टेड है।"
    }
}

def faq_reply(text, lang):
    text = text.lower()
    for key in FAQS:
        if key in text:
            return FAQS[key][lang]
    return None
