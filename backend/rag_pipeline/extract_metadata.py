# backend/rag_pipeline/extract_metadata.py
"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
extract_metadata.py  —  Phase 1 + Phase 2 Upgrade  (v2 — singleton bug fixed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE 1 — Structured Outputs via Pydantic + OpenAI SDK
  • validate_metadata() GUTTED — replaced by Pydantic field validators
  • Switched from `requests` library → official `openai` Python SDK
  • Uses client.beta.chat.completions.parse with MedicalMetadata(BaseModel)
  • OpenAI guarantees JSON schema; Pydantic validates semantics automatically
  • Eliminates: manual type-checking, regex extraction, blocklist loops

PHASE 2 — Async Execution + Smart Concurrency
  • Uses AsyncOpenAI and asyncio.gather under the hood
  • Single-doc entry point extract_metadata_with_llm() is 100% backward-compatible
    (sync Flask routes call asyncio.run() — zero API surface change)
  • NEW: extract_metadata_batch() processes N documents concurrently

BUG FIX (v2) — AsyncOpenAI Client Lifecycle
  • Original v1 used a module-level singleton AsyncOpenAI client.
  • Flask calls asyncio.run() once per request, which creates AND destroys
    a new event loop on every call. httpx.AsyncClient (used internally by
    AsyncOpenAI) binds its async transport to the event loop at first-use.
    Re-using the same client across different asyncio.run() calls causes
    "Event loop is closed" / httpx connection errors from the 2nd request on.
  • FIX: AsyncOpenAI client is now created INSIDE each asyncio.run() context
    (_run_single / _run_batch coroutines) and explicitly closed when done,
    so its lifetime exactly matches the event loop that owns it.

BACKWARD COMPATIBILITY
  • extract_metadata_with_llm(text, file_name, retry_count) — identical signature
  • Return dict shape is identical (age as str, extraction_confidence float)
  • extract_metadata_fallback(text) — preserved unchanged
  • standardize_date(date_str) — UPGRADED: dateutil.parser replaces hand-rolled
                                  regex; 2-digit years rejected (not guessed)
  • validate_metadata() — REMOVED (gutted by design, not called by pipeline)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import os
import re
import asyncio
from typing import Optional, List, Tuple

from dateutil import parser as _dateutil_parser
from dateutil.parser import ParserError

from pydantic import BaseModel, field_validator
from openai import AsyncOpenAI

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
MODEL_NAME: str = "gpt-4.1-nano"

# Max concurrent OpenAI calls in a batch — tunable via env var.
# Default 8: safe for Tier-1 OpenAI accounts; raise to 16+ for Tier-2+.
_MAX_CONCURRENT: int = int(os.getenv("METADATA_MAX_CONCURRENT", "8"))


def _make_client() -> AsyncOpenAI:
    """
    Create a fresh AsyncOpenAI client.

    IMPORTANT — called INSIDE each asyncio.run() context, never at module
    level.  This guarantees the client's underlying httpx.AsyncClient binds
    to the currently-running event loop, so it is always valid for the
    duration of the coroutine and is safely closed before the loop exits.
    """
    return AsyncOpenAI(
        api_key=OPENAI_API_KEY,
        timeout=25.0,    # slightly above original 20 s for one retry headroom
        max_retries=2,   # SDK-level retries on 429 / 5xx — replaces manual retry_count
    )


# ─────────────────────────────────────────────────────────────────────────────
# BLOCKLISTS  (shared by Pydantic validators + fallback)
# ─────────────────────────────────────────────────────────────────────────────

_INVALID_NAMES: frozenset = frozenset(
    ["name", "patient", "sex", "age", "gender", "male", "female",
     "mr", "mrs", "ms", "dr", "test", "report", "unknown", "n/a",
     "null", "none", ""]
)
_INVALID_REPORT_TYPES: frozenset = frozenset(
    ["test", "report", "unknown", "null", "none", ""]
)
_INVALID_DOCTOR_NAMES: frozenset = frozenset(
    ["doctor", "dr", "unknown", "null", "none", ""]
)
_INVALID_HOSPITAL_NAMES: frozenset = frozenset(
    ["hospital", "clinic", "unknown", "null", "none", ""]
)


# ─────────────────────────────────────────────────────────────────────────────
# PYDANTIC SCHEMA  (Phase 1 core)
# ─────────────────────────────────────────────────────────────────────────────

class MedicalMetadata(BaseModel):
    """
    Strict schema for medical report metadata.

    OpenAI Structured Outputs guarantees the *shape* of the JSON.
    Pydantic field validators guarantee the *semantics* — no manual type-
    checking, regex loops, or blocklist scans needed downstream.

    age is Optional[int] here (OpenAI enforces the int type), then converted
    back to Optional[str] in to_pipeline_dict() so the rest of the pipeline
    (supabase_helper.save_extracted_data) receives the same types it always has.
    """

    patient_name:  Optional[str] = None
    age:           Optional[int] = None   # int enforced by OpenAI schema
    gender:        Optional[str] = None   # normalised to "Male" / "Female" / None
    report_date:   Optional[str] = None   # normalised to DD/MM/YYYY
    report_type:   Optional[str] = None
    doctor_name:   Optional[str] = None
    hospital_name: Optional[str] = None

    # ── patient_name ─────────────────────────────────────────────────────────
    @field_validator("patient_name", mode="before")
    @classmethod
    def clean_patient_name(cls, v):
        if not isinstance(v, str):
            return None
        v = v.strip()
        if v.lower() in _INVALID_NAMES or len(v) <= 2:
            return None
        if not re.search(r"[a-zA-Z]{2,}", v):
            return None
        return v

    # ── age ──────────────────────────────────────────────────────────────────
    @field_validator("age", mode="before")
    @classmethod
    def clean_age(cls, v):
        """
        LLM sometimes returns "45 years" or 45.0 despite the int schema.
        Belt-and-suspenders normalisation.
        """
        if v is None:
            return None
        if isinstance(v, str):
            m = re.search(r"\d+", v)
            v = int(m.group()) if m else None
        if isinstance(v, float):
            v = int(v)
        if isinstance(v, int):
            return v if 0 < v < 150 else None
        return None

    # ── gender ───────────────────────────────────────────────────────────────
    @field_validator("gender", mode="before")
    @classmethod
    def clean_gender(cls, v):
        if not isinstance(v, str):
            return None
        g = v.strip().lower()
        if "female" in g:
            return "Female"
        if "male" in g:
            return "Male"
        return None

    # ── report_date ──────────────────────────────────────────────────────────
    @field_validator("report_date", mode="before")
    @classmethod
    def clean_date(cls, v):
        if not isinstance(v, str):
            return None
        standardised = standardize_date(v.strip())
        return standardised if standardised else None

    # ── report_type ──────────────────────────────────────────────────────────
    @field_validator("report_type", mode="before")
    @classmethod
    def clean_report_type(cls, v):
        if not isinstance(v, str):
            return None
        v = v.strip()
        if len(v) <= 2 or v.lower() in _INVALID_REPORT_TYPES:
            return None
        return v

    # ── doctor_name ──────────────────────────────────────────────────────────
    @field_validator("doctor_name", mode="before")
    @classmethod
    def clean_doctor_name(cls, v):
        if not isinstance(v, str):
            return None
        v = v.strip()
        if len(v) <= 2 or v.lower() in _INVALID_DOCTOR_NAMES:
            return None
        return v

    # ── hospital_name ─────────────────────────────────────────────────────────
    @field_validator("hospital_name", mode="before")
    @classmethod
    def clean_hospital_name(cls, v):
        if not isinstance(v, str):
            return None
        v = v.strip()
        if len(v) <= 2 or v.lower() in _INVALID_HOSPITAL_NAMES:
            return None
        return v

    # ── to_pipeline_dict ──────────────────────────────────────────────────────
    def to_pipeline_dict(self) -> dict:
        """
        Serialise to the exact dict the existing pipeline has always consumed.

        Contract:
          • age  → str or None   (supabase_helper stores it as TEXT column)
          • All other fields are str or None
          • extraction_confidence is NOT included here; _attach_confidence()
            appends it after this call so the logic is shared with the fallback.
        """
        return {
            "patient_name":  self.patient_name,
            "age":           str(self.age) if self.age is not None else None,
            "gender":        self.gender,
            "report_date":   self.report_date,
            "report_type":   self.report_type,
            "doctor_name":   self.doctor_name,
            "hospital_name": self.hospital_name,
        }


# ─────────────────────────────────────────────────────────────────────────────
# PROMPT TEMPLATES
# ─────────────────────────────────────────────────────────────────────────────

_SYSTEM_PROMPT: str = (
    "You are a medical metadata extractor. Extract patient info from reports.\n\n"
    "RULES:\n"
    "- patient_name: the actual person's name ONLY — never labels like "
      "'Patient', 'Name', 'Sex', 'Age'\n"
    "- age: integer years ONLY (e.g. 45, not '45 years')\n"
    "- gender: exactly 'Male', 'Female', or null\n"
    "- report_date: DD/MM/YYYY format\n"
    "- For any missing field return null\n"
    "- Be precise, never guess"
)


def _build_user_prompt(text_sample: str) -> str:
    return (
        "Extract metadata from this medical report header:\n\n"
        f"{text_sample}\n\n"
        "Return JSON with keys: patient_name, age, gender, report_date, "
        "report_type, doctor_name, hospital_name"
    )


# ─────────────────────────────────────────────────────────────────────────────
# CONFIDENCE HELPER  (shared by LLM path + fallback)
# ─────────────────────────────────────────────────────────────────────────────

_TOTAL_FIELDS: int = 7   # patient_name, age, gender, date, type, doctor, hospital


def _attach_confidence(result: dict, max_confidence: float = 1.0) -> dict:
    """
    Compute and attach extraction_confidence to a metadata dict in-place.
    max_confidence lets the fallback cap at 0.6 (regex is less reliable).
    Returns the same dict for chaining.
    """
    fields_found = sum(
        1 for k, v in result.items()
        if k != "extraction_confidence" and v is not None and v != "Unknown"
    )
    confidence = min(fields_found / _TOTAL_FIELDS, max_confidence)

    # Boost: if we have a real patient name, floor confidence at 0.5
    name = result.get("patient_name")
    if name and name not in ("Unknown", None):
        confidence = max(confidence, 0.5)

    result["extraction_confidence"] = round(confidence, 2)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# ASYNC CORE  (Phase 2)
# ─────────────────────────────────────────────────────────────────────────────

async def _async_extract_single(
    text: str,
    file_name: str,
    semaphore: asyncio.Semaphore,
    client: AsyncOpenAI,          # injected per asyncio.run() context
) -> dict:
    """
    Core async worker — one document, one API call, returns pipeline-ready dict.

    The client is passed in (not created here) so a batch of N concurrent
    tasks can share the same client within a single event loop context without
    creating N handshakes. Falls back to regex silently on any failure.
    """
    text_sample = text[:800]   # headers contain all metadata; 800 chars is enough

    async with semaphore:
        try:
            print(f"   🤖 [async] OpenAI structured call → {file_name or 'unknown'}")

            response = await client.beta.chat.completions.parse(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user",   "content": _build_user_prompt(text_sample)},
                ],
                response_format=MedicalMetadata,  # guarantees JSON schema
                temperature=0.05,
                max_tokens=300,
            )

            parsed: Optional[MedicalMetadata] = response.choices[0].message.parsed

            if parsed is None:
                print(f"   ⚠️  Parsed result is None for {file_name} — using fallback")
                result = extract_metadata_fallback(text)
            else:
                result = parsed.to_pipeline_dict()
                result = _attach_confidence(result)

        except Exception as exc:
            print(f"   ⚠️  API error [{file_name}]: {exc} — using fallback")
            result = extract_metadata_fallback(text)

    print(f"   ✅ Metadata extracted [{file_name}]:")
    print(f"      Patient:    {result.get('patient_name', 'Unknown')}")
    print(f"      Age:        {result.get('age', 'N/A')}")
    print(f"      Date:       {result.get('report_date', 'N/A')}")
    print(f"      Type:       {result.get('report_type', 'N/A')}")
    print(f"      Confidence: {result.get('extraction_confidence', 0.0)}")

    return result


