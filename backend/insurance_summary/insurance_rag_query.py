"""
insurance_rag_query.py
======================
Insurance RAG Pipeline — Vector Index Management & Query Execution.

Responsibilities
----------------
  • Build, persist, and reload per-profile FAISS vector indexes on local disk.
  • Detect stale indexes via SHA-256 document-set signatures and rebuild automatically.
  • Execute cosine-similarity search over indexed insurance chunks.
  • Assemble context window and query OpenAI via shared `call_llm`.
  • Expose `invalidate_index()` for external callers (upload / delete webhooks).

Storage layout  (relative to project root)
-------------------------------------------
  vectors/
  └── insurance_vector/
      └── {profile_id}/
          ├── index.faiss      ← FAISS IndexFlatIP (384-d, L2-normalised cosine)
          ├── chunks.pkl       ← list[dict]  {"text": str, "doc_id": str}
          ├── vectorizer.pkl   ← SentenceTransformerVectorizer (lazy-loaded model)
          └── signature.txt    ← SHA-256 of sorted (file_path:source_file_hash) pairs
"""

from __future__ import annotations

import gc
import hashlib
import logging
import os
import shutil
from pathlib import Path
from typing import Optional

import faiss
import numpy as np
import sys
from pathlib import Path
logger = logging.getLogger(__name__)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
from rag_pipeline.clean_chunk import chunk_text_with_metadata, clean_text
from rag_pipeline.embed_store import (
    EMBEDDING_DIM,
    build_faiss_index as _faiss_build,
    load_index_and_chunks,
)
# Import the shared LLM caller from your primary RAG pipeline
from rag_pipeline.rag_query import call_llm

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Configuration  (override via env vars where shown)
# ─────────────────────────────────────────────────────────────────────────────

VECTOR_BASE_DIR: str = os.getenv(
    "INSURANCE_VECTOR_DIR",
    os.path.join("vectors", "insurance_vector"),
)

# Retrieval
TOP_K: int = int(os.getenv("INSURANCE_RAG_TOP_K", "6"))
MIN_SIMILARITY_SCORE: float = float(os.getenv("INSURANCE_RAG_MIN_SCORE", "0.28"))

# Chunking  (mirrors defaults in clean_chunk.py; tuned for insurance docs)
CHUNK_MAX_WORDS: int = 300
CHUNK_OVERLAP_WORDS: int = 50

# OpenAI
OPENAI_MAX_TOKENS: int = int(os.getenv("INSURANCE_RAG_MAX_TOKENS", "1500"))


# ─────────────────────────────────────────────────────────────────────────────
# Internal path helpers
# ─────────────────────────────────────────────────────────────────────────────

def _profile_dir(profile_id: str) -> str:
    """Absolute-or-relative path to the per-profile index directory."""
    return os.path.join(VECTOR_BASE_DIR, str(profile_id))

def _sig_path(profile_id: str) -> str:
    return os.path.join(_profile_dir(profile_id), "signature.txt")


# ─────────────────────────────────────────────────────────────────────────────
# Document-set signature  (invalidation fingerprint)
# ─────────────────────────────────────────────────────────────────────────────

def compute_docs_signature(docs: list[dict]) -> str:
    """Return a deterministic SHA-256 hex digest for the document set."""
    fingerprints = sorted(
        "{path}:{hash}".format(
            path=d.get("file_path", ""),
            hash=d.get("source_file_hash") or d.get("id", ""),
        )
        for d in docs
    )
    raw = "|".join(fingerprints).encode("utf-8")
    sig = hashlib.sha256(raw).hexdigest()
    logger.debug("compute_docs_signature: %d doc(s) → sig=%s…", len(docs), sig[:16])
    return sig

def _read_stored_signature(profile_id: str) -> Optional[str]:
    path = _sig_path(profile_id)
    try:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as fh:
                return fh.read().strip()
    except OSError as exc:
        logger.warning("_read_stored_signature: could not read %s: %s", path, exc)
    return None

def _write_signature(profile_id: str, sig: str) -> None:
    """Persist the document-set signature.  Called ONLY after a successful build."""
    profile_path = _profile_dir(profile_id)
    Path(profile_path).mkdir(parents=True, exist_ok=True)
    sig_file = _sig_path(profile_id)
    try:
        with open(sig_file, "w", encoding="utf-8") as fh:
            fh.write(sig)
        logger.debug("_write_signature: wrote sig=%s… to %s", sig[:16], sig_file)
    except OSError as exc:
        logger.error("_write_signature: failed to write %s: %s", sig_file, exc)
        raise


# ─────────────────────────────────────────────────────────────────────────────
# Index validity check
# ─────────────────────────────────────────────────────────────────────────────

