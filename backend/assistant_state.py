from enum import Enum

class AssistantState(Enum):
    IDLE = "idle"
    LISTENING = "listening"
    THINKING = "thinking"
    SPEAKING = "speaking"
    HANDOFF = "handoff"
    WAITING_FOR_HANDOFF = "waiting_for_handoff"
