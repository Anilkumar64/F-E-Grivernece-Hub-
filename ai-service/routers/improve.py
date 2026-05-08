"""
POST /improve
Takes a raw grievance description and returns a professionally rewritten version
with a diff-friendly before/after structure.
"""
import logging
from fastapi import APIRouter
from pydantic import BaseModel, Field
from services.gemini_client import generate_text

logger = logging.getLogger(__name__)
router = APIRouter()

PROMPT_TEMPLATE = """
You are a professional writing assistant for a university grievance portal.
Rewrite the following student grievance description to be:
- Clear and professional (no slang, no excessive emotion)
- Factual and specific (who, what, when, where)
- Concise (max 400 words)
- Respectful in tone

Original description:
\"\"\"
{description}
\"\"\"

Return ONLY the improved description text. Do not add a preamble or explanation.
Do not change the core facts. If the description is already good, return it mostly unchanged.
"""


class ImproveRequest(BaseModel):
    description: str = Field(..., min_length=20, max_length=5000)


class ImproveResponse(BaseModel):
    available: bool = True
    improved_description: str = ""


@router.post("", response_model=ImproveResponse)
async def improve_description(body: ImproveRequest):
    prompt = PROMPT_TEMPLATE.format(description=body.description.strip())
    result = await generate_text(prompt, temperature=0.3, max_tokens=600)

    if result is None:
        return ImproveResponse(available=False)

    return ImproveResponse(available=True, improved_description=result)