def is_index_valid(profile_id: str, current_sig: str) -> bool:
    stored = _read_stored_signature(profile_id)
    if stored != current_sig:
        logger.info(
            "Index stale for profile %s: stored=%s… current=%s…",
            profile_id,
            (stored or "NONE")[:16],
            current_sig[:16],
        )
        return False

    p = _profile_dir(profile_id)
    for fname in ("index.faiss", "chunks.pkl", "vectorizer.pkl"):
        full = os.path.join(p, fname)
        if not os.path.exists(full):
            logger.info("Index artefact missing for profile %s: %s", profile_id, fname)
            return False

    logger.info("Index valid for profile %s (sig=%s…)", profile_id, current_sig[:16])
    return True


# ─────────────────────────────────────────────────────────────────────────────
# Public invalidation hook
# ─────────────────────────────────────────────────────────────────────────────

def invalidate_index(profile_id: str) -> None:
    """Delete the persisted FAISS index for a profile."""
    p = _profile_dir(profile_id)
    if os.path.exists(p):
        shutil.rmtree(p)
        logger.info("invalidate_index: index directory removed for profile %s  (%s)", profile_id, p)
    else:
        logger.debug("invalidate_index: no directory to remove for profile %s", profile_id)


# ─────────────────────────────────────────────────────────────────────────────
# Text extraction helper
# ─────────────────────────────────────────────────────────────────────────────

def _extract_text_for_doc(doc: dict, file_contents: dict[str, bytes]) -> str:
    """Return usable plain text for a single DB record."""
    from rag_pipeline.extractor_OCR import extract_text_from_bytes
    stored_text = (doc.get("extracted_text") or "").strip()
    if stored_text:
        return stored_text

    file_path: str = doc.get("file_path", "")
    raw_bytes: Optional[bytes] = file_contents.get(file_path)

    if not raw_bytes:
        return ""

    file_name: str = doc.get("file_name", "")
    ext = os.path.splitext(file_name)[-1] or ".pdf"

    try:
        text = extract_text_from_bytes(
            raw_bytes,
            ext,
            use_preprocessing=True,
            verbose=False,
        )
        return (text or "").strip()
    except Exception as exc:
        logger.error("_extract_text_for_doc: OCR failed for '%s': %s", file_name, exc)
        return ""


# ─────────────────────────────────────────────────────────────────────────────
# Index build
# ─────────────────────────────────────────────────────────────────────────────

def build_and_save_index(
    profile_id: str,
    docs: list[dict],
    file_contents: dict[str, bytes],
    signature: str,
) -> tuple:
    print(
        f"\n🏗️  Building insurance vector index for profile {profile_id} "
        f"({len(docs)} doc(s))…",
        flush=True,
    )

    all_chunks: list[dict] = []
    skipped = 0

    for doc in docs:
        file_name = doc.get("file_name", "<unknown>")
        raw_text = _extract_text_for_doc(doc, file_contents)
        
        if not raw_text:
            skipped += 1
            continue

        cleaned = clean_text(raw_text)
        if not cleaned:
            skipped += 1
            continue

        doc_chunks = chunk_text_with_metadata(
            cleaned,
            doc_id=str(doc["id"]),
            max_words=CHUNK_MAX_WORDS,
            overlap_words=CHUNK_OVERLAP_WORDS,
        )
        print(f"   📄 '{file_name}' → {len(doc_chunks)} chunk(s)", flush=True)
        all_chunks.extend(doc_chunks)

        gc.collect()

    if not all_chunks:
        raise ValueError(
            f"No text chunks could be produced from {len(docs)} insurance "
            f"document(s) ({skipped} skipped). Ensure uploaded documents contain "
            "extractable or OCR-readable text."
        )

    profile_path = _profile_dir(profile_id)
    Path(profile_path).mkdir(parents=True, exist_ok=True)

    print(f"\n⚙️  Embedding {len(all_chunks)} chunk(s) and building FAISS index…", flush=True)
    index, chunks, vectorizer = _faiss_build(all_chunks, profile_path)

    _write_signature(profile_id, signature)

    print(f"✅ Insurance index built: {index.ntotal} vectors | saved to '{profile_path}'", flush=True)
    return index, chunks, vectorizer


# ─────────────────────────────────────────────────────────────────────────────
# Similarity search
# ─────────────────────────────────────────────────────────────────────────────

