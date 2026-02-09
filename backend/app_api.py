# backend/app_api.py

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
import os
import json
import re
import hashlib
import traceback
from datetime import datetime
import io

# Import extraction/summarization pipeline
from rag_pipeline.openai_extractor import extract_report_from_text
from rag_pipeline.openai_summarizer import generate_summary as generate_openai_summary
import supabase_helper as sb

# Import OCR with in-memory support
import cv2
import numpy as np
from PIL import Image
import pdfplumber


app = Flask(__name__)

# CORS configuration
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://vytara-official.vercel.app",
            "https://*.vercel.app",
            "https://sauncier-instigative-yolande.ngrok-free.dev",
            "https://testing-9obu.onrender.com"
        ],
        "methods": ["GET", "POST", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})


def log_step(step: str, status: str = "info", details: str = None):
    """Consistent logging"""
    symbols = {
        "start": "[START]",
        "success": "[OK]",
        "error": "[ERROR]",
        "warning": "[WARN]",
        "info": "[INFO]"
    }
    symbol = symbols.get(status, "[LOG]")
    
    message = f"{symbol} {step}"
    if details:
        message += f": {details}"
    try:
        print(message, flush=True)
    except UnicodeEncodeError:
        safe = message.encode("ascii", "replace").decode("ascii")
        print(safe, flush=True)


def parse_structured_payload(value):
    """Best-effort parser for structured extraction payload."""
    if value is None:
        return None
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            return None
        return parsed if isinstance(parsed, dict) else None
    return None


def extract_metadata_from_structured(structured_payload):
    """Extract patient name/report date from canonical structured payload."""
    payload = parse_structured_payload(structured_payload) or {}
    report_block = payload.get("report") if isinstance(payload.get("report"), dict) else {}
    patient_block = report_block.get("patient") if isinstance(report_block.get("patient"), dict) else {}

    patient_name = (patient_block.get("name") or "").strip() if isinstance(patient_block, dict) else ""
    report_date = (report_block.get("report_date") or "").strip() if isinstance(report_block, dict) else ""
    return (patient_name or None), (report_date or None)


def extract_patient_name(text: str) -> str:
    """Extract patient name from medical text."""
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
    """Extract report dates from text chunks."""
    dates = []
    date_patterns = [
        r"(\d{1,2}[/-]\d{1,2}[/-]\d{4})",
        r"(\d{4}[/-]\d{1,2}[/-]\d{1,2})",
        r"Date\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})",
        r"Registered\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})",
    ]

    full_text = "\n".join(chunks)
    for pattern in date_patterns:
        dates.extend(re.findall(pattern, full_text, re.IGNORECASE))

    seen = set()
    unique = []
    for date in dates:
        if date not in seen:
            seen.add(date)
            unique.append(date)
    return unique[:10]


def build_summary_input(reports: list):
    """Build summarizer input from processed report records."""
    documents = []
    for report in reports:
        structured_data = parse_structured_payload(report.get('structured_data_json'))
        documents.append({
            "filename": report.get('file_name'),
            "uploadedAt": report.get('processed_at'),
            "extractionStatus": "extracted" if structured_data else report.get('processing_status', 'completed'),
            "extractedText": report.get('extracted_text') or "",
            "structuredData": structured_data,
        })
    return {"documents": documents}


def compute_file_hash(file_bytes: bytes) -> str:
    """Stable hash of source file content."""
    return hashlib.sha256(file_bytes).hexdigest()


# ============================================
# IN-MEMORY OCR FUNCTIONS
# ============================================

