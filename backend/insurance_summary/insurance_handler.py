"""
insurance_handler.py
====================
Insurance Intent Handler — entry point called by ``intent_detector.py``.

Public API
----------
    handle_insurance_query(profile_id: str, user_question: str) -> dict

The intent detector calls this function when it identifies an
insurance-related query.  The function orchestrates the full pipeline:

  1. Validate inputs.
  2. Fetch insurance document metadata from Supabase.
  3. Download raw file bytes for any document that lacks pre-extracted text
     (needed by extractor_OCR for on-demand OCR during the first index build).
  4. Delegate to ``insurance_rag_query.run_insurance_rag()`` for vector
     search and LLM answer generation.
  5. Return a structured result dict to the intent detector / chatbot layer.

Return contract
---------------
Success:
    {
      "answer":           str,        # answer to surface to the user
      "sources":          list[str],  # doc UUIDs whose chunks were used
      "chunks_retrieved": int,
      "chunks_total":     int,
      "index_rebuilt":    bool,
    }

Handled error (non-fatal — safe to display a friendly message):
    {
      "answer": "<user-friendly message>",
      "error":  "<exception string for logging>",
    }
"""

from __future__ import annotations

import logging
from typing import Optional
import sys
from pathlib import Path
logger = logging.getLogger(__name__)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# ─────────────────────────────────────────────────────────────────────────────
# Main entry point
# ─────────────────────────────────────────────────────────────────────────────

def handle_insurance_query(profile_id: str, user_question: str) -> str:
    log_prefix = f"[insurance_handler | profile={profile_id}]"
    logger.info("%s Received query: %.120s", log_prefix, user_question)

    if not profile_id or not str(profile_id).strip():
        logger.error("%s profile_id is empty or None", log_prefix)
        return "An internal error occurred: the profile identifier is missing. Please refresh and try again."

    if not user_question or not user_question.strip():
        logger.warning("%s Received empty user_question", log_prefix)
        return "Please type a question about your insurance documents."

    profile_id = str(profile_id).strip()
    user_question = user_question.strip()

    try:
        from supabase_helper import list_user_files, get_file_bytes,get_profile_info
        from insurance_rag_query import run_insurance_rag,compute_docs_signature,is_index_valid
    except ImportError as exc:
        logger.critical("%s Critical import failure: %s", log_prefix, exc, exc_info=True)
        return "An internal configuration error occurred. Please contact support if this persists."
    user_name = "the user"
    try:
        profile_info = get_profile_info(profile_id)
        if profile_info:
            user_name = profile_info.get("display_name") or profile_info.get("name") or "the user"
            logger.info("%s Fetched user name: %s", log_prefix, user_name)
    except Exception as exc:
        logger.warning("%s Failed to fetch profile info: %s", log_prefix, exc)
    # Fetch files
    try:
        storage_files = list_user_files(profile_id, folder_type="insurance") or []
    except Exception as exc:
        logger.error("%s Failed to list storage files: %s", log_prefix, exc, exc_info=True)
        return "I was unable to retrieve your insurance files at this time. Please try again in a moment."

    if not storage_files:
        return (
            "No insurance files were found for your profile. "
            "Please upload your insurance policy, health card, or related documents "
            "to the Insurance folder of your Vault, then try again."
        )

    docs = []

    # Step 1: Build the metadata list (No downloading yet)
    for f in storage_files:
        file_name = (f.get("name") or "").strip()
        if not file_name:
            continue

        file_path = f"{profile_id}/insurance/{file_name}".replace("//", "/")

        docs.append({
            "id": file_path,
            "file_path": file_path,
            "file_name": file_name,
            "extracted_text": "",
            "source_file_hash": (
                (f.get("metadata") or {}).get("etag")
                if isinstance(f.get("metadata"), dict)
                else ""
            ),
        })

    if not docs:
        return "I found insurance files, but none could be prepared for processing."

    file_contents = {}

    # Step 2: Check if the index is valid BEFORE downloading files
    current_sig = compute_docs_signature(docs)
    
    if is_index_valid(profile_id, current_sig):
        logger.info("%s Valid index found. Skipping file downloads and OCR.", log_prefix)
        # file_contents remains empty. run_insurance_rag won't need it because 
        # it will load the existing index from disk.
    else:
        logger.info("%s Index is missing/stale. Downloading files for OCR extraction...", log_prefix)
        # Step 3: Only download bytes if we actually need to rebuild the index
        for doc in docs:
            try:
                file_contents[doc["file_path"]] = get_file_bytes(doc["file_path"])
            except Exception as exc:
                logger.error("%s Failed to download '%s': %s", log_prefix, doc["file_name"], exc)

    # Step 4: Run the RAG pipeline
    try:
        answer: str = run_insurance_rag(
            profile_id=profile_id,
            user_question=user_question,
            docs=docs,
            file_contents=file_contents,
            user_name=user_name,
        )
        return answer

    except Exception as exc:
        logger.exception("%s Unexpected RAG pipeline error: %s", log_prefix, exc)
        return (
            "An unexpected error occurred while answering your insurance question. "
            "Please try again in a moment."
        )
    
if __name__ == "__main__":
    print(handle_insurance_query(profile_id='e18af8f2-9c0e-4a92-b6b5-84e8ad019186',user_question='what coverage does my health incurance documents give to me and also what is the actual expiry of my insurance.'))