# backend/rag_pipeline/rag_query.py

import os
import numpy as np
import faiss
import requests
import pickle
import re
from rag_pipeline.embed_store import load_index_and_chunks, EMBEDDING_DIM


GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"


def extract_patient_name(text: str) -> str:
    """Extract patient name from medical text"""
    patterns = [
        r"Patient\s*Name\s*[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
        r"Name\s*[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
        r"Mr\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
        r"Mrs\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            name = match.group(1).strip()
            if len(name) > 2:
                return name
    
    return "Patient"


def extract_report_dates(chunks: list) -> list:
    """Extract dates from report chunks"""
    dates = []
    date_patterns = [
        r"(\d{1,2}[/-]\d{1,2}[/-]\d{4})",
        r"(\d{4}[/-]\d{1,2}[/-]\d{1,2})",
        r"Date\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})",
        r"Registered\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})",
    ]
    
    full_text = "\n".join(chunks)
    
    for pattern in date_patterns:
        matches = re.findall(pattern, full_text, re.IGNORECASE)
        dates.extend(matches)
    
    # Return unique dates
    seen = set()
    unique = []
    for date in dates:
        if date not in seen:
            seen.add(date)
            unique.append(date)
    
    return unique[:10]


def ask_rag(question: str, temp_dir: str, top_k: int = 10, num_reports: int = 1):
    """
    Query RAG system using temp directory
    
    Args:
        question: Query to answer
        temp_dir: Temporary directory with index/vectorizer
        top_k: Number of chunks to retrieve
        num_reports: Number of reports
    
    Returns:
        Generated summary text
    """
    print(f"\n{'='*80}")
    print(f"🤖 RAG QUERY")
    print(f"{'='*80}")
    print(f"Question: {question[:100]}...")
    print(f"Top K: {top_k}")
    print(f"Temp dir: {temp_dir}")
    
    # Validate API key
    if not GROQ_API_KEY:
        error = "❌ GROQ_API_KEY not set in environment"
        print(error)
        return error
    
    try:
        # Load index, chunks, and vectorizer from temp
        print("📂 Loading from temp directory...")
        index, chunks, vectorizer = load_index_and_chunks(temp_dir)
        
    except FileNotFoundError as e:
        error = f"❌ Error: {str(e)}"
        print(error)
        return error
    except Exception as e:
        error = f"❌ Failed to load from temp: {str(e)}"
        print(error)
        return error
    
    # Extract metadata
    print("\n🔍 Extracting metadata...")
    patient_name = extract_patient_name("\n".join(chunks))
    report_dates = extract_report_dates(chunks)
    
    print(f"   Patient: {patient_name}")
    print(f"   Dates: {', '.join(report_dates[:3])}" if report_dates else "   Dates: None found")
    
    # Embed query using SAME vectorizer
    print(f"\n🔧 Embedding query...")
    try:
        query_emb = vectorizer.transform([question]).toarray()[0].astype('float32')
        
        # Ensure correct dimension
        if len(query_emb) < EMBEDDING_DIM:
            padding = np.zeros(EMBEDDING_DIM - len(query_emb), dtype='float32')
            query_emb = np.concatenate([query_emb, padding])
        
        query_emb = query_emb.reshape(1, -1)
        faiss.normalize_L2(query_emb)
        
        print(f"   ✅ Query embedded: {query_emb.shape}")
        
    except Exception as e:
        error = f"❌ Failed to embed query: {str(e)}"
        print(error)
        return error
    
    # Search similar chunks
    print(f"\n🎯 Searching for top {top_k} chunks...")
    try:
        search_k = min(top_k * 2, len(chunks))
        scores, indices = index.search(query_emb, search_k)
        
        print(f"   ✅ Found {len(indices[0])} results")
        
        # Build context from top chunks
        context_chunks = []
        for idx in indices[0]:
            if idx < len(chunks):
                context_chunks.append(chunks[idx])
        
        # Limit context size
        max_chunks = min(20, len(context_chunks))
        context = "\n\n---\n\n".join(context_chunks[:max_chunks])
        
        # Limit total context length
        max_context_length = 6000
        if len(context) > max_context_length:
            context = context[:max_context_length] + "\n\n[Content truncated]"
        
        print(f"   Context: {len(context)} chars from {max_chunks} chunks")
        
    except Exception as e:
        error = f"❌ Search failed: {str(e)}"
        print(error)
        import traceback
        traceback.print_exc()
        return error
    
    # Prepare metadata
    metadata = f"""PATIENT: {patient_name}
REPORTS: {num_reports}
DATES: {', '.join(report_dates) if report_dates else 'Not detected'}

---

"""
    
    full_context = metadata + context
    
    # Prepare prompt
    print(f"\n🤖 Generating summary...")
    
    if num_reports > 1:
        system_prompt = """You are a medical report analyzer. Create clear, concise summaries of medical reports.

RULES:
- Be factual and precise
- Show trends ONLY if multiple reports of same type exist but if present focus more on trends.
- List key findings for different report types
- Highlight abnormalities
- Keep it brief and readable
- The Summary should consist of all the numeric values present in all the reports along with their units.
- Show trend of each and every value if multiple reports of same type exist"""

        user_prompt = f"""Analyze these medical reports and create a summary.

{full_context}

Create a summary following this format:

**Patient Information**
- Name, Age, Gender (if available)
- Report dates

**Key Findings**
For each test/report type found:
- Test name: Results (with reference ranges if lab values)
- Trends (if multiple reports of same type): Date1 → Date2 (status)

**Abnormalities** (if any)
- List any values outside normal range
- Mention any concerning findings

**Recommendations** (if mentioned in reports, mention the reference letting the user know that the Recommendations are from the report)
- Follow-up actions
- Lifestyle changes


Keep it concise and medically accurate."""

    else:
        system_prompt = """You are a medical report analyzer. Create clear, concise summaries of medical reports.

RULES:
- Be factual and precise
- List key findings
- Highlight abnormalities
- Keep it brief"""

        user_prompt = f"""Summarize this medical report.

{full_context}

Create a summary with:

**Patient Information**
- Name, Age, Gender (if available)
- Report date

**Report Type**
- Blood test / Imaging / Cardiac / Other

**Key Findings**
- Main test results (with reference ranges for lab values)
- Important observations

**Abnormalities** (if any)
- Values outside normal range
- Concerning findings

Keep it concise and accurate."""
    
    # Call Groq API
    print(f"🚀 Calling Groq API...")
    
    payload = {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "model": "llama-3.3-70b-versatile",
        "temperature": 0.1,
        "max_tokens": 1000,
    }
    
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            GROQ_CHAT_URL,
            json=payload,
            headers=headers,
            timeout=60
        )
        response.raise_for_status()
        
        result = response.json()
        summary = result["choices"][0]["message"]["content"]
        
        print(f"✅ Summary generated: {len(summary)} chars")
        print(f"{'='*80}\n")
        
        return summary
        
    except requests.exceptions.Timeout:
        error = "❌ Request timeout - Groq API took too long"
        print(error)
        return error
    except requests.exceptions.HTTPError as e:
        error = f"❌ Groq API HTTP error: {e.response.status_code} - {e.response.text}"
        print(error)
        return error
    except requests.exceptions.RequestException as e:
        error = f"❌ Groq API request failed: {str(e)}"
        print(error)
        return error
    except KeyError as e:
        error = f"❌ Unexpected API response format: {str(e)}"
        print(error)
        return error
    except Exception as e:
        error = f"❌ Summary generation failed: {str(e)}"
        print(error)
        return error