def extract_text_from_bytes(file_bytes: bytes, file_extension: str) -> str:
    """
    Extract text from file bytes (NO file I/O)
    
    Args:
        file_bytes: File content as bytes
        file_extension: File extension (.pdf, .jpg, etc.)
    
    Returns:
        Extracted text
    """
    log_step("OCR", "start", f"Processing {file_extension}")
    
    try:
        # PDF files
        if file_extension.lower() == '.pdf':
            # Try pdfplumber first (for text-based PDFs)
            try:
                bytes_io = io.BytesIO(file_bytes)
                
                with pdfplumber.open(bytes_io) as pdf:
                    text = ""
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n\n"
                    
                    if text.strip() and len(text.strip()) > 50:
                        log_step("PDF text", "success", f"{len(text)} chars")
                        return text.strip()
                    else:
                        log_step("PDF", "warning", "Insufficient text - might be scanned")
                        
            except Exception as e:
                log_step("pdfplumber", "warning", f"Failed: {e}")
            
            # For scanned PDFs - use pdf2image + OCR
            try:
                from pdf2image import convert_from_bytes
                import pytesseract
                
                images = convert_from_bytes(file_bytes, dpi=300)
                log_step("PDF images", "success", f"{len(images)} pages")
                
                all_text = []
                for i, img in enumerate(images, 1):
                    img_array = np.array(img)
                    
                    # Convert to grayscale
                    if len(img_array.shape) == 3:
                        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
                    else:
                        gray = img_array
                    
                    # OCR
                    page_text = pytesseract.image_to_string(
                        gray,
                        lang='eng',
                        config='--oem 3 --psm 6'
                    )
                    
                    if page_text.strip():
                        all_text.append(page_text.strip())
                
                combined = "\n\n".join(all_text)
                
                if combined.strip():
                    log_step("PDF OCR", "success", f"{len(combined)} chars")
                    return combined
                    
            except Exception as e:
                log_step("PDF OCR", "error", str(e))
        
        # Image files
        elif file_extension.lower() in ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif']:
            try:
                import pytesseract
                
                # Load image from bytes
                bytes_io = io.BytesIO(file_bytes)
                img = Image.open(bytes_io)
                img_array = np.array(img)
                
                # Convert to grayscale
                if len(img_array.shape) == 3:
                    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
                else:
                    gray = img_array
                
                # OCR
                text = pytesseract.image_to_string(
                    gray,
                    lang='eng',
                    config='--oem 3 --psm 6'
                )
                
                if text.strip():
                    log_step("Image OCR", "success", f"{len(text)} chars")
                    return text.strip()
                    
            except Exception as e:
                log_step("Image OCR", "error", str(e))
        
        log_step("OCR", "error", "No text extracted")
        return ""
        
    except Exception as e:
        log_step("OCR", "error", str(e))
        traceback.print_exc()
        return ""


# ============================================
# HEALTH CHECK
# ============================================

