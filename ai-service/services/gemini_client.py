"""
Gemini API wrapper using the new google.genai SDK.
Retry logic and graceful degradation (returns None on failure).
"""
import json
import logging
import re
import asyncio
from typing import Any

from google import genai
from google.genai import types
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_client = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY not set")
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def _extract_json(text: str) -> dict:
    """
    Extract the first JSON object from a Gemini response string.
    Handles markdown code fences and leading/trailing whitespace.
    """
    text = re.sub(r"```(?:json)?", "", text).strip()
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
async def _generate_text_with_retry(prompt: str, temperature: float, max_tokens: int) -> str:
    def call_gemini() -> str:
        client = _get_client()
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            ),
        )
        text = (response.text or "").strip()
        if not text:
            raise ValueError("Gemini returned an empty response")
        return text

    return await asyncio.to_thread(call_gemini)


@retry(
    retry=retry_if_exception_type(Exception),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    reraise=True,
)
async def _generate_json_with_retry(prompt: str) -> dict[str, Any]:
    text = await _generate_text_with_retry(prompt, temperature=0.2, max_tokens=1024)
    return _extract_json(text)


async def generate_json(prompt: str) -> dict[str, Any] | None:
    """
    Call Gemini and parse the response as JSON.
    Returns None on failure so callers can degrade gracefully.
    """
    if not settings.gemini_api_key:
        logger.warning("GEMINI_API_KEY not set — AI features disabled")
        return None
    try:
        return await _generate_json_with_retry(prompt)
    except Exception as exc:
        logger.error("Gemini JSON generation failed: %s", exc)
        return None


async def generate_text(prompt: str, temperature: float = 0.4, max_tokens: int = 512) -> str | None:
    """
    Call Gemini and return the raw text response.
    Returns None on failure.
    """
    if not settings.gemini_api_key:
        return None
    try:
        return await _generate_text_with_retry(prompt, temperature=temperature, max_tokens=max_tokens)
    except Exception as exc:
        logger.error("Gemini text generation failed: %s", exc)
        return None