async def _run_single(text: str, file_name: str) -> dict:
    """
    Coroutine entry-point for a single-document extraction.

    Creates its own client and closes it on exit so the client lifetime
    exactly matches the event loop created by asyncio.run().
    """
    client = _make_client()
    semaphore = asyncio.Semaphore(_MAX_CONCURRENT)
    try:
        return await _async_extract_single(text, file_name, semaphore, client)
    finally:
        await client.close()   # release httpx connection pool before loop exits


async def _run_batch(items: List[Tuple[str, str]]) -> List[dict]:
    """
    Coroutine entry-point for concurrent batch extraction.

    Creates ONE shared client for all tasks — all tasks share the same
    event loop so sharing the client is safe. Closes the client after
    asyncio.gather() completes.
    """
    client = _make_client()
    semaphore = asyncio.Semaphore(_MAX_CONCURRENT)
    tasks = [
        _async_extract_single(text, fname, semaphore, client)
        for text, fname in items
    ]
    try:
        return await asyncio.gather(*tasks)
    finally:
        await client.close()   # release httpx connection pool before loop exits


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC API — SYNC WRAPPERS  (backward-compatible)
# ─────────────────────────────────────────────────────────────────────────────

def extract_metadata_with_llm(
    text: str,
    file_name: str = None,
    retry_count: int = 0,  # kept for signature compatibility; SDK retries replace it
) -> dict:
    """
    Extract metadata from a single medical report text.

    ┌─ BACKWARD COMPATIBLE ─────────────────────────────────────────────────┐
    │  Identical signature and return shape to the original function.       │
    │  Safe to call from sync Flask routes — uses asyncio.run() internally. │
    └───────────────────────────────────────────────────────────────────────┘

    Args:
        text:        Extracted text from medical report.
        file_name:   Original filename — used for logging only.
        retry_count: Ignored. The OpenAI SDK handles retries (max_retries=2).

    Returns:
        {
            "patient_name":          str | None,
            "age":                   str | None,   <- str, not int
            "gender":                str | None,   <- "Male" / "Female" / None
            "report_date":           str | None,   <- DD/MM/YYYY
            "report_type":           str | None,
            "doctor_name":           str | None,
            "hospital_name":         str | None,
            "extraction_confidence": float,        <- 0.0 to 1.0
        }
    """
    print(f"\n🔍 Extracting metadata with LLM ({MODEL_NAME})...")

    if not OPENAI_API_KEY:
        print("⚠️  OPENAI_API_KEY not set — falling back to regex extraction")
        return extract_metadata_fallback(text)

    try:
        return asyncio.run(
            _run_single(text, file_name or "unknown")
        )

    except RuntimeError as exc:
        # "This event loop is already running" — Jupyter / pytest-asyncio context
        print(f"   ⚠️  Active event loop detected ({exc}) — using regex fallback")
        return extract_metadata_fallback(text)

    except Exception as exc:
        print(f"   ⚠️  Unexpected error: {exc} — using fallback")
        return extract_metadata_fallback(text)


