# rag_pipeline/rag_query.py

import os
import numpy as np
import faiss
import requests
import pickle
import re
from rag_pipeline.embed_store import load_index_and_chunks, VECTORIZER_PATH

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"

def extract_patient_name(text: str) -> str:
    """Extract patient name from medical report text"""
    patterns = [
        r"Patient\s*Name\s*[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
        r"Name\s*[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
        r"Mr\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
        r"Mrs\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
        r"Ms\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            name = match.group(1).strip()
            if len(name) > 2 and name.lower() not in ['test', 'report', 'blood', 'patient']:
                return name
    return "Patient"

def extract_report_dates(chunks: list) -> list:
    """Extract all report dates from chunks"""
    dates = []
    date_patterns = [
        r"(\d{1,2}[/-]\d{1,2}[/-]\d{4})",
        r"(\d{4}[/-]\d{1,2}[/-]\d{1,2})",
        r"Registered on\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})",
        r"Reported on\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})",
    ]
    
    full_text = "\n".join(chunks)
    
    for pattern in date_patterns:
        matches = re.findall(pattern, full_text, re.IGNORECASE)
        dates.extend(matches)
    
    seen = set()
    unique_dates = []
    for date in dates:
        if date not in seen:
            seen.add(date)
            unique_dates.append(date)
    
    return unique_dates[:10]

def ask_rag(question: str, top_k: int = 10, num_reports: int = 1):
    if not GROQ_API_KEY:
        return "❌ Error: GROQ_API_KEY environment variable not set!"
    
    # === FIX: Check vectorizer exists before trying to load ===
    print(f"🔍 Checking for vectorizer at: {VECTORIZER_PATH}")
    
    if not os.path.exists(VECTORIZER_PATH):
        error_msg = f"❌ Error: Vectorizer not found at {VECTORIZER_PATH}\n"
        error_msg += "Please process files first using /api/process-files"
        print(error_msg)
        return error_msg
    
    try:
        index, chunks = load_index_and_chunks()
        
        # === FIX: Load vectorizer using the constant ===
        print(f"📂 Loading vectorizer from: {VECTORIZER_PATH}")
        with open(VECTORIZER_PATH, "rb") as f:
            vectorizer = pickle.load(f)
        print(f"✅ Vectorizer loaded successfully!")
        
    except FileNotFoundError as e:
        return f"Error: {str(e)}"
    
    # Extract patient name and dates from chunks
    patient_name = extract_patient_name("\n".join(chunks))
    report_dates = extract_report_dates(chunks)
    
    # Embed query using fitted vectorizer
    try:
        query_emb = vectorizer.transform([question]).toarray()[0].astype('float32')
    except:
        query_emb = np.random.randn(384).astype('float32')
    
    query_emb = query_emb.reshape(1, -1)
    faiss.normalize_L2(query_emb)
    
    # Search
    search_k = min(top_k * 2, len(chunks))
    scores, indices = index.search(query_emb, search_k)
    
    context = "\n\n".join(chunks[i] for i in indices[0])
    
    # Add metadata to context
    metadata = f"""
PATIENT: {patient_name}
NUMBER OF REPORTS: {num_reports}
DATES FOUND: {', '.join(report_dates) if report_dates else 'Not detected'}
---
"""
    
    full_context = metadata + context
    
    # Different prompts based on number of reports
    if num_reports > 1 or len(report_dates) > 1:
        system_prompt = "You are a medical report summarizer. Provide factual, concise bullet-point summaries showing trends across multiple visits."
        
        prompt = f"""Analyze these medical reports from multiple visits.

{full_context}

INSTRUCTIONS:
Create a bullet-point summary with these sections:

**Patient Information:**
- Name, age, gender
- Report dates (in chronological order)

**Test Results & Trends:**
For each test, show:
- Test name: Date1 value → Date2 value → Date3 value (reference range)
- Note trend: Stable / Increasing / Decreasing

**Key Observations:**
- Any significant changes
- Morphology changes if mentioned
- Notable patterns

Example format:

**Patient Information:**
- Patient: Vedant Dhoke, 21-year-old male
- Reports: 03/12/2025, 15/12/2025

**Test Results & Trends:**
- Hemoglobin: 14.6 g/dL → 15.2 g/dL (ref: 13.5-18.0) - Increasing
- WBC Count: 7730/cumm → 8100/cumm (ref: 4000-10500) - Stable
- Vitamin D: 9.79 ng/mL → 18.5 ng/mL (ref: 30-100) - Increasing
- Vitamin B12: 168 pg/mL → 220 pg/mL (ref: 187-883) - Improving

**Key Observations:**
- Hemoglobin improved from borderline to normal range
- Vitamin D still below sufficiency despite improvement
- RBC morphology: normocytic normochromic in both visits

Use arrows (→) for trends. Keep it factual, no medical advice."""

    else:
        system_prompt = "You are a medical report summarizer. Provide factual, concise bullet-point summaries."
        
        prompt = f"""Summarize this medical report in bullet points.

{full_context}

INSTRUCTIONS:
Create a bullet-point summary with:

**Patient Information:**
- Name, age, gender, date

**Test Results:**
- Test name: value (reference range)
- List all tests performed

**Morphology/Findings:**
- Any descriptive findings mentioned

Example:

**Patient Information:**
- Patient: Vedant Dhoke, 21-year-old male
- Date: 03/12/2025

**Test Results:**
- Hemoglobin: 14.6 g/dL (ref: 13.5-18.0)
- RBC Count: 5.56 10^6/cmm (ref: 4.7-6.0)
- WBC Count: 7730/cumm (ref: 4000-10500)
- Neutrophils: 56.2%, Lymphocytes: 33.3%
- Fasting Glucose: 81.9 mg/dL (ref: 70-100)
- TSH: 3.0 ulU/ml (ref: 0.3-4.9)
- Vitamin D: 9.79 ng/mL (ref: 30-100)
- Vitamin B12: 168 pg/mL (ref: 187-883)

**Morphology/Findings:**
- RBC: normocytic normochromic

Keep it factual. No interpretations or recommendations."""

    payload = {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "model": "llama-3.3-70b-versatile",
        "temperature": 0.1,
        "max_tokens": 2000
    }
    
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        resp = requests.post(GROQ_CHAT_URL, json=payload, headers=headers, timeout=60)
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
    except requests.exceptions.RequestException as e:
        return f"❌ Groq API Error: {str(e)}\n\nPlease check your API key and try again."