def search_index(
    index: faiss.Index,
    chunks: list[dict],
    vectorizer,
    query: str,
    top_k: int = TOP_K,
    min_score: float = MIN_SIMILARITY_SCORE,
) -> list[dict]:
    if not query or not query.strip():
        return []

    query_matrix: np.ndarray = vectorizer.transform([query.strip()]).toarray()
    faiss.normalize_L2(query_matrix)

    actual_k = min(top_k, index.ntotal)
    scores, indices = index.search(query_matrix, actual_k)

    results: list[dict] = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < 0:
            continue
        sim = float(score)
        if sim < min_score:
            continue
        hit = dict(chunks[idx])
        hit["score"] = sim
        results.append(hit)

    return results


# ─────────────────────────────────────────────────────────────────────────────
# OpenAI prompt assembly & query
# ─────────────────────────────────────────────────────────────────────────────

def _get_system_prompt(user_name: str) -> str:
    return (
        f"You are a knowledgeable, precise insurance assistant helping {user_name} understand "
        "the details of their personal health insurance documents.\n\n"
        "Guidelines:\n"
        "- Answer ONLY from the provided document excerpts.\n"
        "- Be factual and specific: cite coverage limits, exclusions, waiting periods, "
        "  claim procedures, or premium details when present in the excerpts.\n"
        "- If the question cannot be answered from the excerpts, say so clearly and "
        "  indicate what type of document or section might contain the answer.\n"
        "- Do NOT invent, extrapolate, or assume any policy details not present in the "
        "  excerpts.\n"
        "- Use clear, plain language; avoid unnecessary jargon.\n"
        "- Respond in the same language the user used."
    )

def _build_user_prompt(user_question: str, context_chunks: list[dict]) -> str:
    excerpt_blocks = "\n\n".join(
        (
            f"[Excerpt {i}  |  doc_id={c.get('doc_id', 'N/A')}  |  "
            f"relevance={c.get('score', 0.0):.3f}]\n{c['text']}"
        )
        for i, c in enumerate(context_chunks, 1)
    )
    return (
        f"Insurance Document Excerpts:\n"
        f"{excerpt_blocks}\n\n"
        f"User Question: {user_question}\n\n"
        "Please answer strictly based on the excerpts above."
    )

def query_openai(
    user_question: str,
    context_chunks: list[dict],
    user_name: str,
) -> str:
    """
    Query OpenAI with the assembled insurance context using the unified call_llm tool.
    """
    user_prompt = _build_user_prompt(user_question, context_chunks)
    
    logger.info("query_openai: dispatching to call_llm with %d context chunks", len(context_chunks))
    system_prompt = _get_system_prompt(user_name)
    return call_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=OPENAI_MAX_TOKENS,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Public pipeline entry point
# ─────────────────────────────────────────────────────────────────────────────

def run_insurance_rag(
    profile_id: str,
    user_question: str,
    docs: list[dict],
    file_contents: dict[str, bytes],
    user_name: str = "the user",
) -> str:
    """
    Execute the full insurance RAG pipeline for a single user query.
    Returns a formatted string (either the answer or an error message).
    """
    print(f"\n{'='*80}", flush=True)
    print(f"🛡️ IMPROVED RAG QUERY (Insurance Documents)", flush=True)
    print(f"{'='*80}", flush=True)
    print(f"Question: {user_question[:100]}...", flush=True)

    if not docs:
        error = (
            "❌ No insurance files were found in Supabase Storage for this profile. "
            "Please upload your insurance policy, health card, or related documents "
            "to the Insurance folder of your vault."
        )
        print(error, flush=True)
        return error

    try:
        # 1. Signature & Cache Check
        current_sig = compute_docs_signature(docs)

        if is_index_valid(profile_id, current_sig):
            print(f"\n📂 Loading existing insurance index for profile {profile_id}…", flush=True)
            index, chunks, vectorizer = load_index_and_chunks(_profile_dir(profile_id))
        else:
            index, chunks, vectorizer = build_and_save_index(
                profile_id, docs, file_contents, current_sig
            )

        # 2. Similarity Search
        context_chunks = search_index(index, chunks, vectorizer, user_question)

        if not context_chunks:
            error = (
                "❌ I couldn't find relevant information in your insurance documents "
                "to answer that question. The answer may be in a document section "
                "that has not been uploaded yet, or the question may be outside the "
                "scope of your current policy documents."
            )
            print(error, flush=True)
            return error

        # 3. LLM Generation
        print(f"\n📝 Generating answer from {len(context_chunks)} retrieved chunk(s)...", flush=True)
        answer = query_openai(user_question, context_chunks,user_name)
        
        print(f"✅ Answer generated successfully", flush=True)
        print(f"   Length: {len(answer)} chars", flush=True)
        print(f"{'='*80}\n", flush=True)
        return answer

    except Exception as exc:
        error = f"❌ Insurance RAG pipeline failed: {exc}"
        print(error, flush=True)
        return error