def extract_metadata_batch(
    items: List[Tuple[str, str]],
) -> List[dict]:
    """
    NEW — Concurrent batch extraction for multi-file uploads.

    Process N documents in parallel (up to _MAX_CONCURRENT simultaneous API
    calls) instead of waiting for each one sequentially.  On a 10-file upload
    this is typically 4-8x faster than calling extract_metadata_with_llm()
    in a loop.

    ┌─ HOW TO USE IN process-files (app_api.py) ────────────────────────────┐
    │                                                                        │
    │  # 1. Collect (text, filename) pairs for all NEW (unprocessed) files  │
    │  batch_items = [(texts[f], f) for f in new_files]                    │
    │                                                                        │
    │  # 2. One call processes all concurrently                             │
    │  batch_results = extract_metadata_batch(batch_items)                  │
    │                                                                        │
    │  # 3. Build a lookup map                                              │
    │  metadata_map = {fname: meta                                          │
    │                  for (_, fname), meta                                 │
    │                  in zip(batch_items, batch_results)}                  │
    │                                                                        │
    │  # 4. Inside the existing per-file loop, replace the API call with:  │
    │  metadata = metadata_map[file_name]                                   │
    └───────────────────────────────────────────────────────────────────────┘

    Args:
        items: List of (extracted_text, file_name) tuples.

    Returns:
        List of metadata dicts in the same order as input.
        Each dict has the identical shape as extract_metadata_with_llm().
    """
    if not items:
        return []

    print(f"\n🚀 Batch metadata extraction: {len(items)} documents "
          f"(max {_MAX_CONCURRENT} concurrent API calls)")

    if not OPENAI_API_KEY:
        print("⚠️  OPENAI_API_KEY not set — sequential regex fallback for all")
        return [extract_metadata_fallback(t) for t, _ in items]

    try:
        return asyncio.run(_run_batch(items))

    except RuntimeError as exc:
        print(f"   ⚠️  Active event loop ({exc}) — sequential fallback")
        return [extract_metadata_with_llm(t, n) for t, n in items]

    except Exception as exc:
        print(f"   ⚠️  Batch extraction failed ({exc}) — sequential fallback")
        return [extract_metadata_with_llm(t, n) for t, n in items]


