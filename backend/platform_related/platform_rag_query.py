"""
platform_rag_query.py
=====================
Run once to build:   python platform_rag_query.py
Then query via:      run_platform_rag(question) -> str
"""

import os
import pickle
import logging
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────

DOCS_PATH  = os.getenv("PLATFORM_DOCS_DIR",   "documents")
VECTOR_DIR = os.getenv("PLATFORM_VECTOR_DIR", os.path.join("vectors", "platform_vector"))
MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
CHUNK_SIZE = 800
OVERLAP    = 100
TOP_K      = 5
MIN_SCORE  = 0.25
GROQ_MODEL = "llama-3.3-70b-versatile"

_groq = Groq(api_key=os.getenv("GROQ_API_KEY"))

SYSTEM_PROMPT = """You are a helpful assistant for the G1 Healthcare platform.
- Answer ONLY from the provided excerpts.
- If not found, say: "I don't have enough information."
- Reply in the SAME language the user writes in (English, Hindi, Hinglish, etc.)
- Keep answers short and clear."""

# ── Cached globals (None until loaded) ───────────────────────────────────────

_index  = None
_chunks = None
_model  = None


# ── Build (run once manually) ─────────────────────────────────────────────────

def build_index() -> None:
    """Read documents/, chunk, embed, save FAISS to vectors/platform_vector/."""

    all_chunks = []
    for fname in os.listdir(DOCS_PATH):
        if not fname.endswith(".txt"):
            continue
        with open(os.path.join(DOCS_PATH, fname), "r", encoding="utf-8") as f:
            text = f.read().strip()
        if not text:
            continue
        start = 0
        while start < len(text):
            chunk = text[start: start + CHUNK_SIZE].strip()
            if chunk:
                all_chunks.append(chunk)
            start += CHUNK_SIZE - OVERLAP
        print(f"  chunked: {fname}")

    if not all_chunks:
        raise ValueError("No text found in documents/ folder.")

    print(f"Total chunks: {len(all_chunks)}")
    print("Encoding embeddings...")

    model  = SentenceTransformer(MODEL_NAME)
    matrix = np.array(model.encode(all_chunks, show_progress_bar=True)).astype("float32")
    faiss.normalize_L2(matrix)

    os.makedirs(VECTOR_DIR, exist_ok=True)
    index = faiss.IndexFlatIP(matrix.shape[1])
    index.add(matrix)

    faiss.write_index(index, os.path.join(VECTOR_DIR, "index.faiss"))
    with open(os.path.join(VECTOR_DIR, "chunks.pkl"), "wb") as f:
        pickle.dump(all_chunks, f)
    with open(os.path.join(VECTOR_DIR, "model.pkl"), "wb") as f:
        pickle.dump(model, f)

    print(f"Done. {index.ntotal} vectors saved to {VECTOR_DIR}/")


# ── Load index ────────────────────────────────────────────────────────────────

def _load_index() -> None:
    global _index, _chunks, _model

    if _index is not None:
        return  # already loaded

    index_path = os.path.join(VECTOR_DIR, "index.faiss")
    if not os.path.exists(index_path):
        raise FileNotFoundError(
            "Index not found. Run `python platform_rag_query.py` first to build it."
        )

    print("🔄 Loading model and index...")
    _index = faiss.read_index(index_path)
    with open(os.path.join(VECTOR_DIR, "chunks.pkl"), "rb") as f:
        _chunks = pickle.load(f)
    with open(os.path.join(VECTOR_DIR, "model.pkl"), "rb") as f:
        _model = pickle.load(f)
    print("✅ Ready.")


# ── Query ─────────────────────────────────────────────────────────────────────

def run_platform_rag(user_question: str) -> str:
    """Search FAISS, send chunks to LLM, return answer."""

    _load_index()  # loads once, skips after first call

    q_vec = np.array(_model.encode([user_question])).astype("float32")
    faiss.normalize_L2(q_vec)

    scores, indices = _index.search(q_vec, min(TOP_K, _index.ntotal))

    context_chunks = [
        _chunks[i] for score, i in zip(scores[0], indices[0])
        if i >= 0 and float(score) >= MIN_SCORE
    ]

    if not context_chunks:
        return "I don't have enough information to answer that."

    context     = "\n\n".join(f"[{i+1}] {c}" for i, c in enumerate(context_chunks))
    user_prompt = f"Excerpts:\n{context}\n\nQuestion: {user_question}"

    resp = _groq.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_prompt},
        ],
        temperature=0.2,
        max_tokens=300,
    )
    return resp.choices[0].message.content.strip()


# ── Run once to build ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    build_index()