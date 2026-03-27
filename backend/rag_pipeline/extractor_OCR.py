# backend/rag_pipeline/extractor_OCR.py

import io
import os
import re
import cv2
import numpy as np
from PIL import Image
import pdfplumber

# ── Suppress PaddlePaddle internal logs before importing ──────────────────────
os.environ.setdefault("GLOG_minloglevel", "3")
os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")

# ── OCR library imports ───────────────────────────────────────────────────────

# PaddleOCR  (primary engine)
# NOTE: use_gpu / show_log were removed in >= 2.10 — do NOT include them.
PADDLE_AVAILABLE = False
paddle_ocr = None
try:
    from paddleocr import PaddleOCR

    _new_kwargs = {                         # paddleocr >= 2.10
        "use_textline_orientation": True,
        "lang": "en",
        "text_det_thresh": 0.3,
        "text_det_box_thresh": 0.5,
        "text_det_unclip_ratio": 2.0,
        "text_recognition_batch_size": 6,
    }
    _legacy_kwargs = {                      # paddleocr < 2.10
        "use_angle_cls": True,
        "lang": "en",
        "det_db_thresh": 0.3,
        "det_db_box_thresh": 0.5,
        "det_db_unclip_ratio": 2.0,
        "rec_batch_num": 6,
    }

    for _kwargs in [_new_kwargs, _legacy_kwargs]:
        try:
            paddle_ocr = PaddleOCR(**_kwargs)
            PADDLE_AVAILABLE = True
            print("✅ PaddleOCR initialized (primary engine)")
            break
        except TypeError:
            continue
    else:
        raise RuntimeError(
            "No compatible PaddleOCR API signature found. "
            "Try: pip install --upgrade paddleocr"
        )

except Exception as e:
    PADDLE_AVAILABLE = False
    paddle_ocr = None
    print(f"⚠️ PaddleOCR not available: {e}")

# EasyOCR  (fallback engine — lazily initialized on first use)
_easyocr_reader = None       # internal singleton; use _get_easyocr_reader()
_easyocr_checked = False     # set to True after the first init attempt


# ── Image preprocessing ───────────────────────────────────────────────────────

def preprocess_image(img_array: np.ndarray, verbose: bool = False) -> np.ndarray:
    """
    Grayscale → denoise → CLAHE → adaptive threshold.
    Returns a 2-D binary array suitable for EasyOCR.

    NOTE: Do NOT pass this output to PaddleOCR — it requires a 3-channel image.
    Use ensure_color() for PaddleOCR input.
    """
    if verbose:
        print("  🔧 Preprocessing image...", flush=True)

    if img_array is None or img_array.size == 0:
        return img_array

    if len(img_array.shape) == 3:
        gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
    else:
        gray = img_array

    denoised = cv2.fastNlMeansDenoising(gray, h=10)
    clahe    = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)
    binary   = cv2.adaptiveThreshold(
        enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 11, 2
    )

    if verbose:
        print("    ✅ Preprocessing complete", flush=True)

    return binary


def ensure_color(img_array: np.ndarray) -> np.ndarray:
    """
    Guarantee a uint8 3-channel (H, W, 3) BGR array.
    PaddleOCR crashes with IndexError if given a 2-D or 4-channel array.
    """
    if img_array is None or img_array.size == 0:
        return img_array

    # Ensure uint8
    if img_array.dtype != np.uint8:
        img_array = img_array.astype(np.uint8)

    # Already 3-channel
    if len(img_array.shape) == 3 and img_array.shape[2] == 3:
        return img_array

    # 4-channel (RGBA) → BGR
    if len(img_array.shape) == 3 and img_array.shape[2] == 4:
        return cv2.cvtColor(img_array, cv2.COLOR_RGBA2BGR)

    # 2-D grayscale or binary → BGR
    if len(img_array.shape) == 2:
        return cv2.cvtColor(img_array, cv2.COLOR_GRAY2BGR)

    return img_array


# ── PaddleOCR result parser ───────────────────────────────────────────────────

