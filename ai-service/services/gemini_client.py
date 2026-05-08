"""
Gemini API wrapper with retry logic and graceful degradation.
"""
import json
import logging
import re
from typing import Any

import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Configure Gemini globally
if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)

_model = None


def _get_model() -> genai.GenerativeModel:
    global _model
    if _model is None:
        _model = genai.GenerativeModel(settings.gemini_model)
    return _model


def _extract_json(text: str) -> dict:
    """
    Extract the first JSON object from a Gemini response string.
    Handles markdown code fences and leading/trailing whitespace.
    """
    # Strip markdown fences
    text = re.sub(r"```(?:json)?", "", text).strip()
    # Find the outermost {...}
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in response: {text[:200]}")
    return json.loads(match.group())


@retry(
    retry=retry_if_exception_type(Exception),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    reraise=True,
)
async def generate_json(prompt: str) -> dict[str, Any] | None:
    """
    Call Gemini and parse the response as JSON.
    Returns None on failure so callers can degrade gracefully.
    """
    if not settings.gemini_api_key:
        logger.warning("GEMINI_API_KEY not set — AI features disabled")
        return None
    try:
        model = _get_model()
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.2,
                max_output_tokens=1024,
            ),
        )
        return _extract_json(response.text)
    except Exception as exc:
        logger.error("Gemini JSON generation failed: %s", exc)
        return None


@retry(
    retry=retry_if_exception_type(Exception),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    reraise=True,
)
async def generate_text(prompt: str, temperature: float = 0.4, max_tokens: int = 512) -> str | None:
    """
    Call Gemini and return the raw text response.
    Returns None on failure.
    """
    if not settings.gemini_api_key:
        return None
    try:
        model = _get_model()
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            ),
        )
        return response.text.strip()
    except Exception as exc:
        logger.error("Gemini text generation failed: %s", exc)
        return None
