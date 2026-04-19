"""POST /api/parse-bill — extract usage from a utility bill PDF.

Phase 1: Claude vision (primary) with pdfplumber text fallback.

Flow:
1. Read the uploaded bytes.
2. If it looks like a PDF, try Claude vision first (richer signal —
   catches tables and logos). Anthropic's beta PDF support renders each
   page as an image we can reason about.
3. On any Claude error, fall back to pdfplumber's text extraction plus
   regex heuristics. If *both* fail we return a plausible default so
   the rest of the pipeline still runs (mobile UX is better with a
   wrong-but-editable default than a hard error).
"""

from __future__ import annotations

import base64
import json
import re
from typing import Final

import anthropic
from fastapi import APIRouter, UploadFile

from config import settings
from schemas import ParseBillResult, UtilityCode

router = APIRouter()

# Keep it cheap but smart — Claude Sonnet 4.5 handles bills fine and is
# 5x cheaper than Opus per image page.
_CLAUDE_MODEL = "claude-sonnet-4-5"

_BILL_SYSTEM_PROMPT = (
    "You are a utility bill parser. Given a CA residential electric bill "
    "(PG&E, SCE, SDG&E, or LADWP), extract exactly three fields: "
    "monthly kWh consumed, utility company code, and the time-of-use "
    "tariff plan if it is visible. Return JSON matching the schema the "
    "user requests. If a field is not visible, use null."
)

_EXTRACTION_SCHEMA = {
    "monthly_kwh": "number — total kWh consumed this billing cycle",
    "utility": "one of: PGE | SCE | SDGE | LADWP | OTHER",
    "tariff_plan": "string | null — e.g. 'EV2-A', 'E-TOU-C', 'TOU-D-PRIME', 'EV-TOU-5'",
}
_UTILITY_MARKERS: Final[tuple[tuple[UtilityCode, tuple[str, ...]], ...]] = (
    ("PGE", ("PG&E", "PGE", "PACIFIC GAS")),
    ("SCE", ("SCE", "SOUTHERN CALIFORNIA EDISON")),
    ("SDGE", ("SDG&E", "SDGE", "SAN DIEGO GAS")),
    ("LADWP", ("LADWP", "LOS ANGELES DEPARTMENT OF WATER")),
)
_KWH_PATTERNS: Final[tuple[re.Pattern[str], ...]] = (
    re.compile(
        r"(?:total\s+usage|usage\s+this\s+period|total\s+kwh)[:\s]*([\d,]+(?:\.\d+)?)",
        re.IGNORECASE,
    ),
    re.compile(r"([\d,]+(?:\.\d+)?)\s*kwh", re.IGNORECASE),
)
_PLAN_PATTERN = re.compile(
    r"\b(EV2-A|E-TOU-C|TOU-D-PRIME|EV-TOU-5|E-1|R-1A)\b",
    re.IGNORECASE,
)
_CODE_FENCE_PREFIX_PATTERN = re.compile(r"^```(?:json)?\s*", re.IGNORECASE)
_CODE_FENCE_SUFFIX_PATTERN = re.compile(r"\s*```$", re.IGNORECASE)

_claude_client: anthropic.AsyncAnthropic | None = None
_claude_client_api_key: str | None = None


def _default_result() -> ParseBillResult:
    return ParseBillResult(monthly_kwh=650.0, utility="PGE", tariff_guess="EV2-A")


def _normalize_utility(val: str | None) -> UtilityCode:
    if not val:
        return "PGE"
    v = val.upper().replace(" ", "").replace("&", "")
    if "PGE" in v or "PACIFICGAS" in v:
        return "PGE"
    if "SDGE" in v or "SANDIEGO" in v:
        return "SDGE"
    if "SCE" in v or "SOUTHERNCAL" in v:
        return "SCE"
    if "LADWP" in v or "LOSANGELES" in v:
        return "LADWP"
    return "OTHER"