def _parse_paddle_result(result_raw, conf_threshold: float = 0.3) -> list[str]:
    """
    Parse PaddleOCR output regardless of API version.

    Handles:
      1. New object API (>= 2.10): objects with .rec_texts / .rec_scores
      2. New dict API  (>= 2.10): dicts with 'rec_texts' / 'rec_scores' keys
      3. Legacy list API (< 2.10): [[box, (text, conf)], ...]
    """
    texts = []

    if not result_raw:
        return texts

    for page in result_raw:
        if page is None:
            continue

        # ── 1. New object API ──────────────────────────────────────────────────
        if hasattr(page, "rec_texts"):
            rec_texts  = page.rec_texts or []
            rec_scores = getattr(page, "rec_scores", None) or [1.0] * len(rec_texts)
            for text, conf in zip(rec_texts, rec_scores):
                if text and str(text).strip() and float(conf) >= conf_threshold:
                    texts.append(str(text).strip())
            continue

        # ── 2. New dict API ────────────────────────────────────────────────────
        if isinstance(page, dict):
            rec_texts  = page.get("rec_texts") or page.get("rec_text") or []
            rec_scores = (
                page.get("rec_scores") or page.get("rec_score")
                or [1.0] * len(rec_texts)
            )
            for text, conf in zip(rec_texts, rec_scores):
                if text and str(text).strip() and float(conf) >= conf_threshold:
                    texts.append(str(text).strip())
            continue

        # ── 3. Legacy list API ─────────────────────────────────────────────────
        if isinstance(page, (list, tuple)):
            for item in page:
                try:
                    if not isinstance(item, (list, tuple)) or len(item) < 2:
                        continue
                    text_info = item[1]
                    if not isinstance(text_info, (list, tuple)) or len(text_info) < 2:
                        continue
                    text = str(text_info[0])
                    conf = float(text_info[1])
                    if text.strip() and conf >= conf_threshold:
                        texts.append(text.strip())
                except (IndexError, TypeError, ValueError):
                    continue
            continue

    return texts


# ── OCR engines ───────────────────────────────────────────────────────────────

def extract_with_paddle(img_array: np.ndarray, verbose: bool = False) -> str:
    """
    Extract text using PaddleOCR (primary engine).

    IMPORTANT: PaddleOCR requires a 3-channel uint8 BGR image.
    Always call ensure_color() before passing here — never pass a
    grayscale or binary array directly.
    """
    if not PADDLE_AVAILABLE:
        return ""

    if verbose:
        print("    → PaddleOCR (primary)...", flush=True)

    # Safety net: guarantee color even if caller forgot
    color_img = ensure_color(img_array)

    result_raw = None
    try:
        result_raw = list(paddle_ocr.predict(color_img))
    except TypeError:
        result_raw = None   # old version, no .predict()
    except Exception as e:
        if verbose:
            print(f"      ✗ .predict() failed: {type(e).__name__}: {e}", flush=True)
        result_raw = None

    if result_raw is None:
        try:
            result_raw = paddle_ocr.ocr(color_img)
        except Exception as e:
            if verbose:
                print(f"      ✗ .ocr() failed: {type(e).__name__}: {e}", flush=True)
            return ""

    try:
        texts = _parse_paddle_result(result_raw, conf_threshold=0.3)
    except Exception as e:
        if verbose:
            print(f"      ✗ parsing failed: {type(e).__name__}: {e}", flush=True)
        return ""

    extracted = "\n".join(texts)

    if verbose:
        if extracted:
            print(f"      ✓ {len(extracted)} chars extracted", flush=True)
        else:
            print("      ✗ PaddleOCR: 0 lines parsed", flush=True)

    return extracted


def _get_easyocr_reader():
    """
    Return the EasyOCR reader, initializing it on the very first call.
    Returns None if EasyOCR is unavailable.
    """
    global _easyocr_reader, _easyocr_checked
    if _easyocr_checked:
        return _easyocr_reader          # already tried (success or failure)

    _easyocr_checked = True
    try:
        import easyocr
        print("🔄 Initializing EasyOCR fallback...", flush=True)
        _easyocr_reader = easyocr.Reader(['en'], gpu=False)
        print("✅ EasyOCR initialized", flush=True)
    except Exception as e:
        _easyocr_reader = None
        print(f"⚠️ EasyOCR not available: {e}", flush=True)

    return _easyocr_reader


def extract_with_easyocr(img_array: np.ndarray, verbose: bool = False) -> str:
    """Extract text using EasyOCR (fallback engine). Accepts grayscale or binary arrays."""
    reader = _get_easyocr_reader()
    if reader is None:
        return ""

    try:
        if verbose:
            print("    → EasyOCR (fallback)...", flush=True)

        result = reader.readtext(img_array)
        texts = [item[1] for item in result if item[2] > 0.3]
        extracted = "\n".join(texts)

        if verbose and extracted:
            print(f"      ✓ {len(extracted)} chars extracted", flush=True)

        return extracted

    except Exception as e:
        if verbose:
            print(f"      ✗ EasyOCR failed: {e}", flush=True)
        return ""


