# rag_pipeline/clean_chunk.py

import re

SECTION_PATTERNS = [
    r"COMPLETE BLOOD COUNT",
    r"\bCBC\b",
    r"BLOOD GLUCOSE",
    r"FASTING",
    r"\bTSH\b",
    r"THYROID",
    r"VITAMIN D",
    r"VITAMIN B12",
    r"25[-\s]?HYDROXYVITAMIN D",
    r"IMMUNOLOGY",
    r"LIPID PROFILE",
    r"LIVER FUNCTION",
    r"KIDNEY FUNCTION",
    r"HEMOGLOBIN",
    r"URINALYSIS",
    r"FOLLOW[-\s]?UP",
    r"MEDICAL REPORT",
    r"PATIENT NAME",
    r"INVESTIGATIONS?",
    r"ESR",
    r"CLINICAL",
]

SECTION_REGEX = re.compile(
    r"(" + "|".join(SECTION_PATTERNS) + r")",
    flags=re.I
)

def clean_text(text: str) -> str:
    if not text:
        return ""
    
    REMOVE_PATTERNS = [
        r"scan to validate.*",
        r"page\s*\d+\s*of\s*\d+",
        r"barcode id.*",
        r"end of report.*",
    ]
    
    for pattern in REMOVE_PATTERNS:
        text = re.sub(pattern, "", text, flags=re.I)
    
    text = text.replace("\r", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    
    return text.strip()

def chunk_by_report(text: str):
    """Split text by FILE: markers first"""
    file_pattern = r"={50,}\nFILE: (.*?)\n={50,}"
    matches = list(re.finditer(file_pattern, text))
    
    chunks = []
    for i, match in enumerate(matches):
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        file_content = text[start:end].strip()
        
        if len(file_content.split()) > 15:  # At least 15 words
            chunks.append(file_content)
    
    return chunks

def chunk_by_sections(text: str):
    """Split by medical sections"""
    matches = list(SECTION_REGEX.finditer(text))
    chunks = []
    
    if matches:
        for i, match in enumerate(matches):
            start = match.start()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            section = text[start:end].strip()
            
            if len(section.split()) > 10:
                chunks.append(section)
    
    return chunks

def chunk_by_paragraphs(text: str, max_words: int = 250, overlap_words: int = 30):
    """Fallback: chunk by paragraphs and words"""
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    
    chunks = []
    current_chunk = []
    current_words = 0
    
    for para in paragraphs:
        para_words = len(para.split())
        
        if current_words + para_words <= max_words:
            current_chunk.append(para)
            current_words += para_words
        else:
            if current_chunk:
                chunks.append('\n\n'.join(current_chunk))
            current_chunk = [para]
            current_words = para_words
    
    if current_chunk:
        chunks.append('\n\n'.join(current_chunk))
    
    return chunks

def chunk_text(text: str, max_words: int = 250, overlap_words: int = 30):
    """
    Multi-strategy chunking:
    1. Try splitting by FILE markers (best for multiple reports)
    2. Try splitting by medical sections
    3. Fallback to paragraph-based chunking
    """
    if not text:
        return []
    
    # Strategy 1: Split by FILE markers
    file_chunks = chunk_by_report(text)
    if len(file_chunks) > 1:
        print(f"✓ Chunked by FILE markers: {len(file_chunks)} chunks")
        return file_chunks
    
    # Strategy 2: Split by medical sections
    section_chunks = chunk_by_sections(text)
    if len(section_chunks) >= 3:
        print(f"✓ Chunked by sections: {len(section_chunks)} chunks")
        return section_chunks
    
    # Strategy 3: Paragraph-based chunking
    para_chunks = chunk_by_paragraphs(text, max_words, overlap_words)
    if para_chunks:
        print(f"✓ Chunked by paragraphs: {len(para_chunks)} chunks")
        return para_chunks
    
    # Last resort: return as single chunk if it has enough words
    if len(text.split()) > 15:
        print(f"⚠ Using entire text as single chunk")
        return [text]
    
    print(f"❌ No valid chunks created")
    return []
