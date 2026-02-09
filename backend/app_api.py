# backend/app_api.py

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import traceback
import tempfile
import shutil
from datetime import datetime
import io
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

>>>>>>> b96bf647f27bf548f370b28e47bcadc5e6bd465b
=======
# Import RAG pipeline
from rag_pipeline.clean_chunk import clean_text, chunk_text
from rag_pipeline.embed_store import build_faiss_index
from rag_pipeline.rag_query import ask_rag_improved  # Optimized for GPT-4o-mini
from rag_pipeline.extract_metadata import extract_metadata_with_llm  # Optimized metadata extraction
import supabase_helper as sb

# Import OCR with in-memory support
import cv2
import numpy as np
from PIL import Image
import pdfplumber

=======
>>>>>>> b96bf647f27bf548f370b28e47bcadc5e6bd465b

app = Flask(__name__)

# CORS configuration
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://vytara-official.vercel.app",
            "https://*.vercel.app",
            "https://sauncier-instigative-yolande.ngrok-free.dev"
        ],
        "methods": ["GET", "POST", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})


def log_step(step: str, status: str = "info", details: str = None):
    """Consistent logging"""
    symbols = {
<<<<<<< HEAD
        "start": "[START]",
        "success": "[SUCCESS]",
        "error": "[ERROR]",
        "warning": "[WARNING]",
        "info": "[INFO]"
    }
    symbol = symbols.get(status, "[•]")
=======
        "start": "🔄",
        "success": "✅",
        "error": "❌",
        "warning": "⚠️",
        "info": "ℹ️"
    }
    symbol = symbols.get(status, "•")
>>>>>>> b96bf647f27bf548f370b28e47bcadc5e6bd465b
    
    message = f"{symbol} {step}"
    if details:
        message += f": {details}"
    print(message, flush=True)


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
            "message": "Medical RAG API - Powered by GPT-4o-mini",
            "supabase": supabase_ok,
            "openai": openai_ok,
            "model": "gpt-4o-mini",
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
# PROCESS FILES (IN-MEMORY) - ALL FOLDERS
# ============================================