@app.route("/api/health", methods=["GET"])
def health_check():
    """API health check"""
    log_step("Health check", "start")
    
    try:
        supabase_ok = True
        openai_ok = bool(os.getenv("OPENAI_API_KEY"))
        
        try:
            sb.supabase.table('medical_reports_processed').select('id').limit(1).execute()
            log_step("Supabase", "success", "Connected")
        except Exception as e:
            supabase_ok = False
            log_step("Supabase", "error", str(e))
        
        if not openai_ok:
            log_step("OpenAI API", "warning", "API key not set")
        
        status = "healthy" if (supabase_ok and openai_ok) else "degraded"
        
        return jsonify({
            "status": status,
            "message": "Medical Reports API - In-Memory Processing",
            "supabase": supabase_ok,
            "openai": openai_ok,
            "mode": "stateless_in_memory",
            "timestamp": datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        log_step("Health check", "error", str(e))
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 500


# ============================================
# PROCESS FILES (IN-MEMORY)
# ============================================

@app.route("/api/process-files", methods=["POST"])
def process_files():
    """Process user files - completely in memory, NO local storage"""
    print("\n" + "="*80, flush=True)
    log_step("PROCESS FILES", "start")
    print("="*80, flush=True)
    
    try:
        # Validate request
        data = request.get_json(silent=True)
        
        if not data or "user_id" not in data:
            log_step("Validation", "error", "user_id required")
            return jsonify({
                "success": False,
                "error": "user_id is required"
            }), 400
        
        user_id = data["user_id"]
        folder_type = data.get("folder_type", "reports")
        
        log_step("Config", "info", f"User: {user_id}, Folder: {folder_type}")
        
        # Get files from storage
        log_step("Fetching files", "start")
        files = sb.list_user_files(user_id, folder_type)
        
        if not files:
            log_step("Files", "warning", "No files in storage")
            
            # Clean up orphaned records
            try:
                result = sb.supabase.table('medical_reports_processed').delete().eq(
                    'user_id', user_id
                ).eq('folder_type', folder_type).execute()
                
                deleted = len(result.data) if result.data else 0
                log_step("Cleanup", "success", f"Deleted {deleted} orphaned records")
            except Exception as e:
                log_step("Cleanup", "error", str(e))
            
            return jsonify({
                "success": False,
                "error": "No files found for this user"
            }), 404
        
        log_step("Files found", "success", f"{len(files)} files")
        
        # Get existing processed reports
        log_step("Checking processed", "start")
        existing_records = sb.get_processed_reports(user_id, folder_type)
        
        # Filter weak records
        filtered_records = []
        reprocess_count = 0
        
        for rec in existing_records:
            text = (rec.get('extracted_text') or "").strip()
            
            if len(text) < 50:
                try:
                    log_step("Removing weak", "warning", f"{rec['file_name']} ({len(text)} chars)")
                    sb.supabase.table('medical_reports_processed').delete().eq(
                        'id', rec['id']
                    ).execute()
                    reprocess_count += 1
                except Exception as e:
                    log_step("Delete failed", "error", str(e))
            else:
                filtered_records.append(rec)
        
        if reprocess_count > 0:
            log_step("Weak records", "success", f"Removed {reprocess_count} for reprocessing")
        
        existing_records = filtered_records
        
        # Build maps for comparison
        storage_paths = set(f"{user_id}/{folder_type}/{f.get('name')}" for f in files)
        existing_by_path = {r['file_path']: r for r in existing_records}
        existing_by_hash = {}
        for record in existing_records:
            source_hash = (record.get('source_file_hash') or '').strip()
            if source_hash and source_hash not in existing_by_hash:
                existing_by_hash[source_hash] = record
        
        # Delete orphaned records
        orphaned = [r for r in existing_records if r['file_path'] not in storage_paths]
        deleted_count = 0
        
        if orphaned:
            log_step("Removing orphaned", "start")
            for record in orphaned:
                try:
                    sb.supabase.table('medical_reports_processed').delete().eq(
                        'id', record['id']
                    ).execute()
                    log_step("Deleted", "success", record['file_name'])
                    deleted_count += 1
                    existing_by_path.pop(record['file_path'], None)
                except Exception as e:
                    log_step("Delete failed", "error", str(e))
        
        # Process new files
        log_step("Processing new files", "start")
        
        results = []
        successful = 0
        failed = 0
        skipped = 0
        deduplicated = 0
        
        for idx, file_info in enumerate(files, 1):
            file_name = file_info.get('name')
            file_path = f"{user_id}/{folder_type}/{file_name}"
            
            print(f"\n{'─'*80}", flush=True)
            print(f"FILE {idx}/{len(files)}: {file_name}", flush=True)
            print(f"{'─'*80}", flush=True)

            try:
                existing_record = existing_by_path.get(file_path)

                # Fast path for legacy records with no source hash stored yet.
                if existing_record and not (existing_record.get('source_file_hash') or "").strip():
                    log_step("Status", "info", "Already processed (legacy skip)")
                    results.append({
                        "file_name": file_name,
                        "status": "skipped",
                        "message": "Already processed"
                    })
                    skipped += 1
                    continue

                # Get file bytes (IN MEMORY - NO LOCAL STORAGE)
                log_step("Fetch", "start", "Loading from Supabase")
                file_bytes = sb.get_file_bytes(file_path)
                log_step("Fetched", "success", f"{len(file_bytes)} bytes (in memory)")

                source_file_hash = compute_file_hash(file_bytes)

                # Skip unchanged files when path exists and content hash matches.
                if existing_record:
                    existing_hash = (existing_record.get('source_file_hash') or "").strip()
                    if existing_hash and existing_hash == source_file_hash:
                        log_step("Status", "info", "Already processed (hash match)")
                        results.append({
                            "file_name": file_name,
                            "status": "skipped",
                            "message": "Already processed",
                            "source_file_hash": source_file_hash,
                        })
                        skipped += 1
                        continue

                # Reuse extracted output if same content hash exists in another record.
                duplicate_record = existing_by_hash.get(source_file_hash)
                if duplicate_record and duplicate_record.get('file_path') != file_path:
                    log_step("Deduplicate", "start", f"Reusing {duplicate_record.get('file_name')}")

                    duplicated_text = duplicate_record.get('extracted_text') or ""
                    structured_payload = parse_structured_payload(duplicate_record.get('structured_data_json'))
                    structured_hash = duplicate_record.get('structured_data_hash') or ""
                    if structured_payload and not structured_hash:
                        structured_hash = sb.compute_structured_data_hash(structured_payload)

                    patient_name = duplicate_record.get('patient_name') or extract_patient_name(duplicated_text)
                    report_date = duplicate_record.get('report_date')
                    if not report_date:
                        fallback_dates = extract_report_dates([duplicated_text])
                        report_date = fallback_dates[0] if fallback_dates else None

                    record_id = sb.save_extracted_data(
                        user_id=user_id,
                        file_path=file_path,
                        file_name=file_name,
                        folder_type=folder_type,
                        extracted_text=duplicated_text,
                        patient_name=patient_name,
                        report_date=report_date,
                        structured_data_json=structured_payload,
                        structured_data_hash=structured_hash,
                        source_file_hash=source_file_hash
                    )

                    existing_by_path[file_path] = {
                        "file_path": file_path,
                        "file_name": file_name,
                        "source_file_hash": source_file_hash,
                    }
                    deduplicated += 1
                    successful += 1

                    results.append({
                        "file_name": file_name,
                        "status": "deduplicated",
                        "record_id": record_id,
                        "message": f"Reused extraction from {duplicate_record.get('file_name')}",
                        "source_file_hash": source_file_hash,
                    })
                    continue

                log_step("Processing", "start", file_name)
                
                # Extract text from bytes (IN MEMORY)
                file_ext = os.path.splitext(file_name)[1]
                log_step("OCR", "start")
                
                extracted_text = extract_text_from_bytes(file_bytes, file_ext)
                
                # Validate extraction
                if not extracted_text or len(extracted_text.strip()) < 50:
                    raise Exception(f"Insufficient text extracted: {len(extracted_text.strip())} chars")
                
                log_step("Extracted", "success", f"{len(extracted_text)} chars")
                
                # Structured extraction using the tested extractor model.
                structured_payload = None
                structured_hash = ""
                try:
                    log_step("Structured extraction", "start")
                    structured_raw = extract_report_from_text(extracted_text)
                    structured_payload = parse_structured_payload(structured_raw)
                    if not structured_payload:
                        raise ValueError("Extractor did not return valid JSON")
                    structured_hash = sb.compute_structured_data_hash(structured_payload)
                    metric_count = len(structured_payload.get("metrics", []))
                    log_step("Structured extraction", "success", f"{metric_count} metrics")
                except Exception as e:
                    log_step("Structured extraction", "warning", str(e))
                
                # Extract metadata (prefer structured payload, fallback to regex extraction).
                log_step("Metadata", "start")
                patient_name, report_date = extract_metadata_from_structured(structured_payload)
                if not patient_name:
                    patient_name = extract_patient_name(extracted_text)
                if not report_date:
                    report_dates = extract_report_dates([extracted_text])
                    report_date = report_dates[0] if report_dates else None
                
                log_step("Metadata", "success", f"Patient: {patient_name}, Date: {report_date}")
                
                # Save to database
                log_step("Saving", "start")
                record_id = sb.save_extracted_data(
                    user_id=user_id,
                    file_path=file_path,
                    file_name=file_name,
                    folder_type=folder_type,
                    extracted_text=extracted_text,
                    patient_name=patient_name,
                    report_date=report_date,
                    structured_data_json=structured_payload,
                    structured_data_hash=structured_hash,
                    source_file_hash=source_file_hash
                )
                
                log_step("Saved", "success", f"ID: {record_id}")

                existing_by_path[file_path] = {
                    "file_path": file_path,
                    "file_name": file_name,
                    "source_file_hash": source_file_hash,
                }
                if source_file_hash and source_file_hash not in existing_by_hash:
                    existing_by_hash[source_file_hash] = {
                        "file_name": file_name,
                        "file_path": file_path,
                        "extracted_text": extracted_text,
                        "patient_name": patient_name,
                        "report_date": report_date,
                        "structured_data_json": structured_payload,
                        "structured_data_hash": structured_hash,
                        "source_file_hash": source_file_hash,
                    }
                
                results.append({
                    "file_name": file_name,
                    "status": "success",
                    "record_id": record_id,
                    "patient_name": patient_name,
                    "report_date": report_date,
                    "text_length": len(extracted_text),
                    "structured_available": bool(structured_payload),
                    "source_file_hash": source_file_hash,
                })
                successful += 1
                
            except Exception as e:
                log_step("Failed", "error", f"{file_name}: {str(e)}")
                traceback.print_exc()
                
                results.append({
                    "file_name": file_name,
                    "status": "failed",
                    "error": str(e)
                })
                failed += 1
        
        # Clear cache if anything changed
        if deleted_count > 0 or successful > 0:
            log_step("Clearing cache", "start")
            try:
                result = sb.supabase.table('medical_summaries_cache').delete().eq(
                    'user_id', user_id
                ).execute()
                
                cache_cleared = len(result.data) if result.data else 0
                log_step("Cache cleared", "success", f"{cache_cleared} entries")
            except Exception as e:
                log_step("Cache clear failed", "error", str(e))
        
        # Summary
        print(f"\n{'='*80}", flush=True)
        log_step("COMPLETE", "success")
        print(f"{'='*80}", flush=True)
        print(f"  Total: {len(files)}", flush=True)
        print(f"  ✅ Processed: {successful}", flush=True)
        print(f"  ♻️  Deduplicated: {deduplicated}", flush=True)
        print(f"  ⏭️  Skipped: {skipped}", flush=True)
        print(f"  🗑️  Deleted: {deleted_count}", flush=True)
        print(f"  ❌ Failed: {failed}", flush=True)
        print(f"{'='*80}\n", flush=True)
        
        return jsonify({
            "success": True,
            "message": f"Processed {successful} files, skipped {skipped}",
            "processed_count": successful,
            "deduplicated_count": deduplicated,
            "skipped_count": skipped,
            "deleted_count": deleted_count,
            "failed_count": failed,
            "total_files": len(files),
            "results": results
        }), 200
        
    except Exception as e:
        log_step("FATAL ERROR", "error", str(e))
        traceback.print_exc()
        
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500


# ============================================
# GENERATE SUMMARY (IN-MEMORY)
# ============================================

@app.route("/api/generate-summary", methods=["POST"])
def generate_summary():
    """Generate medical summary using stored extracted text and structured data."""
    print("\n" + "="*80, flush=True)
    log_step("GENERATE SUMMARY", "start")
    print("="*80, flush=True)

    try:
        # Validate request
        data = request.get_json(silent=True)
        
        if not data or "user_id" not in data:
            log_step("Validation", "error", "user_id required")
            return jsonify({
                "success": False,
                "error": "user_id is required"
            }), 400
        
        user_id = data["user_id"]
        folder_type = data.get("folder_type")
        use_cache = data.get("use_cache", True)
        force_regenerate = data.get("force_regenerate", False)
        max_new_structured_extractions = data.get("max_new_structured_extractions", 5)
        try:
            max_new_structured_extractions = max(0, int(max_new_structured_extractions))
        except (TypeError, ValueError):
            max_new_structured_extractions = 5
        
        log_step("Config", "info", f"User: {user_id}, Cache: {use_cache}, Force: {force_regenerate}")
        
        # Get processed reports
        log_step("Fetching reports", "start")
        reports = sb.get_processed_reports(user_id, folder_type)
        
        if not reports:
            log_step("Reports", "error", "No processed reports found")
            return jsonify({
                "success": False,
                "error": "No processed reports found. Please process files first.",
                "hint": "Call POST /api/process-files first"
            }), 404
        
        log_step("Reports found", "success", f"{len(reports)} reports")
        
        # Compute signature
        log_step("Computing signature", "start")
        current_signature = sb.compute_signature_from_reports(reports)
        log_step("Signature", "success", current_signature[:16] + "...")
        
        # Check cache
        if use_cache and not force_regenerate:
            log_step("Checking cache", "start")
            cached = sb.get_cached_summary(user_id, folder_type, current_signature)
            
            if cached and cached.get('summary_text'):
                summary_text = cached['summary_text']
                
                if not summary_text.startswith('❌') and len(summary_text) > 100:
                    log_step("Cache", "success", "Using cached summary")
                    return jsonify({
                        "success": True,
                        "summary": summary_text,
                        "report_count": cached['report_count'],
                        "cached": True,
                        "generated_at": cached.get('generated_at')
                    }), 200
            
            log_step("Cache", "info", "Cache miss - generating new summary")

        # Backfill missing structured extraction on existing records (bounded per request).
        backfilled = 0
        for report in reports:
            if backfilled >= max_new_structured_extractions:
                break

            if parse_structured_payload(report.get('structured_data_json')):
                continue

            extracted_text = (report.get('extracted_text') or "").strip()
            if len(extracted_text) < 50:
                continue

            try:
                log_step("Backfill structured", "start", report.get('file_name'))
                structured_raw = extract_report_from_text(extracted_text)
                structured_payload = parse_structured_payload(structured_raw)
                if not structured_payload:
                    raise ValueError("Extractor did not return valid JSON")

                structured_hash = sb.compute_structured_data_hash(structured_payload)
                structured_patient, structured_date = extract_metadata_from_structured(structured_payload)

                sb.save_extracted_data(
                    user_id=user_id,
                    file_path=report.get('file_path'),
                    file_name=report.get('file_name'),
                    folder_type=report.get('folder_type') or folder_type or 'reports',
                    extracted_text=report.get('extracted_text') or "",
                    patient_name=structured_patient or report.get('patient_name'),
                    report_date=structured_date or report.get('report_date'),
                    structured_data_json=structured_payload,
                    structured_data_hash=structured_hash,
                    source_file_hash=report.get('source_file_hash')
                )

                report['structured_data_json'] = structured_payload
                report['structured_data_hash'] = structured_hash
                if structured_patient:
                    report['patient_name'] = structured_patient
                if structured_date:
                    report['report_date'] = structured_date

                backfilled += 1
                log_step("Backfill structured", "success", report.get('file_name'))
            except Exception as e:
                log_step("Backfill structured", "warning", f"{report.get('file_name')}: {e}")

        if backfilled > 0:
            # Refresh to include DB-updated timestamps/hashes for stable cache signatures.
            reports = sb.get_processed_reports(user_id, folder_type)

        # Build summarizer input from stored report records.
        summary_input = build_summary_input(reports)
        if not summary_input.get("documents"):
            return jsonify({
                "success": False,
                "error": "No report documents available for summarization."
            }), 500

        # Generate summary with the tested summarizer model.
        log_step("Generating summary", "start")
        try:
            summary = generate_openai_summary(summary_input)
        except Exception as e:
            log_step("Summary", "error", str(e))
            traceback.print_exc()
            return jsonify({
                "success": False,
                "error": f"Failed to generate summary: {str(e)}"
            }), 500

        if not isinstance(summary, str) or not summary.strip():
            return jsonify({
                "success": False,
                "error": "Summary generation returned empty output."
            }), 500

        summary = summary.strip()
        log_step("Summary", "success", f"{len(summary)} chars")

        # Signature may change after structured backfill; recompute before caching.
        current_signature = sb.compute_signature_from_reports(reports)
        
        # Cache summary
        log_step("Caching", "start")
        try:
            sb.save_summary_cache(
                user_id,
                folder_type or 'all',
                summary,
                len(reports),
                current_signature
            )
            log_step("Cached", "success")
        except Exception as e:
            log_step("Cache save", "warning", f"Failed: {str(e)}")
        
        # Extract metadata for response
        patient_names = []
        seen_patients = set()
        dates = []
        seen_dates = set()

        for report in reports:
            structured_patient, structured_date = extract_metadata_from_structured(
                report.get('structured_data_json')
            )

            patient_name = (
                report.get('patient_name')
                or structured_patient
                or extract_patient_name(report.get('extracted_text') or "")
            )
            report_date = report.get('report_date') or structured_date
            if not report_date:
                fallback_dates = extract_report_dates([report.get('extracted_text') or ""])
                report_date = fallback_dates[0] if fallback_dates else None

            if patient_name and patient_name not in seen_patients:
                patient_names.append(patient_name)
                seen_patients.add(patient_name)
            if report_date and report_date not in seen_dates:
                dates.append(report_date)
                seen_dates.add(report_date)
        
        # Summary
        print(f"\n{'='*80}", flush=True)
        log_step("COMPLETE", "success")
        print(f"{'='*80}", flush=True)
        print(f"  Reports: {len(reports)}", flush=True)
        print(f"  Patients: {', '.join(patient_names)}", flush=True)
        print(f"  Dates: {', '.join(sorted(dates)[:5]) if dates else 'None'}", flush=True)
        print(f"  Summary: {len(summary)} chars", flush=True)
        print(f"{'='*80}\n", flush=True)
        
        return jsonify({
            "success": True,
            "summary": summary,
            "report_count": len(reports),
            "patient_names": patient_names,
            "dates": sorted(dates),
            "structured_backfilled": backfilled,
            "cached": False
        }), 200
        
    except Exception as e:
        log_step("FATAL ERROR", "error", str(e))
        traceback.print_exc()
        
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500


# ============================================
# GET REPORTS LIST
# ============================================

@app.route("/api/reports/<user_id>", methods=["GET"])
def get_reports(user_id):
    """Get list of processed reports"""
    log_step("GET REPORTS", "start", user_id)
    
    try:
        folder_type = request.args.get('folder_type')
        reports = sb.get_processed_reports(user_id, folder_type)
        
        # Simplify for list view
        simplified = []
        for r in reports:
            simplified.append({
                "id": r['id'],
                "file_name": r['file_name'],
                "folder_type": r['folder_type'],
                "patient_name": r.get('patient_name'),
                "report_date": r.get('report_date'),
                "processing_status": r['processing_status'],
                "processed_at": r.get('processed_at'),
                "text_length": len(r.get('extracted_text') or "")
            })
        
        log_step("Reports", "success", f"{len(simplified)} reports")
        
        return jsonify({
            "success": True,
            "reports": simplified,
            "count": len(simplified)
        }), 200
        
    except Exception as e:
        log_step("Error", "error", str(e))
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================
# CLEAR CACHE
# ============================================

@app.route("/api/clear-cache/<user_id>", methods=["DELETE"])
def clear_cache(user_id):
    """Clear cached summaries"""
    log_step("CLEAR CACHE", "start", user_id)
    
    try:
        deleted = sb.clear_user_cache(user_id)
        log_step("Cache cleared", "success", f"{deleted} entries")
        
        return jsonify({
            "success": True,
            "message": f"Cache cleared for user {user_id}",
            "entries_deleted": deleted
        }), 200
        
    except Exception as e:
        log_step("Error", "error", str(e))
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================
# CLEAR ALL DATA
# ============================================

@app.route("/api/clear/<user_id>", methods=["DELETE"])
def clear_user_data(user_id):
    """Clear all processed data"""
    log_step("CLEAR DATA", "start", user_id)
    
    try:
        deleted = sb.clear_user_data(user_id)
        log_step("Data cleared", "success", f"{deleted} records")
        
        return jsonify({
            "success": True,
            "message": f"Cleared data for user {user_id}",
            "records_deleted": deleted
        }), 200
        
    except Exception as e:
        log_step("Error", "error", str(e))
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================
# ERROR HANDLERS
# ============================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "success": False,
        "error": "Endpoint not found"
    }), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "success": False,
        "error": "Internal server error"
    }), 500


