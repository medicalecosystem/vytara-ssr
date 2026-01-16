# app_api.py

# Flask REST API for Medical Report RAG System
# Converts existing Flask app to JSON API for Next.js integration

# app_api.py

# Flask REST API for Medical Report RAG System
# Converts existing Flask app to JSON API for Next.js integration

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import traceback
from datetime import datetime

# Import your existing RAG pipeline
from rag_pipeline.extractor_OCR import extract_text_universal
from rag_pipeline.clean_chunk import clean_text, chunk_text
from rag_pipeline.key_points import extract_key_points
from rag_pipeline.embed_store import build_faiss_index
from rag_pipeline.rag_query import ask_rag
import supabase_helper as sb

app = Flask(__name__)
# CORS(app)  # Enable CORS for Next.js
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
        "methods": ["GET", "POST", "DELETE"],
        "allow_headers": ["Content-Type"]
    }
})

TEMP_FOLDER = "temp_processing"
os.makedirs(TEMP_FOLDER, exist_ok=True)

# ============================================
# HEALTH CHECK ENDPOINT
# ============================================

@app.route("/api/health", methods=["GET"])
def health_check():
    """Check if API is running and connected to Supabase"""
    try:
        # Test Supabase connection
        supabase_ok = True
        try:
            sb.supabase.table('medical_reports_processed').select('id').limit(1).execute()
        except:
            supabase_ok = False
        
        return jsonify({
            "status": "healthy" if supabase_ok else "degraded",
            "message": "Medical RAG API is running",
            "supabase_connected": supabase_ok,
            "timestamp": datetime.now().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 500


# ============================================
# ENDPOINT 1: PROCESS USER FILES FROM SUPABASE
# ============================================

@app.route("/api/process-files", methods=["POST"])
def process_files():
    """
    Process all files for a user from Supabase Storage
    
    Request Body:
    {
        "user_id": "abc123-def456-ghi789",
        "folder_type": "reports"  // optional
    }
    
    Response:
    {
        "success": true,
        "message": "Processed 3 files successfully",
        "processed_count": 3,
        "failed_count": 0,
        "results": [...]
    }
    """
    try:
        data = request.get_json()
        
        if not data or "user_id" not in data:
            return jsonify({
                "success": False,
                "error": "user_id is required"
            }), 400
        
        user_id = data["user_id"]
        folder_type = data.get("folder_type", "reports")
        
        print(f"\n{'='*60}")
        print(f"Processing files for user: {user_id}")
        print(f"Folder type: {folder_type}")
        print(f"{'='*60}\n")
        
        # Get list of files from Supabase Storage
        files = sb.list_user_files(user_id, folder_type)
        
        if not files:
            return jsonify({
                "success": False,
                "error": "No files found for this user"
            }), 404
        
        # Process each file
        results = []
        successful = 0
        failed = 0
        
        for idx, file_info in enumerate(files, 1):
            file_name = file_info.get('name')
            file_path = f"{user_id}/{folder_type}/{file_name}"
            
            print(f"\n[{idx}/{len(files)}] Processing: {file_name}")
            
            try:
                # Download file
                local_file = sb.download_file_from_storage(file_path)
                
                # Extract text
                extracted_text = extract_text_universal(local_file)
                
                if not extracted_text or len(extracted_text.strip()) < 20:
                    raise Exception("Insufficient text extracted")
                
                # Extract metadata
                from rag_pipeline.rag_query import extract_patient_name, extract_report_dates
                patient_name = extract_patient_name(extracted_text)
                report_dates = extract_report_dates([extracted_text])
                report_date = report_dates[0] if report_dates else None
                
                # Save to Supabase database
                record_id = sb.save_extracted_data(
                    user_id=user_id,
                    file_path=file_path,
                    file_name=file_name,
                    folder_type=folder_type,
                    extracted_text=extracted_text,
                    patient_name=patient_name,
                    report_date=report_date
                )
                
                # Cleanup
                os.unlink(local_file)
                
                results.append({
                    "file_name": file_name,
                    "status": "success",
                    "record_id": record_id,
                    "patient_name": patient_name,
                    "report_date": report_date,
                    "text_length": len(extracted_text)
                })
                successful += 1
                
            except Exception as e:
                print(f"❌ Error processing {file_name}: {e}")
                results.append({
                    "file_name": file_name,
                    "status": "failed",
                    "error": str(e)
                })
                failed += 1
        
        return jsonify({
            "success": True,
            "message": f"Processed {successful} files successfully, {failed} failed",
            "processed_count": successful,
            "failed_count": failed,
            "total_files": len(files),
            "results": results
        }), 200
        
    except Exception as e:
        print(f"❌ Error in process_files: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500


# ============================================
# ENDPOINT 2: GENERATE SUMMARY
# ============================================

@app.route("/api/generate-summary", methods=["POST"])
def generate_summary():
    """
    Generate medical summary for user's reports
    """
    try:
        data = request.get_json()
        
        if not data or "user_id" not in data:
            return jsonify({
                "success": False,
                "error": "user_id is required"
            }), 400
        
        user_id = data["user_id"]
        folder_type = data.get("folder_type")
        use_cache = data.get("use_cache", True)
        force_regenerate = data.get("force_regenerate", False)
        
        print(f"\n{'='*60}")
        print(f"Generating summary for user: {user_id}")
        print(f"Use cache: {use_cache}, Force regenerate: {force_regenerate}")
        print(f"{'='*60}\n")
        
        # Check cache first (unless force_regenerate is True)
        if use_cache and not force_regenerate:
            cached = sb.get_cached_summary(user_id, folder_type)
            if cached:
                print("✓ Using cached summary")
                
                # Verify cached summary is valid
                if cached['summary_text'] and not cached['summary_text'].startswith("❌"):
                    return jsonify({
                        "success": True,
                        "summary": cached['summary_text'],
                        "report_count": cached['report_count'],
                        "cached": True,
                        "generated_at": cached['generated_at']
                    }), 200
                else:
                    print("⚠️ Cached summary contains error, regenerating...")
        
        # Get processed reports from database
        reports = sb.get_processed_reports(user_id, folder_type)
        
        if not reports:
            return jsonify({
                "success": False,
                "error": "No processed reports found. Please process files first using /api/process-files"
            }), 404
        
        print(f"✓ Found {len(reports)} processed reports")
        
        # Extract patient names and dates
        patient_names = list(set([r['patient_name'] for r in reports if r.get('patient_name')]))
        dates = list(set([r['report_date'] for r in reports if r.get('report_date')]))
        
        # Create chunks from all reports
        all_chunks = []
        for report in reports:
            extracted = report['extracted_text']
            cleaned = clean_text(extracted)
            chunks = chunk_text(cleaned, max_words=250, overlap_words=30)
            all_chunks.extend(chunks)
        
        print(f"✓ Generated {len(all_chunks)} total chunks")
        
        if not all_chunks:
            return jsonify({
                "success": False,
                "error": "Could not generate chunks from reports"
            }), 500
        
        # Build FAISS index - THIS CREATES THE VECTORIZER
        print("🔧 Building FAISS index (this will create vectorizer.pkl)...")
        try:
            build_faiss_index(all_chunks)
            print("✅ FAISS index built successfully")
            
            # Verify vectorizer was created
            from rag_pipeline.embed_store import VECTORIZER_PATH
            if not os.path.exists(VECTORIZER_PATH):
                raise Exception(f"Vectorizer not created at {VECTORIZER_PATH}")
            print(f"✅ Vectorizer verified at: {VECTORIZER_PATH}")
            
        except Exception as e:
            error_msg = f"Failed to build index: {str(e)}"
            print(f"❌ {error_msg}")
            traceback.print_exc()
            return jsonify({
                "success": False,
                "error": error_msg
            }), 500
        
        # Generate summary using RAG
        print("🤖 Generating summary with RAG...")
        try:
            summary = ask_rag(
                question="Analyze all medical reports. If multiple reports exist, provide comparative analysis showing trends and changes over time.",
                top_k=15,
                num_reports=len(reports)
            )
            
            # Check if summary generation failed
            if summary.startswith("❌"):
                print(f"❌ Summary generation returned error: {summary}")
                return jsonify({
                    "success": False,
                    "error": summary
                }), 500
                
            print(f"✅ Summary generated successfully ({len(summary)} chars)")
            
        except Exception as e:
            error_msg = f"Failed to generate summary: {str(e)}"
            print(f"❌ {error_msg}")
            traceback.print_exc()
            return jsonify({
                "success": False,
                "error": error_msg
            }), 500
        
        # Cache the summary
        try:
            sb.save_summary_cache(user_id, folder_type or 'all', summary, len(reports))
            print("✅ Summary cached successfully")
        except Exception as e:
            print(f"⚠️ Failed to cache summary: {e}")
        
        return jsonify({
            "success": True,
            "summary": summary,
            "report_count": len(reports),
            "patient_names": patient_names,
            "dates": sorted(dates),
            "cached": False
        }), 200
        
    except Exception as e:
        print(f"❌ Error in generate_summary: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500


# ============================================
# ENDPOINT 3: GET PROCESSED REPORTS LIST
# ============================================

@app.route("/api/reports/<user_id>", methods=["GET"])
def get_reports(user_id):
    """
    Get list of processed reports for a user
    
    Query Parameters:
    - folder_type: optional filter
    
    Response:
    {
        "success": true,
        "reports": [
            {
                "id": "123",
                "file_name": "blood_test.pdf",
                "patient_name": "John Doe",
                "report_date": "03/12/2025",
                "processing_status": "completed",
                "processed_at": "2025-01-02T10:30:00"
            }
        ]
    }
    """
    try:
        folder_type = request.args.get('folder_type')
        
        reports = sb.get_processed_reports(user_id, folder_type)
        
        # Remove large text fields for list view
        simplified_reports = []
        for report in reports:
            simplified_reports.append({
                "id": report['id'],
                "file_name": report['file_name'],
                "folder_type": report['folder_type'],
                "patient_name": report.get('patient_name'),
                "report_date": report.get('report_date'),
                "processing_status": report['processing_status'],
                "processed_at": report.get('processed_at')
            })
        
        return jsonify({
            "success": True,
            "reports": simplified_reports,
            "count": len(simplified_reports)
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_reports: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# ============================================
# ENDPOINT 4: CLEAR USER CACHE
# ============================================

@app.route("/api/clear-cache/<user_id>", methods=["DELETE"])
def clear_cache(user_id):
    """
    Clear cached summary for a user (keeps processed reports)
    """
    try:
        # Delete cached summaries only
        sb.supabase.table('medical_summaries_cache').delete().eq(
            'user_id', user_id
        ).execute()
        
        # Also delete generated index files
        from rag_pipeline.embed_store import INDEX_PATH, CHUNKS_PATH, VECTORIZER_PATH
        for path in [INDEX_PATH, CHUNKS_PATH, VECTORIZER_PATH]:
            if os.path.exists(path):
                os.unlink(path)
                print(f"🗑️ Deleted: {path}")
        
        return jsonify({
            "success": True,
            "message": f"Cache cleared for user {user_id}"
        }), 200
        
    except Exception as e:
        print(f"❌ Error in clear_cache: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================
# ENDPOINT 5: CLEAR USER DATA
# ============================================

@app.route("/api/clear/<user_id>", methods=["DELETE"])
def clear_user_data(user_id):
    """
    Clear all processed data for a user
    (Files in Supabase Storage remain, only database records are cleared)
    
    Response:
    {
        "success": true,
        "message": "Cleared data for user abc123"
    }
    """
    try:
        # Delete from processed reports table
        result = sb.supabase.table('medical_reports_processed').delete().eq(
            'user_id', user_id
        ).execute()
        
        # Delete cached summaries
        sb.supabase.table('medical_summaries_cache').delete().eq(
            'user_id', user_id
        ).execute()
        
        return jsonify({
            "success": True,
            "message": f"Cleared data for user {user_id}",
            "records_deleted": len(result.data) if result.data else 0
        }), 200
        
    except Exception as e:
        print(f"❌ Error in clear_user_data: {e}")
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


if __name__ == "__main__":
    print("\n" + "="*60)
    print("🚀 Medical RAG API Server Starting...")
    print("="*60)
    print("\nAvailable Endpoints:")
    print("  GET  /api/health")
    print("  POST /api/process-files")
    print("  POST /api/generate-summary")
    print("  GET  /api/reports/<user_id>")
    print("  DELETE /api/clear/<user_id>")
    print("\n" + "="*60 + "\n")
    
    app.run(debug=True, host="0.0.0.0", port=5000)