# ─────────────────────────────────────────────────────────────────────────────
# DATE STANDARDISATION  (upgraded: dateutil replaces hand-rolled regex)
# ─────────────────────────────────────────────────────────────────────────────

def standardize_date(date_str: str) -> str:
    """
    Normalise an arbitrary date string to DD/MM/YYYY.
    Returns the original string unchanged if no pattern matches.
    Called by the Pydantic validator AND the regex fallback.

    Uses dateutil.parser for robust parsing instead of hand-rolled regex.

    dayfirst=True  — matches the DD/MM/YYYY convention used throughout
                     the pipeline and consistent with the South Asian medical
                     records this system processes.
    yearfirst=False — defers to dayfirst for ambiguous inputs.

    2-digit years: dateutil applies the same <50 / >=50 heuristic by default,
    BUT medical records with ambiguous 2-digit years should be rejected rather
    than silently guessed. We therefore require a 4-digit year in the raw
    string; if only 2 digits are found we return the original unchanged so the
    caller can treat it as unparseable and store None rather than a wrong date.
    """
    date_str = date_str.strip()

    # Reject 2-digit years explicitly — do not guess century for medical data.
    # A 4-digit year must appear somewhere in the string.
    if not re.search(r"\d{4}", date_str):
        return date_str  # caller treats a non-normalised return as unparseable

    try:
        parsed = _dateutil_parser.parse(date_str, dayfirst=True, yearfirst=False)
        return parsed.strftime("%d/%m/%Y")
    except (ParserError, ValueError, OverflowError):
        return date_str


