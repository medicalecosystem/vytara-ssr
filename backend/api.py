import os
from fastapi.responses import Response
from fastapi import FastAPI
from fastapi import UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from assistant_controller import AssistantController

app = FastAPI(title="Voice Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

assistant = AssistantController()

class TextRequest(BaseModel):
    text: str

@app.get("/")
def health_check():
    return {"status": "Assistant running"}

@app.get("/state")
def get_state():
    state = assistant.get_state()
    print("STATE POLL:", state)
    return {"state": state}

@app.post("/reply")
async def reply_text(data: dict):
    text = data["text"]
    mute = data.get("mute", False)
    reply = assistant.process_text(text, speak=not mute)
    return {"reply": reply}



@app.post("/voice")
async def voice_input(file: UploadFile = File(...)):
    temp_path = f"temp_{file.filename}"

    try:
        with open(temp_path, "wb") as f:
            f.write(await file.read())

        text = assistant.transcribe_audio(temp_path)
        reply = assistant.process_text(text, speak=False)

        return {"reply": reply}

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/api/chat")
async def chat_endpoint(data: dict):
    message = data.get("message", "")
    if not message:
        return {"reply": "No message provided."}
    reply, audio_bytes = assistant.process_text(message, speak=True)  # Enable voice for web chat
    response = {"reply": reply}
    if audio_bytes:
        response["audio"] = audio_bytes.decode('latin-1')  # Encode audio bytes for JSON
    return response

