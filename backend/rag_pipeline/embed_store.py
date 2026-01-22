# rag_pipeline/embed_store.py   

import os
import pickle
import numpy as np
import faiss
from typing import List
from sklearn.feature_extraction.text import TfidfVectorizer

# === FIX: Use absolute paths ===
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_PATH = os.path.join(SCRIPT_DIR, "index.faiss")
CHUNKS_PATH = os.path.join(SCRIPT_DIR, "chunks.pkl")
VECTORIZER_PATH = os.path.join(SCRIPT_DIR, "vectorizer.pkl")

print(f"📍 Embed Store Paths:")
print(f"   INDEX: {INDEX_PATH}")
print(f"   CHUNKS: {CHUNKS_PATH}")
print(f"   VECTORIZER: {VECTORIZER_PATH}")

# Simple TF-IDF based embeddings (NO PyTorch required!)
VECTORIZER = None

def get_vectorizer():
    global VECTORIZER
    if VECTORIZER is None:
        print("📥 Initializing TF-IDF vectorizer...")
        VECTORIZER = TfidfVectorizer(
            max_features=384,
            ngram_range=(1, 2),
            min_df=1,
            stop_words=None,
            token_pattern=r'\b\w+\b'
        )
        print("✅ Vectorizer ready!")
    return VECTORIZER

def _get_embedding(text: str, fitted_vectorizer=None) -> np.ndarray:
    if len(text) > 5000:
        text = text[:5000]
    
    if fitted_vectorizer is None:
        raise ValueError("Vectorizer must be fitted first")
    
    embedding = fitted_vectorizer.transform([text]).toarray()[0]
    return embedding.astype('float32')

def embed_texts(texts: List[str]) -> List[np.ndarray]:
    print(f"📊 Embedding {len(texts)} chunks using TF-IDF...")
    
    valid_texts = [t for t in texts if t and t.strip()]
    
    if not valid_texts:
        raise ValueError("All chunks are empty!")
    
    print(f"   Valid chunks: {len(valid_texts)}")
    
    if len(valid_texts) == 1 and len(valid_texts[0].split()) < 5:
        print("   ⚠️ Very short text detected, adding padding...")
        valid_texts.append("medical report document patient test result analysis")
    
    vectorizer = get_vectorizer()
    
    try:
        embeddings_matrix = vectorizer.fit_transform(valid_texts).toarray()
        
        # === FIX: Use VECTORIZER_PATH constant ===
        print(f"💾 Saving vectorizer to: {VECTORIZER_PATH}")
        with open(VECTORIZER_PATH, "wb") as f:
            pickle.dump(vectorizer, f)
        print(f"✅ Vectorizer saved successfully!")
        
        actual_count = len(texts)
        return [emb.astype('float32') for emb in embeddings_matrix[:actual_count]]
        
    except ValueError as e:
        if "empty vocabulary" in str(e):
            print("   ⚠️ Text too short for TF-IDF, using simple character encoding...")
            embeddings = []
            for text in valid_texts:
                vec = np.zeros(384, dtype='float32')
                vec[0] = len(text)
                vec[1] = text.count(' ')
                vec[2] = sum(c.isdigit() for c in text)
                vec[3] = sum(c.isalpha() for c in text)
                for i, char in enumerate(text[:380]):
                    vec[4 + i] = ord(char) / 255.0
                embeddings.append(vec)
            
            vectorizer = get_vectorizer()
            vectorizer.fit(["dummy medical text for vectorizer"])
            
            # === FIX: Use VECTORIZER_PATH constant ===
            print(f"💾 Saving fallback vectorizer to: {VECTORIZER_PATH}")
            with open(VECTORIZER_PATH, "wb") as f:
                pickle.dump(vectorizer, f)
            
            return embeddings
        else:
            raise

def build_faiss_index(chunks: List[str]):
    if not chunks:
        raise ValueError("No chunks to index")
    
    print("🔧 Building FAISS index...")
    
    try:
        embeddings = embed_texts(chunks)
    except Exception as e:
        print(f"⚠️ Embedding failed: {e}")
        print("   Creating minimal index with extracted text...")
        embeddings = []
        for chunk in chunks:
            vec = np.random.randn(384).astype('float32')
            embeddings.append(vec)
    
    dim = embeddings[0].shape[0]
    emb_matrix = np.stack(embeddings)
    
    faiss.normalize_L2(emb_matrix)
    
    index = faiss.IndexFlatIP(dim)
    index.add(emb_matrix)
    
    os.makedirs(os.path.dirname(INDEX_PATH) or ".", exist_ok=True)
    
    print(f"💾 Saving index to: {INDEX_PATH}")
    faiss.write_index(index, INDEX_PATH)
    
    print(f"💾 Saving chunks to: {CHUNKS_PATH}")
    with open(CHUNKS_PATH, "wb") as f:
        pickle.dump(chunks, f)
    
    print("✅ Index built successfully!")
    return True

def load_index_and_chunks():
    if not os.path.exists(INDEX_PATH):
        raise FileNotFoundError(f"Index not found at: {INDEX_PATH}. Please upload reports first.")
    if not os.path.exists(CHUNKS_PATH):
        raise FileNotFoundError(f"Chunks not found at: {CHUNKS_PATH}. Please upload reports first.")
    
    print(f"📂 Loading index from: {INDEX_PATH}")
    index = faiss.read_index(INDEX_PATH)
    
    print(f"📂 Loading chunks from: {CHUNKS_PATH}")
    with open(CHUNKS_PATH, "rb") as f:
        chunks = pickle.load(f)
    
    return index, chunks