@app.route("/api/process-files", methods=["POST"])
def process_files():
    """Process user files - ALL folders but extract metadata"""
    print("\n" + "="*80, flush=True)
    log_step("PROCESS FILES (All Folders)", "start")
    print("="*80, flush=True)
    
    try:
        # Validate request
        data = request.get_json()
        
        if not data or "user_id" not in data:
            log_step("Validation", "error", "user_id required")
            return jsonify({
                "success": False,
                "error": "user_id is required"
            }), 400
        
        user_id = data["user_id"]
        folder_type = data.get("folder_type")  # Can be any folder
        
        log_step("Config", "info", f"User: {user_id}, Folder: {folder_type or 'ALL'}")
        
        # Get files from storage
        log_step("Fetching files", "start")
        files = sb.list_user_files(user_id, folder_type)
        
        if not files:
            log_step("Files", "warning", "No files in storage")
            
            # Clean up orphaned records
            try:
                query = sb.supabase.table('medical_reports_processed').delete().eq('user_id', user_id)
                if folder_type:
                    query = query.eq('folder_type', folder_type)
                result = query.execute()
                
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
                    sb.supabase.table('medical_reports_processed').delete().eq('id', rec['id']).execute()
                    reprocess_count += 1
                except Exception as e:
                    log_step("Delete failed", "error", str(e))
            else:
                filtered_records.append(rec)
        
        if reprocess_count > 0:
            log_step("Weak records", "success", f"Removed {reprocess_count} for reprocessing")
        
        existing_records = filtered_records
        
        # Build sets for comparison
        storage_paths = set(f"{user_id}/{folder_type or 'reports'}/{f.get('name')}" for f in files)
        existing_paths = set(r['file_path'] for r in existing_records)
        
        # Delete orphaned records
        orphaned = [r for r in existing_records if r['file_path'] not in storage_paths]
        deleted_count = 0
        
        if orphaned:
            log_step("Removing orphaned", "start")
            for record in orphaned:
                try:
                    sb.supabase.table('medical_reports_processed').delete().eq('id', record['id']).execute()
                    log_step("Deleted", "success", record['file_name'])
                    deleted_count += 1
                except Exception as e:
                    log_step("Delete failed", "error", str(e))
        
        # Process new files
        log_step("Processing new files", "start")
        
        results = []
        successful = 0
        failed = 0
        skipped = 0
        
        for idx, file_info in enumerate(files, 1):
            file_name = file_info.get('name')
            actual_folder = folder_type if folder_type else 'reports'
            file_path = f"{user_id}/{actual_folder}/{file_name}"
            
            print(f"\n{'─'*80}", flush=True)
            print(f"FILE {idx}/{len(files)}: {file_name}", flush=True)
            print(f"{'─'*80}", flush=True)
            
            # Skip if already processed
            if file_path in existing_paths:
                log_step("Status", "info", "Already processed (skipping)")
                results.append({
                    "file_name": file_name,
                    "status": "skipped",
                    "message": "Already processed"
                })
                skipped += 1
                continue
            
            log_step("Processing", "start", file_name)
            
            try:
                # Get file bytes (IN MEMORY)
                log_step("Fetch", "start", "Loading from Supabase")
                file_bytes = sb.get_file_bytes(file_path)
                log_step("Fetched", "success", f"{len(file_bytes)} bytes (in memory)")
                
                # Extract text from bytes
                file_ext = os.path.splitext(file_name)[1]
                log_step("OCR", "start")
                
                extracted_text = extract_text_from_bytes(file_bytes, file_ext)
                
                # Validate extraction
                if not extracted_text or len(extracted_text.strip()) < 50:
                    raise Exception(f"Insufficient text extracted: {len(extracted_text.strip())} chars")
                
                log_step("Extracted", "success", f"{len(extracted_text)} chars")
                
                # Extract metadata using LLM
                log_step("Metadata", "start")
                metadata = extract_metadata_with_llm(extracted_text, file_name)
                
                patient_name = metadata.get('patient_name')
                age = metadata.get('age')
                gender = metadata.get('gender')
                report_date = metadata.get('report_date')
                report_type = metadata.get('report_type')
                doctor_name = metadata.get('doctor_name')
                hospital_name = metadata.get('hospital_name')
                
                log_step("Metadata", "success", 
                        f"Patient: {patient_name}, Age: {age}, Type: {report_type}")
                
                # Save to database
                log_step("Saving", "start")
                record_id = sb.save_extracted_data(
                    user_id=user_id,
                    file_path=file_path,
                    file_name=file_name,
                    folder_type=actual_folder,
                    extracted_text=extracted_text,
                    patient_name=patient_name,
                    report_date=report_date,
                    age=age,
                    gender=gender,
                    report_type=report_type,
                    doctor_name=doctor_name,
                    hospital_name=hospital_name
                )
                
                log_step("Saved", "success", f"ID: {record_id}")
                
                results.append({
                    "file_name": file_name,
                    "status": "success",
                    "record_id": record_id,
                    "folder_type": actual_folder,
                    "patient_name": patient_name,
                    "report_date": report_date,
                    "report_type": report_type,
                    "text_length": len(extracted_text)
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
                result = sb.supabase.table('medical_summaries_cache').delete().eq('user_id', user_id).execute()
                cache_cleared = len(result.data) if result.data else 0
                log_step("Cache cleared", "success", f"{cache_cleared} entries")
            except Exception as e:
                log_step("Cache clear failed", "error", str(e))
        
        # Summary
        print(f"\n{'='*80}", flush=True)
        log_step("COMPLETE", "success")
        print(f"{'='*80}", flush=True)
        print(f"  Total: {len(files)}", flush=True)
<<<<<<< HEAD
        print(f"  [SUCCESS] Processed: {successful}", flush=True)
        print(f"  [SKIP] Skipped: {skipped}", flush=True)
        print(f"  [DELETE] Deleted: {deleted_count}", flush=True)
        print(f"  [FAIL] Failed: {failed}", flush=True)
=======
        print(f"  ✅ Processed: {successful}", flush=True)
        print(f"  ⏭️  Skipped: {skipped}", flush=True)
        print(f"  🗑️  Deleted: {deleted_count}", flush=True)
        print(f"  ❌ Failed: {failed}", flush=True)
>>>>>>> b96bf647f27bf548f370b28e47bcadc5e6bd465b
        print(f"{'='*80}\n", flush=True)
        
        return jsonify({
            "success": True,
            "message": f"Processed {successful} files, skipped {skipped}",
            "processed_count": successful,
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
# GENERATE SUMMARY (MEDICAL REPORTS ONLY)
# ============================================

@app.route("/api/generate-summary", methods=["POST"])
def generate_summary():
    """Generate medical summary - ONLY for medical reports folder"""
    print("\n" + "="*80, flush=True)
    log_step("GENERATE SUMMARY (Medical Reports Only)", "start")
    print("="*80, flush=True)
    
    # Create temp directory
    temp_dir = tempfile.mkdtemp(prefix="rag_")
    
    try:
        # Validate request
        data = request.get_json()
        
        if not data or "user_id" not in data:
            log_step("Validation", "error", "user_id required")
            return jsonify({
                "success": False,
                "error": "user_id is required"
            }), 400
        
        user_id = data["user_id"]
        use_cache = data.get("use_cache", True)
        force_regenerate = data.get("force_regenerate", False)
        
        # CRITICAL: Only allow 'reports' folder
        folder_type = 'reports'
        
        log_step("Config", "info", 
                f"User: {user_id}, Folder: {folder_type} (MEDICAL ONLY)")
        log_step("Temp dir", "info", temp_dir)
        
        # Get processed reports - ONLY from 'reports' folder
        log_step("Fetching medical reports", "start")
        reports = sb.get_processed_reports(user_id, folder_type='reports')
        
        if not reports:
            log_step("Reports", "error", "No medical reports found")
            return jsonify({
                "success": False,
                "error": "No medical reports found. Please process medical report files first.",
                "hint": "Only files in the 'reports' folder are summarized"
            }), 404
        
        log_step("Medical reports found", "success", f"{len(reports)} reports")
        
        # Validate that we only have medical reports
        non_medical = [r for r in reports if r.get('folder_type') != 'reports']
        if non_medical:
            log_step("Warning", "warning", f"Filtering out {len(non_medical)} non-medical files")
            reports = [r for r in reports if r.get('folder_type') == 'reports']
        
        # Compute signature
        log_step("Computing signature", "start")
        current_signature = sb.compute_signature_from_reports(reports)
        log_step("Signature", "success", current_signature[:16] + "...")
        
        # Check cache
        if use_cache and not force_regenerate:
            log_step("Checking cache", "start")
            cached = sb.get_cached_summary(user_id, 'reports', current_signature)
            
            if cached and cached.get('summary_text'):
                summary_text = cached['summary_text']
                
                if not summary_text.startswith('❌') and len(summary_text) > 100:
                    log_step("Cache", "success", "Using cached summary")
                    return jsonify({
                        "success": True,
                        "summary": summary_text,
                        "report_count": cached['report_count'],
                        "folder_type": 'reports',
                        "cached": True,
                        "generated_at": cached.get('generated_at'),
                        "model": "gpt-4o-mini"
                    }), 200
            
            log_step("Cache", "info", "Cache miss - generating new summary")
        
        # Create chunks
        log_step("Creating chunks", "start")
        all_chunks = []
        
        for idx, report in enumerate(reports, 1):
            extracted = report.get('extracted_text') or ""
            
            if not extracted.strip():
                log_step(f"Report {idx}", "warning", f"Empty text in {report.get('file_name')}")
                continue
            
            # Clean text
            cleaned = clean_text(extracted)
            
            # OPTIMIZED: Larger chunks for better context
            chunks = chunk_text(
                cleaned, 
                max_words=500,  # Increased for better context
                overlap_words=100  # Increased for continuity
            )
            
            print(f"  Report {idx}/{len(reports)}: {report.get('file_name')}", flush=True)
            print(f"    {len(extracted)} chars → {len(cleaned)} cleaned → {len(chunks)} chunks", flush=True)
            
            all_chunks.extend(chunks)
        
        log_step("Chunking", "success", f"{len(all_chunks)} total chunks")
        
        # Validate chunks
        if not all_chunks:
            log_step("Chunks", "error", "No valid chunks created")
            
            # Fallback: use raw text
            log_step("Fallback", "warning", "Using raw text as single chunk")
            combined = "\n\n".join(
                (r.get('extracted_text') or "").strip()
                for r in reports
            )
            
            if combined.strip() and len(combined.split()) >= 20:
                all_chunks = [combined]
                log_step("Fallback", "success", "Created fallback chunk")
            else:
                log_step("Fallback", "error", "Insufficient text in all reports")
                return jsonify({
                    "success": False,
                    "error": "Could not create chunks from reports. Text may be too short or corrupted."
                }), 500
        
        # Build FAISS index
        log_step("Building index", "start")
        try:
            index, chunks, vectorizer = build_faiss_index(all_chunks, temp_dir)
            log_step("Index", "success", "FAISS index ready (in-memory)")
            
        except Exception as e:
            log_step("Index", "error", str(e))
            traceback.print_exc()
            return jsonify({
                "success": False,
                "error": f"Failed to build search index: {str(e)}"
            }), 500
        
        # Generate summary with improved RAG
        log_step("Generating summary", "start")
        try:
            summary = ask_rag_improved(
                question="Analyze all medical test reports and provide a comprehensive summary with trends",
                temp_dir=temp_dir,
                folder_type='reports',
                num_reports=len(reports)
            )
            
            # Check for errors
            if summary.startswith("❌"):
                log_step("Summary", "error", summary)
                return jsonify({
                    "success": False,
                    "error": summary
                }), 500
            
            log_step("Summary", "success", f"{len(summary)} chars")
            
        except Exception as e:
            log_step("Summary", "error", str(e))
            traceback.print_exc()
            return jsonify({
                "success": False,
                "error": f"Failed to generate summary: {str(e)}"
            }), 500
        
        # Cache summary
        log_step("Caching", "start")
        try:
            sb.save_summary_cache(
                user_id,
                'reports',
                summary,
                len(reports),
                current_signature
            )
            log_step("Cached", "success")
        except Exception as e:
            log_step("Cache save", "warning", f"Failed: {str(e)}")
        
        # Extract metadata for response
        from rag_pipeline.rag_query import extract_patient_info
        
        sample_text = "\n".join([
            r.get('extracted_text', '')[:500]
            for r in reports[:3]
        ])
        
        patient_info = extract_patient_info(sample_text)
        
        # Summary
        print(f"\n{'='*80}", flush=True)
        log_step("COMPLETE", "success")
        print(f"{'='*80}", flush=True)
        print(f"  Reports: {len(reports)}", flush=True)
        print(f"  Patient: {patient_info['name']}", flush=True)
        print(f"  Folder: Medical Reports Only", flush=True)
        print(f"  Summary: {len(summary)} chars", flush=True)
        print(f"  Model: gpt-4o-mini", flush=True)
        print(f"{'='*80}\n", flush=True)
        
        return jsonify({
            "success": True,
            "summary": summary,
            "report_count": len(reports),
            "folder_type": 'reports',
            "patient_name": patient_info['name'],
            "patient_age": patient_info.get('age'),
            "patient_gender": patient_info.get('gender'),
            "dates": patient_info.get('dates', []),
            "cached": False,
            "model": "gpt-4o-mini"
        }), 200
        
    except Exception as e:
        log_step("FATAL ERROR", "error", str(e))
        traceback.print_exc()
        
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500
    
    finally:
        # Always clean up temp directory
        try:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
                log_step("Cleanup", "success", f"Removed {temp_dir}")
        except Exception as e:
            log_step("Cleanup", "warning", f"Failed to clean temp dir: {e}")


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
                "report_type": r.get('report_type'),
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
<<<<<<< HEAD
# CHAT ENDPOINT FOR FAQ ASSISTANT
# ============================================

@app.route("/api/chat", methods=["POST"])
def chat_endpoint():
    """Handle chat messages for FAQ assistant"""
    try:
        data = request.get_json()
        if not data or "message" not in data:
            return jsonify({
                "success": False,
                "error": "Message is required"
            }), 400

        message = data["message"]
        # Always use English
        lang = "en"

        # Try FAQ engine first
        faq_result = find_faq_match(message, lang)

        if faq_result.get("matched"):
            reply = faq_result["answer"]
        else:
            # Check for emergency keywords
            if any(word in message.lower() for word in ["pain", "emergency"]):
                reply = "For medical emergencies, please contact a doctor or emergency services."
            else:
                # Fallback to LLM
                reply = get_reply(message)

        return jsonify({
            "success": True,
            "reply": reply
        }), 200

    except Exception as e:
        log_step("Chat Error", "error", str(e))
        return jsonify({
            "success": False,
            "error": str(e),
            "reply": "I'm sorry, I couldn't process your request right now. Please try again."
        }), 500


# ============================================
=======
>>>>>>> b96bf647f27bf548f370b28e47bcadc5e6bd465b
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


# ============================================
# MAIN
# ============================================

if __name__ == "__main__":
    print("\n" + "="*80, flush=True)
<<<<<<< HEAD
<<<<<<< HEAD
    print("MEDICAL RAG API SERVER - IN-MEMORY PROCESSING", flush=True)
    print("="*80, flush=True)
    print("\nEndpoints:", flush=True)
=======
    print("🚀 MEDICAL RAG API SERVER - IN-MEMORY PROCESSING", flush=True)
=======
    print("🚀 MEDICAL RAG API SERVER", flush=True)
    print("   Powered by: OpenAI GPT-4o-mini", flush=True)
    print("   Medical Reports Only Summarization", flush=True)
>>>>>>> 9d13d9f2975196b316190040cce6fb78678655c7
    print("="*80, flush=True)
    print("\n📡 Endpoints:", flush=True)
>>>>>>> b96bf647f27bf548f370b28e47bcadc5e6bd465b
    print("  GET    /api/health", flush=True)
    print("  POST   /api/process-files", flush=True)
    print("  POST   /api/generate-summary  (Medical reports only)", flush=True)
    print("  GET    /api/reports/<user_id>", flush=True)
    print("  DELETE /api/clear-cache/<user_id>", flush=True)
    print("  DELETE /api/clear/<user_id>", flush=True)
<<<<<<< HEAD
    print("\nFeatures:", flush=True)
    print("  [OK] Zero local file storage", flush=True)
    print("  [OK] Complete in-memory processing", flush=True)
    print("  [OK] Stateless temp directories", flush=True)
    print("  [OK] Fixed embedding dimensions", flush=True)
=======
    print("\n💡 Features:", flush=True)
<<<<<<< HEAD
    print("  ✓ Zero local file storage", flush=True)
    print("  ✓ Complete in-memory processing", flush=True)
    print("  ✓ Stateless temp directories", flush=True)
    print("  ✓ Fixed embedding dimensions", flush=True)
>>>>>>> b96bf647f27bf548f370b28e47bcadc5e6bd465b
=======
    print("  ✓ Medical reports only summarization", flush=True)
    print("  ✓ Adaptive context sizing", flush=True)
    print("  ✓ GPT-4o-mini: Fast, accurate, cost-effective", flush=True)
    print("  ✓ Better trend analysis", flush=True)
    print("  ✓ Scales from 1 to many reports", flush=True)
>>>>>>> 9d13d9f2975196b316190040cce6fb78678655c7
    print("\n" + "="*80 + "\n", flush=True)
    
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)