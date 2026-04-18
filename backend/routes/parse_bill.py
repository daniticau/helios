"""POST /api/parse-bill — extract usage from a utility bill PDF.

Phase 0: accepts a multipart upload and returns a plausible stub parse.
Phase 1 switches to Claude vision (primary) with pdfplumber fallback.
"""

from __future__ import annotations

from fastapi import APIRouter, UploadFile

from schemas import ParseBillResult

router = APIRouter()


@router.post("/parse-bill", response_model=ParseBillResult)
async def parse_bill(file: UploadFile) -> ParseBillResult:
    # Phase 0 stub — deterministic plausible values for demo wire-up.
    await file.read()  # drain the stream
    return ParseBillResult(
        monthly_kwh=650.0,
        utility="PGE",
        tariff_guess="EV2-A",
    )