def _get_claude_client() -> anthropic.AsyncAnthropic | None:
    global _claude_client, _claude_client_api_key
    api_key = settings.anthropic_api_key
    if not api_key:
        return None
    if _claude_client is None or _claude_client_api_key != api_key:
        _claude_client = anthropic.AsyncAnthropic(api_key=api_key)
        _claude_client_api_key = api_key
    return _claude_client


def _strip_code_fences(text: str) -> str:
    stripped = text.strip()
    if not stripped.startswith("```"):
        return stripped
    stripped = _CODE_FENCE_PREFIX_PATTERN.sub("", stripped)
    return _CODE_FENCE_SUFFIX_PATTERN.sub("", stripped)


def _extract_kwh(text: str) -> float | None:
    for pattern in _KWH_PATTERNS:
        match = pattern.search(text)
        if match is None:
            continue
        try:
            kwh_val = float(match.group(1).replace(",", ""))
        except ValueError:
            continue
        if 10 <= kwh_val <= 20_000:
            return kwh_val
    return None


async def _parse_with_claude(pdf_bytes: bytes) -> ParseBillResult | None:
    """Send the PDF to Claude via the beta document content block.

    Returns ``None`` on any error so the caller can fall back.
    """
    client = _get_claude_client()
    if client is None:
        return None
    try:
        b64 = base64.standard_b64encode(pdf_bytes).decode("utf-8")
        user_prompt = (
            "Extract the following fields from this utility bill and return "
            "only a valid JSON object — no prose, no markdown, no code "
            "fences. Schema:\n"
            f"{json.dumps(_EXTRACTION_SCHEMA, indent=2)}"
        )
        msg = await client.messages.create(
            model=_CLAUDE_MODEL,
            max_tokens=512,
            system=_BILL_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "document",
                            "source": {
                                "type": "base64",
                                "media_type": "application/pdf",
                                "data": b64,
                            },
                        },
                        {"type": "text", "text": user_prompt},
                    ],
                }
            ],
        )
        text = "".join(
            block.text for block in msg.content if getattr(block, "type", "") == "text"
        ).strip()
        # Tolerate a code-fence wrapper if Claude adds one despite instructions.
        data = json.loads(_strip_code_fences(text))

        kwh = data.get("monthly_kwh")
        if not isinstance(kwh, (int, float)) or kwh <= 0:
            return None
        utility = _normalize_utility(data.get("utility"))
        plan = data.get("tariff_plan")
        return ParseBillResult(
            monthly_kwh=float(kwh),
            utility=utility,
            tariff_guess=str(plan) if plan else None,
        )
    except Exception:
        return None


def _parse_with_pdfplumber(pdf_bytes: bytes) -> ParseBillResult | None:
    """Regex-over-text fallback when Claude is unavailable or errors.

    Returns ``None`` if the heuristic can't find a kWh number.
    """
    try:
        import pdfplumber
    except ImportError:
        return None
    try:
        import io

        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            text = "\n".join((page.extract_text() or "") for page in pdf.pages)
    except Exception:
        return None

    if not text:
        return None

    # kWh: look for "NNN kWh" or "Total Usage: NNN"
    kwh_val = _extract_kwh(text)
    if kwh_val is None:
        return None

    # Utility detection
    text_upper = text.upper()
    utility: UtilityCode = "OTHER"
    for candidate, codes in _UTILITY_MARKERS:
        if any(s in text_upper for s in codes):
            utility = candidate
            break

    plan_match = _PLAN_PATTERN.search(text)
    plan = plan_match.group(1).upper() if plan_match else None
    return ParseBillResult(
        monthly_kwh=float(kwh_val),
        utility=utility,
        tariff_guess=plan,
    )


@router.post("/parse-bill", response_model=ParseBillResult)
async def parse_bill(file: UploadFile) -> ParseBillResult:
    raw = await file.read()
    if not raw:
        return _default_result()

    # Claude vision first (handles images + PDF + scans cleanly).
    result = await _parse_with_claude(raw)
    if result is not None:
        return result

    # Fall back to pdfplumber heuristics if Claude errors.
    fallback = _parse_with_pdfplumber(raw)
    if fallback is not None:
        return fallback

    return _default_result()
