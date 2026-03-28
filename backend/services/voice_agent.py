"""
services/voice_agent.py
Feature 2 — AI Voice Agent
Stateless Claude Sonnet integration.
The frontend sends the clerk's transcribed question + extracted fields.
Claude answers in the clerk's language in 1-2 sentences and identifies
which field it was talking about (for frontend bounding-box flash).
"""

import json
import os
import re

import anthropic
from dotenv import load_dotenv

load_dotenv()

_MODEL = os.getenv("VOICE_AGENT_MODEL", "claude-sonnet-4-5")

# Language display names for the system prompt
_LANG_NAMES = {
    "en-IN": "Indian English",
    "hi-IN": "Hindi",
    "mr-IN": "Marathi",
}

_SYSTEM_TEMPLATE = """\
You are PaperTrail Voice Assistant, helping a government clerk review a scanned form.

Form: {template_name}
Clerk's preferred language: {lang_name} ({language})

Extracted fields from the form (OCR results with confidence scores):
{fields_json}

RULES:
1. Answer ONLY about the current form and its fields. Do NOT answer off-topic questions.
2. Respond in {lang_name} ({language}). Use simple, clear language a clerk will understand.
3. Keep your answer to 1-2 short sentences maximum.
4. If the clerk's question is about a specific field, set "field_referenced" to that field's field_id.
   If no specific field is relevant set "field_referenced" to null.
5. Respond with ONLY valid JSON in this exact format (no markdown, no extra text):
   {{"answer": "your answer here", "field_referenced": "field_id or null"}}
"""


async def ask_voice_agent(
    question: str,
    language: str,
    extracted_fields: list[dict],
    template_name: str = "government form",
) -> dict:
    """
    Call Claude Sonnet with the clerk's question and the form's extracted fields.

    Args:
        question:         Clerk's spoken question (already transcribed by Web Speech API).
        language:         BCP-47 tag e.g. "hi-IN".
        extracted_fields: List of dicts with field_id, label, value, confidence, uncertain.
        template_name:    Human-readable form name for context in the system prompt.

    Returns:
        {"answer": str, "field_referenced": str | None}

    Raises:
        RuntimeError: If Claude is unavailable or returns unparseable JSON.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not set in environment.")

    # Build a readable field list for the prompt
    field_lines = []
    for f in extracted_fields:
        confidence_pct = int(f.get("confidence", 0) * 100)
        uncertain_flag = " [UNCERTAIN]" if f.get("uncertain") else ""
        value_display = f.get("value") or "(empty)"
        field_lines.append(
            f"  - field_id={f['field_id']!r}  label={f['label']!r}  "
            f"value={value_display!r}  confidence={confidence_pct}%{uncertain_flag}"
        )
    fields_str = "\n".join(field_lines) if field_lines else "  (no fields provided)"

    system_prompt = _SYSTEM_TEMPLATE.format(
        template_name=template_name,
        lang_name=_LANG_NAMES.get(language, language),
        language=language,
        fields_json=fields_str,
    )

    client = anthropic.Anthropic(api_key=api_key)

    try:
        message = client.messages.create(
            model=_MODEL,
            max_tokens=256,
            system=system_prompt,
            messages=[{"role": "user", "content": question}],
        )
    except anthropic.APIStatusError as exc:
        raise RuntimeError(f"Claude API error {exc.status_code}: {exc.message}") from exc
    except anthropic.APIConnectionError as exc:
        raise RuntimeError("Claude API is unreachable.") from exc

    raw = message.content[0].text.strip()

    # Parse the JSON response; fall back gracefully if malformed
    try:
        parsed = json.loads(raw)
        answer = str(parsed.get("answer", ""))
        field_referenced = parsed.get("field_referenced") or None
    except (json.JSONDecodeError, AttributeError):
        # Try to extract answer text even if JSON is broken
        answer = raw
        field_referenced = None

    # Validate field_referenced is actually one of the sent field_ids
    valid_ids = {f["field_id"] for f in extracted_fields}
    if field_referenced and field_referenced not in valid_ids:
        field_referenced = None

    return {"answer": answer, "field_referenced": field_referenced}
