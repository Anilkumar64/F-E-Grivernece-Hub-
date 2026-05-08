"""
POST /chat
Simple FAQ chatbot for the student portal.
Maintains conversation context and answers questions about the grievance portal.
"""
import logging
from fastapi import APIRouter
from pydantic import BaseModel, Field
from services.gemini_client import generate_text

logger = logging.getLogger(__name__)
router = APIRouter()

SYSTEM_CONTEXT = """
You are a helpful assistant for a university E-Grievance portal.
You help students understand how to submit, track, and follow up on grievances.

Key facts about the portal:
- Students can submit grievances at /submit-grievance
- Grievances go through statuses: Pending -> InProgress -> UnderReview -> Resolved/Closed
- SLA deadline: typically 48-72 hours depending on category
- Students can track grievances at /track-grievance
- Students can add comments or follow-up evidence
- Escalation happens automatically if SLA is breached
- Students can request grievance reopening within 7 days of resolution
- Supported categories: Academic, Hostel, Transport, Library, Canteen, Sports, Administrative, Financial, IT

Rules:
- Be concise (under 120 words)
- Do NOT make up grievance IDs, statuses, or personal information
- If asked about a specific grievance status, tell the student to check /track-grievance
- Stay on topic - only answer questions about the grievance portal
"""


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., max_length=1000)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)
    history: list[ChatMessage] = Field(default=[], max_length=10)


class ChatResponse(BaseModel):
    available: bool = True
    reply: str = ""


@router.post("", response_model=ChatResponse)
async def chat(body: ChatRequest):
    history_text = ""
    for msg in body.history[-6:]:
        role = "Student" if msg.role == "user" else "Assistant"
        history_text += f"\n{role}: {msg.content}"

    prompt = f"""{SYSTEM_CONTEXT}

Conversation so far:{history_text}

Student: {body.message}
Assistant:"""

    reply = await generate_text(prompt, temperature=0.5, max_tokens=200)
    if reply is None:
        return ChatResponse(available=False)

    return ChatResponse(available=True, reply=reply)