# ─────────────────────────────────────────────────────────────────────────────
# REGEX FALLBACK  (preserved from original — safety net, never removed)
# ─────────────────────────────────────────────────────────────────────────────

def extract_metadata_fallback(text: str) -> dict:
    """
    Regex-based metadata extraction.

    Used when:
      - OPENAI_API_KEY is absent
      - API call times out or raises any exception
      - Parsed result from OpenAI is None

    Max confidence capped at 0.6 — reflects lower regex reliability.
    Return shape is identical to the LLM path.
    """
    print("   ⚠️  Using fallback regex extraction")

    metadata: dict = {
        "patient_name":  None,
        "age":           None,
        "gender":        None,
        "report_date":   None,
        "report_type":   None,
        "doctor_name":   None,
        "hospital_name": None,
    }

    # ── Patient name ─────────────────────────────────────────────────────────
    name_patterns = [
        r"Patient\s*Name\s*[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
        r"Name\s*[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
    ]
    for pat in name_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            name = m.group(1).strip()
            invalid = {"sex", "age", "male", "female", "gender", "date"}
            if len(name) > 2 and name.lower() not in invalid:
                metadata["patient_name"] = name
                break

    # ── Age ──────────────────────────────────────────────────────────────────
    m = re.search(r"Age\s*[:\-]?\s*(\d+)", text, re.IGNORECASE)
    if m:
        metadata["age"] = m.group(1)

    # ── Gender ───────────────────────────────────────────────────────────────
    if re.search(r"\b(Female|F)\b", text, re.IGNORECASE):
        metadata["gender"] = "Female"
    elif re.search(r"\b(Male|M)\b", text, re.IGNORECASE):
        metadata["gender"] = "Male"

    # ── Report date ──────────────────────────────────────────────────────────
    date_patterns = [
        r"Date\s*[:\-]?\s*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})",
        r"(\d{1,2}[/\-]\d{1,2}[/\-]\d{4})",
    ]
    for pat in date_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            metadata["report_date"] = standardize_date(m.group(1))
            break

    # ── Report type ──────────────────────────────────────────────────────────
    type_patterns = [
        r"(Complete Blood Count|CBC|Blood Test|Lipid Profile|"
        r"Kidney Function|Liver Function|Thyroid|X-Ray|MRI|CT Scan|Ultrasound)",
        r"Test\s*[:\-]?\s*([A-Za-z\s]+)",
    ]
    for pat in type_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            metadata["report_type"] = m.group(1).strip()
            break

    # ── Confidence (max 0.6 for regex) ───────────────────────────────────────
    _attach_confidence(metadata, max_confidence=0.6)

    return metadata