@app.errorhandler(Exception)
def handle_unexpected_exception(error):
    """Ensure all uncaught exceptions return JSON, even in production."""
    if isinstance(error, HTTPException):
        return jsonify({
            "success": False,
            "error": error.description or str(error)
        }), (error.code or 500)

    log_step("Unhandled exception", "error", str(error))
    traceback.print_exc()
    return jsonify({
        "success": False,
        "error": "Internal server error"
    }), 500


# ============================================
# MAIN
# ============================================

if __name__ == "__main__":
    print("\n" + "="*80, flush=True)
    print("🚀 MEDICAL REPORTS API SERVER - IN-MEMORY PROCESSING", flush=True)
    print("="*80, flush=True)
    print("\n📡 Endpoints:", flush=True)
    print("  GET    /api/health", flush=True)
    print("  POST   /api/process-files", flush=True)
    print("  POST   /api/generate-summary", flush=True)
    print("  GET    /api/reports/<user_id>", flush=True)
    print("  DELETE /api/clear-cache/<user_id>", flush=True)
    print("  DELETE /api/clear/<user_id>", flush=True)
    print("\n💡 Features:", flush=True)
    print("  ✓ Zero local file storage", flush=True)
    print("  ✓ Complete in-memory processing", flush=True)
    print("  ✓ OpenAI structured extraction", flush=True)
    print("  ✓ OpenAI clinical-style summarization", flush=True)
    print("\n" + "="*80 + "\n", flush=True)
    
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)
