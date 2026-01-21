#extractor_OCR.py

import os
import re
from PIL import Image
import pdfplumber
from pypdf import PdfReader

# OCR libraries (optional - will use if available)
try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    print("⚠️ Tesseract not available. Install with: pip install pytesseract")

try:
    from paddleocr import PaddleOCR
    PADDLE_AVAILABLE = True
    # Initialize PaddleOCR - this will download models on first run
    paddle_ocr = PaddleOCR(lang='en')
    print("✅ PaddleOCR initialized successfully!")
except ImportError:
    PADDLE_AVAILABLE = False
    paddle_ocr = None
    print("⚠️ PaddleOCR not installed. Install with: pip install paddleocr paddlepaddle")
except Exception as e:
    PADDLE_AVAILABLE = False
    paddle_ocr = None
    print(f"⚠️ PaddleOCR initialization failed: {e}")
    print("   Falling back to Tesseract OCR only")
    import traceback
    traceback.print_exc()

def is_image_file(file_path: str) -> bool:
    """Check if file is an image"""
    image_extensions = ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif', '.webp']
    return any(file_path.lower().endswith(ext) for ext in image_extensions)


def is_selectable_pdf(pdf_path: str) -> bool:
    """Check if PDF has selectable text"""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text and len(text.strip()) > 50:
                    return True
    except Exception:
        pass
    return False


def extract_with_pdfplumber(pdf_path: str) -> str:
    """Extract text from selectable PDF"""
    extracted_pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text(x_tolerance=2, y_tolerance=2)
            if text:
                extracted_pages.append(text)
    return "\n".join(extracted_pages)


def extract_with_tesseract(file_path: str) -> str:
    """Extract text using Tesseract OCR"""
    if not TESSERACT_AVAILABLE:
        return ""
    
    try:
        # Handle PDF
        if file_path.lower().endswith('.pdf'):
            from pdf2image import convert_from_path
            images = convert_from_path(file_path, dpi=300)
            texts = []
            for img in images:
                text = pytesseract.image_to_string(img, lang='eng')
                texts.append(text)
            return "\n".join(texts)
        
        # Handle images
        else:
            img = Image.open(file_path)
            text = pytesseract.image_to_string(img, lang='eng')
            return text
            
    except Exception as e:
        print(f"Tesseract extraction failed: {e}")
        return ""


def extract_with_paddleocr(file_path: str) -> str:
    """Extract text using PaddleOCR - FIXED VERSION"""
    if not PADDLE_AVAILABLE or paddle_ocr is None:
        return ""
    
    try:
        # PaddleOCR can handle both images and PDF pages
        if file_path.lower().endswith('.pdf'):
            from pdf2image import convert_from_path
            images = convert_from_path(file_path, dpi=300)
            texts = []
            
            for img_idx, img in enumerate(images):
                # Convert PIL to numpy array
                import numpy as np
                img_array = np.array(img)
                
                # CORRECT API CALL - ocr() method, not predict()
                result = paddle_ocr.ocr(img_array)
                
                # Extract text from result
                page_text = []
                if result and result[0]:
                    for line in result[0]:
                        if line and len(line) >= 2:
                            # line format: [bbox, (text, confidence)]
                            page_text.append(line[1][0])
                
                texts.append("\n".join(page_text))
            
            return "\n\n".join(texts)
        
        # Handle images directly
        else:
            # CORRECT API CALL - ocr() method with file path
            result = paddle_ocr.ocr(file_path)
            
            texts = []
            if result and result[0]:
                for line in result[0]:
                    if line and len(line) >= 2:
                        # line format: [bbox, (text, confidence)]
                        texts.append(line[1][0])
            
            return "\n".join(texts)
            
    except Exception as e:
        print(f"PaddleOCR extraction failed: {e}")
        import traceback
        traceback.print_exc()
        return ""


def _basic_cleanup(text: str) -> str:
    """Basic text cleanup"""
    if not text:
        return ""
    text = text.replace("\r", "\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


def extract_text_universal(file_path: str) -> str:
    """
    Universal text extraction with intelligent routing
    
    Decision Flow:
    1. Check file type (PDF vs Image)
    2. If PDF: Check if selectable
       - Yes → pdfplumber (BEST)
       - No → PaddleOCR → Tesseract → pypdf
    3. If Image: PaddleOCR → Tesseract
    """
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    
    print(f"\n🔍 Processing: {os.path.basename(file_path)}")
    print(f"   PaddleOCR Available: {PADDLE_AVAILABLE}")
    print(f"   Tesseract Available: {TESSERACT_AVAILABLE}")
    
    # ========================================
    # ROUTE 1: IMAGE FILES
    # ========================================
    if is_image_file(file_path):
        print("📸 Detected: Image file")
        
        # Try PaddleOCR first (best for complex layouts & handwriting)
        if PADDLE_AVAILABLE:
            print("   → Using PaddleOCR (best for images & handwriting)...")
            text = extract_with_paddleocr(file_path)
            if text and len(text.strip()) > 20:
                print(f"   ✅ PaddleOCR successful ({len(text)} chars)")
                return _basic_cleanup(text)
            else:
                print(f"   ⚠️ PaddleOCR returned insufficient text ({len(text) if text else 0} chars)")
        
        # Fallback to Tesseract
        if TESSERACT_AVAILABLE:
            print("   → Trying Tesseract OCR...")
            text = extract_with_tesseract(file_path)
            if text and len(text.strip()) > 20:
                print(f"   ✅ Tesseract successful ({len(text)} chars)")
                return _basic_cleanup(text)
        
        print("   ❌ No OCR libraries available or no text extracted")
        return ""
    
    # ========================================
    # ROUTE 2: PDF FILES
    # ========================================
    elif file_path.lower().endswith('.pdf'):
        print("📄 Detected: PDF file")
        
        # Check if selectable PDF
        if is_selectable_pdf(file_path):
            print("   → Selectable PDF detected")
            print("   → Using pdfplumber (fastest)...")
            try:
                text = extract_with_pdfplumber(file_path)
                if text.strip():
                    print(f"   ✅ pdfplumber successful ({len(text)} chars)")
                    return _basic_cleanup(text)
            except Exception as e:
                print(f"   ⚠️ pdfplumber failed: {e}")
        
        # Scanned PDF - use OCR
        print("   → Scanned/Image-based PDF detected")
        
        # Try PaddleOCR first (best for complex layouts)
        if PADDLE_AVAILABLE:
            print("   → Using PaddleOCR...")
            text = extract_with_paddleocr(file_path)
            if text and len(text.strip()) > 20:
                print(f"   ✅ PaddleOCR successful ({len(text)} chars)")
                return _basic_cleanup(text)
        
        # Try Tesseract
        if TESSERACT_AVAILABLE:
            print("   → Using Tesseract OCR...")
            text = extract_with_tesseract(file_path)
            if text and len(text.strip()) > 20:
                print(f"   ✅ Tesseract successful ({len(text)} chars)")
                return _basic_cleanup(text)
        
        # Last resort: pypdf
        print("   → Trying pypdf as fallback...")
        try:
            reader = PdfReader(file_path)
            pages = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)
            
            if pages:
                result = "\n".join(pages)
                print(f"   ✅ pypdf successful ({len(result)} chars)")
                return _basic_cleanup(result)
        except Exception as e:
            print(f"   ❌ pypdf failed: {e}")
        
        print("   ❌ All extraction methods failed")
        return ""
    
    else:
        raise ValueError(f"Unsupported file type: {file_path}")