# ── Post-processing ───────────────────────────────────────────────────────────

def postprocess_text(text: str) -> str:
    """Clean up extracted text."""
    if not text:
        return text

    text = re.sub(r'[ \t]{2,}', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)

    corrections = {
        r'\b[Mm]edica[|l1]': 'Medical',
        r'\b[Pp]atient':     'Patient',
        r'\b[Rr]eport':      'Report',
        r'\b[Tt]est':        'Test',
        r'\b[Bb]lood':       'Blood',
        r'\b[Dd]ate':        'Date',
        r'\b[Nn]ame':        'Name',
    }
    for pattern, replacement in corrections.items():
        text = re.sub(pattern, replacement, text)

    return text.strip()


# ── Shared internal helpers (module-level so both entry points can use them) ──

def _prepare_for_easyocr_array(
    img_array: np.ndarray,
    use_preprocessing: bool = True,
    verbose: bool = False,
) -> np.ndarray:
    """
    Return the image in the form EasyOCR expects (grayscale / binary).

    Separated from _ocr_best_from_array so it can be used independently
    if needed, and so both extract_text_universal() and
    extract_text_from_bytes() share exactly the same preprocessing path.
    """
    if use_preprocessing:
        return preprocess_image(img_array, verbose=verbose)
    if len(img_array.shape) == 3:
        return cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
    return img_array


def _ocr_best_from_array(
    raw_img: np.ndarray,
    use_preprocessing: bool = True,
    verbose: bool = False,
) -> str:
    """
    Try PaddleOCR first; fall back to EasyOCR only when PaddleOCR returns
    an empty result.

    raw_img must be the original loaded image (color, HWC uint8).
    Preprocessing is applied internally per-engine as needed.

    This is a MODULE-LEVEL function (promoted from the nested _ocr_best
    inside extract_text_universal) so that both extract_text_universal()
    and extract_text_from_bytes() share the same engine-routing logic
    without any code duplication.
    """
    # ── Primary: PaddleOCR (color image) ──────────────────────────────────────
    paddle_text = extract_with_paddle(raw_img, verbose=verbose)
    if paddle_text:
        if verbose:
            print(f"\n  ✅ Best result: PaddleOCR ({len(paddle_text)} chars)", flush=True)
        return paddle_text

    # ── Fallback: EasyOCR (preprocessed binary image) ─────────────────────────
    if verbose:
        print("  ⚠️ PaddleOCR returned empty — trying EasyOCR fallback...", flush=True)

    processed = _prepare_for_easyocr_array(raw_img, use_preprocessing=use_preprocessing, verbose=verbose)
    easyocr_text = extract_with_easyocr(processed, verbose=verbose)
    if easyocr_text:
        if verbose:
            print(f"\n  ✅ Best result: EasyOCR fallback ({len(easyocr_text)} chars)", flush=True)
        return easyocr_text

    return ""


# ── Main extraction entry points ──────────────────────────────────────────────