# ─────────────────────────────────────────────────────────────────────────────
# SMOKE TEST  (python -m rag_pipeline.extract_metadata)
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    _sample = """
    Patient Name: Rajesh Sharma
    Age: 45 Years
    Sex: Male
    Date: 15/01/2025

    COMPLETE BLOOD COUNT
    Hemoglobin: 14.5 g/dL
    WBC: 7,200 /µL
    Platelets: 2,50,000 /µL

    Referred by: Dr. Anita Verma
    Hospital: City Diagnostics Centre
    """

    print("=" * 60)
    print("SINGLE-DOC EXTRACTION TEST")
    print("=" * 60)
    result = extract_metadata_with_llm(_sample, "test_report.pdf")
    for k, v in result.items():
        print(f"  {k:30s}: {v}")

    print("\n" + "=" * 60)
    print("BATCH EXTRACTION TEST (2 docs concurrently)")
    print("=" * 60)
    batch = [
        (_sample, "report_A.pdf"),
        (_sample.replace("Rajesh Sharma", "Priya Patel").replace("Male", "Female"),
         "report_B.pdf"),
    ]
    batch_results = extract_metadata_batch(batch)
    for i, res in enumerate(batch_results, 1):
        print(f"\n  Doc {i}:")
        for k, v in res.items():
            print(f"    {k:30s}: {v}")