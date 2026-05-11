"""
POST /analyze
Analyzes a grievance title+description with Gemini and returns:
  - suggested category & priority
  - urgency / mental-health flags
  - sentiment
  - content moderation flags
  - spam score
"""
import logging
from fastapi import APIRouter
from pydantic import BaseModel, Field
from services.gemini_client import generate_json

logger = logging.getLogger(__name__)
router = APIRouter()

PROMPT_TEMPLATE = """
You are an expert grievance analyst for a university complaint management system.
Analyze the following student grievance and return a structured JSON assessment.

Title: {title}
Description: {description}

Return ONLY a valid JSON object with these exact fields (no markdown, no explanation):
{{
  "suggested_category": one of ["Academic", "Hostel", "Transport", "Library", "Canteen", "Sports", "Administrative", "Financial", "IT", "Other"],
  "suggested_priority": one of ["Low", "Medium", "High", "Critical"],
  "urgency_flags": array of zero or more from ["mental_health", "safety", "financial", "academic_blocker", "harassment", "discrimination"],
  "sentiment": one of ["positive", "neutral", "negative", "distressed"],
  "summary": "A single clear sentence summarizing the core issue",
  "content_flags": array of zero or more from ["offensive", "spam", "inappropriate", "threatening"],
  "spam_score": a float between 0.0 (genuine) and 1.0 (obvious spam),
  "mental_health_risk": one of ["none", "low", "medium", "high"],
  "reasoning": "1-2 sentences explaining your priority and urgency assessment"
}}

Rules:
- "Critical" priority = immediate safety/health risk, exam/placement blocker, or harassment
- "High" = significant academic or financial impact
- mental_health_risk "high" = suicidal ideation, self-harm language, extreme distress signals
- spam_score > 0.7 = treat as likely spam (short, irrelevant, or test submission)
"""


class AnalyzeRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10, max_length=5000)


class AnalyzeResponse(BaseModel):
    available: bool = True
    suggested_category: str = "Other"
    suggested_priority: str = "Medium"
    urgency_flags: list[str] = Field(default_factory=list)
    sentiment: str = "neutral"
    summary: str = ""
    content_flags: list[str] = Field(default_factory=list)
    spam_score: float = 0.0
    mental_health_risk: str = "none"
    reasoning: str = ""


@router.post("", response_model=AnalyzeResponse)
async def analyze_grievance(body: AnalyzeRequest):
    prompt = PROMPT_TEMPLATE.format(
        title=body.title.strip(),
        description=body.description.strip(),
    )
    result = await generate_json(prompt)

    if result is None:
        return AnalyzeResponse(available=False)

    return AnalyzeResponse(
        available=True,
        suggested_category=result.get("suggested_category", "Other"),
        suggested_priority=result.get("suggested_priority", "Medium"),
        urgency_flags=result.get("urgency_flags", []),
        sentiment=result.get("sentiment", "neutral"),
        summary=result.get("summary", ""),
        content_flags=result.get("content_flags", []),
        spam_score=float(result.get("spam_score", 0.0)),
        mental_health_risk=result.get("mental_health_risk", "none"),
        reasoning=result.get("reasoning", ""),
    )