def extract_text_universal(
    file_path: str,
    use_preprocessing: bool = True,
    verbose: bool = False,
) -> str:
    """
    Universal text extraction from images and PDFs.

    Engine routing:
      - PaddleOCR  (primary)  → always receives the original color image (3-channel)
      - EasyOCR    (fallback) → used only when PaddleOCR yields no result;
                                receives the preprocessed binary image

    Args:
        file_path:          Path to the image or PDF file.
        use_preprocessing:  Apply preprocessing for EasyOCR fallback (default: True).
        verbose:            Print detailed progress (default: False).

    Returns:
        Extracted and cleaned text string.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    if verbose:
        print(f"\n{'='*80}", flush=True)
        print(f"🔍 OCR EXTRACTION: {os.path.basename(file_path)}", flush=True)
        print(f"{'='*80}", flush=True)

    # =========================================================================
    # IMAGE FILES
    # =========================================================================
    image_exts = ('.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif', '.webp')
    if file_path.lower().endswith(image_exts):
        if verbose:
            print("📸 Image file detected", flush=True)

        try:
            img = Image.open(file_path).convert("RGB")
            img_array = np.array(img)          # always (H, W, 3) uint8

            if verbose:
                print(f"   Image size: {img.size} | array shape: {img_array.shape}", flush=True)

            text = _ocr_best_from_array(img_array, use_preprocessing=use_preprocessing, verbose=verbose)

            if text:
                cleaned = postprocess_text(text)
                if verbose:
                    print(f"  ✅ Final text: {len(cleaned)} chars", flush=True)
                    print(f"{'='*80}\n", flush=True)
                return cleaned
            else:
                if verbose:
                    print("\n  ❌ No text extracted from any engine", flush=True)
                    print(f"{'='*80}\n", flush=True)
                return ""

        except Exception as e:
            if verbose:
                print(f"\n  ❌ Image processing failed: {e}", flush=True)
                print(f"{'='*80}\n", flush=True)
            return ""

    # =========================================================================
    # PDF FILES
    # =========================================================================
    elif file_path.lower().endswith('.pdf'):
        if verbose:
            print("📄 PDF file detected", flush=True)

        # Step 1: try pdfplumber for selectable PDFs
        try:
            if verbose:
                print("  → Trying pdfplumber...", flush=True)

            with pdfplumber.open(file_path) as pdf:
                text = ""
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n\n"

                if text.strip() and len(text.strip()) > 100:
                    if verbose:
                        print(
                            f"  ✅ pdfplumber: {len(text)} chars "
                            f"from {len(pdf.pages)} pages", flush=True
                        )
                        print(f"{'='*80}\n", flush=True)
                    return text.strip()
                else:
                    if verbose:
                        print(
                            f"  ⚠️ pdfplumber: insufficient text "
                            f"({len(text.strip())} chars), switching to OCR", flush=True
                        )

        except Exception as e:
            if verbose:
                print(f"  ⚠️ pdfplumber failed: {e}", flush=True)

        # Step 2: scanned PDF — render pages to images then OCR
        if verbose:
            print("  → Scanned PDF - using OCR...", flush=True)

        try:
            from pdf2image import convert_from_path

            images = convert_from_path(file_path, dpi=300)

            if verbose:
                print(f"     Converted to {len(images)} image(s)", flush=True)

            all_text = []
            for i, img in enumerate(images, start=1):
                if verbose:
                    print(f"\n  📄 Processing page {i}/{len(images)}...", flush=True)

                # pdf2image returns PIL images — convert to color numpy array
                img_array = np.array(img.convert("RGB"))
                page_text = _ocr_best_from_array(img_array, use_preprocessing=use_preprocessing, verbose=verbose)

                if page_text:
                    all_text.append(page_text)

            combined = "\n\n".join(all_text)
            if combined.strip():
                cleaned = postprocess_text(combined)
                if verbose:
                    print(
                        f"\n  ✅ OCR complete: {len(cleaned)} chars "
                        f"from {len(all_text)} page(s)", flush=True
                    )
                    print(f"{'='*80}\n", flush=True)
                return cleaned
            else:
                if verbose:
                    print(f"\n  ❌ No text extracted from PDF", flush=True)
                    print(f"{'='*80}\n", flush=True)
                return ""

        except Exception as e:
            if verbose:
                print(f"\n  ❌ PDF OCR failed: {e}", flush=True)
                print(f"{'='*80}\n", flush=True)
            return ""

    else:
        raise ValueError(f"Unsupported file type: {file_path}")


def extract_text_from_bytes(
    file_bytes: bytes,
    file_extension: str,
    use_preprocessing: bool = True,
    verbose: bool = False,
) -> str:
    """
    Universal text extraction from in-memory file bytes — no disk I/O.

    This is the bytes-compatible counterpart to extract_text_universal().
    It is used by app_api.py, which receives files as raw bytes from
    Supabase Storage and must never write them to disk.

    Uses the exact same PaddleOCR → EasyOCR engine pipeline as
    extract_text_universal(), so OCR quality is identical regardless of
    which entry point is called.

    Args:
        file_bytes:         Raw bytes of the file (PDF or image).
        file_extension:     File extension including the dot, e.g. ".pdf",
                            ".jpg".  Case-insensitive.
        use_preprocessing:  Apply CLAHE + adaptive-threshold preprocessing
                            for the EasyOCR fallback path (default: True).
        verbose:            Print detailed progress (default: False).

    Returns:
        Extracted and post-processed text string, or "" on failure.

    Raises:
        ValueError: If file_extension is not a supported type.
    """
    ext = file_extension.lower()
    if not ext.startswith('.'):
        ext = '.' + ext

    if verbose:
        print(f"\n{'='*80}", flush=True)
        print(f"🔍 OCR EXTRACTION (in-memory, {ext})", flush=True)
        print(f"{'='*80}", flush=True)

    # =========================================================================
    # PDF FILES
    # =========================================================================
    if ext == '.pdf':
        if verbose:
            print("📄 PDF (bytes) detected", flush=True)

        # Step 1: pdfplumber on BytesIO — works for selectable text PDFs
        try:
            if verbose:
                print("  → Trying pdfplumber...", flush=True)

            bytes_io = io.BytesIO(file_bytes)
            with pdfplumber.open(bytes_io) as pdf:
                text = ""
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n\n"

                if text.strip() and len(text.strip()) > 50:
                    if verbose:
                        print(
                            f"  ✅ pdfplumber: {len(text)} chars "
                            f"from {len(pdf.pages)} pages", flush=True
                        )
                        print(f"{'='*80}\n", flush=True)
                    return text.strip()
                else:
                    if verbose:
                        print(
                            f"  ⚠️ pdfplumber: insufficient text "
                            f"({len(text.strip())} chars), switching to OCR", flush=True
                        )

        except Exception as e:
            if verbose:
                print(f"  ⚠️ pdfplumber failed: {e}", flush=True)

        # Step 2: scanned PDF — convert_from_bytes → numpy array → OCR
        if verbose:
            print("  → Scanned PDF - using OCR...", flush=True)

        try:
            from pdf2image import convert_from_bytes

            images = convert_from_bytes(file_bytes, dpi=300)

            if verbose:
                print(f"     Converted to {len(images)} image(s)", flush=True)

            all_text = []
            for i, img in enumerate(images, start=1):
                if verbose:
                    print(f"\n  📄 Processing page {i}/{len(images)}...", flush=True)

                img_array = np.array(img.convert("RGB"))   # always (H, W, 3) uint8
                page_text = _ocr_best_from_array(
                    img_array,
                    use_preprocessing=use_preprocessing,
                    verbose=verbose,
                )
                if page_text:
                    all_text.append(page_text)

            combined = "\n\n".join(all_text)
            if combined.strip():
                cleaned = postprocess_text(combined)
                if verbose:
                    print(
                        f"\n  ✅ OCR complete: {len(cleaned)} chars "
                        f"from {len(all_text)} page(s)", flush=True
                    )
                    print(f"{'='*80}\n", flush=True)
                return cleaned
            else:
                if verbose:
                    print("\n  ❌ No text extracted from PDF", flush=True)
                    print(f"{'='*80}\n", flush=True)
                return ""

        except Exception as e:
            if verbose:
                print(f"\n  ❌ PDF OCR failed: {e}", flush=True)
                print(f"{'='*80}\n", flush=True)
            return ""

    # =========================================================================
    # IMAGE FILES
    # =========================================================================
    image_exts = ('.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif', '.webp')
    if ext in image_exts:
        if verbose:
            print("📸 Image (bytes) detected", flush=True)

        try:
            bytes_io = io.BytesIO(file_bytes)
            img = Image.open(bytes_io).convert("RGB")   # always 3-channel
            img_array = np.array(img)                   # (H, W, 3) uint8

            if verbose:
                print(f"   Image size: {img.size} | array shape: {img_array.shape}", flush=True)

            text = _ocr_best_from_array(
                img_array,
                use_preprocessing=use_preprocessing,
                verbose=verbose,
            )

            if text:
                cleaned = postprocess_text(text)
                if verbose:
                    print(f"  ✅ Final text: {len(cleaned)} chars", flush=True)
                    print(f"{'='*80}\n", flush=True)
                return cleaned
            else:
                if verbose:
                    print("\n  ❌ No text extracted from any engine", flush=True)
                    print(f"{'='*80}\n", flush=True)
                return ""

        except Exception as e:
            if verbose:
                print(f"\n  ❌ Image processing failed: {e}", flush=True)
                print(f"{'='*80}\n", flush=True)
            return ""

    # =========================================================================
    # UNSUPPORTED
    # =========================================================================
    raise ValueError(f"Unsupported file extension: {file_extension}")


# ── CLI entry point ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        test_file = sys.argv[1]
        print(f"\nTesting OCR on: {test_file}\n")
        result = extract_text_universal(test_file, use_preprocessing=True, verbose=True)
        print(f"\n{'='*80}")
        print("EXTRACTED TEXT:")
        print(f"{'='*80}")
        print(result)
        print(f"{'='*80}\n")
    else:
        print("Usage: python extractor_OCR.py <image_or_pdf_file>")