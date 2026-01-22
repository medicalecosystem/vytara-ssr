# Backend/supabase_helper.py

import os
from supabase import create_client, Client
from dotenv import load_dotenv
import requests
import tempfile

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")

# Add after load_dotenv()
print("DEBUG: SUPABASE_URL =", SUPABASE_URL)
print("DEBUG: SUPABASE_SERVICE_KEY =", SUPABASE_SERVICE_KEY[:50] if SUPABASE_SERVICE_KEY else "NOT SET")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
print(f"✅ Supabase client initialized: {SUPABASE_URL}")

BUCKET_NAME = "medical-vault"


# ============================================
# FILE LISTING
# ============================================

def list_user_files(user_id: str, folder_type: str = None):
    """
    List files from Supabase Storage for a user
    
    Args:
        user_id: User's ID (from auth)
        folder_type: Optional filter (reports, prescriptions, bills, insurance)
    
    Returns:
        List of file objects with metadata
    """
    try:
        if folder_type:
            folder_path = f"{user_id}/{folder_type}"
        else:
            folder_path = f"{user_id}"
        
        response = supabase.storage.from_(BUCKET_NAME).list(folder_path)
        
        # Filter out folders, keep only files
        files = [f for f in response if f.get('metadata')]
        
        print(f"✅ Found {len(files)} files for user {user_id} in {folder_path}")
        return files
        
    except Exception as e:
        print(f"❌ Error listing files: {e}")
        return []


# ============================================
# FILE DOWNLOAD
# ============================================

def download_file_from_storage(file_path: str):
    """
    Download a file from Supabase Storage
    
    Args:
        file_path: Full path in storage (e.g., "user_id/reports/file.pdf")
    
    Returns:
        Temporary file path on local system
    """
    try:
        # Get signed URL (valid for 1 hour)
        response = supabase.storage.from_(BUCKET_NAME).create_signed_url(
            file_path, 
            3600  # 1 hour
        )
        
        if 'signedURL' not in response:
            raise Exception(f"Failed to get signed URL: {response}")
        
        signed_url = response['signedURL']
        
        # Download file
        file_response = requests.get(signed_url, timeout=30)
        file_response.raise_for_status()
        
        # Save to temp file
        file_extension = file_path.split('.')[-1]
        temp_file = tempfile.NamedTemporaryFile(
            delete=False, 
            suffix=f'.{file_extension}'
        )
        temp_file.write(file_response.content)
        temp_file.close()
        
        print(f"✅ Downloaded: {file_path} → {temp_file.name}")
        return temp_file.name
        
    except Exception as e:
        print(f"❌ Error downloading file {file_path}: {e}")
        raise


# ============================================
# DATABASE OPERATIONS
# ============================================

def save_extracted_data(user_id: str, file_path: str, file_name: str, 
                       folder_type: str, extracted_text: str, 
                       patient_name: str = None, report_date: str = None):
    """
    Save extracted text to database
    Uses UPSERT to update if exists, insert if new
    """
    try:
        # Prepare data
        data = {
            'user_id': user_id,
            'file_path': file_path,
            'file_name': file_name,
            'folder_type': folder_type,
            'extracted_text': extracted_text,
            'patient_name': patient_name,
            'report_date': report_date,
            'processing_status': 'completed',
            'processed_at': 'NOW()'
        }
        
        # Use upsert to handle duplicates
        result = supabase.table('medical_reports_processed').upsert(
            data,
            on_conflict='user_id,file_path'
        ).execute()
        
        record_id = result.data[0]['id'] if result.data else None
        print(f"✅ Saved to DB: {file_name} (ID: {record_id})")
        return record_id
        
    except Exception as e:
        print(f"❌ Error saving to database: {e}")
        raise


def get_processed_reports(user_id: str, folder_type: str = None):
    """
    Get all processed reports for a user from database
    """
    try:
        query = supabase.table('medical_reports_processed').select('*').eq(
            'user_id', user_id
        ).eq('processing_status', 'completed')
        
        if folder_type:
            query = query.eq('folder_type', folder_type)
        
        result = query.execute()
        print(f"✅ Retrieved {len(result.data)} processed reports for user {user_id}")
        return result.data
        
    except Exception as e:
        print(f"❌ Error fetching processed reports: {e}")
        return []


def save_summary_cache(user_id: str, folder_type: str, summary: str, report_count: int):
    """
    Cache generated summary
    """
    try:
        result = supabase.table('medical_summaries_cache').upsert({
            'user_id': user_id,
            'folder_type': folder_type,
            'summary_text': summary,
            'report_count': report_count,
            'generated_at': 'NOW()'
        }, on_conflict='user_id,folder_type').execute()
        
        print(f"✅ Cached summary for user {user_id}")
        return True
        
    except Exception as e:
        print(f"❌ Error caching summary: {e}")
        return False


def get_cached_summary(user_id: str, folder_type: str = None):
    """
    Get cached summary if exists
    """
    try:
        query = supabase.table('medical_summaries_cache').select('*').eq(
            'user_id', user_id
        )
        
        if folder_type:
            query = query.eq('folder_type', folder_type)
        
        result = query.order('generated_at', desc=True).limit(1).execute()
        
        if result.data:
            print(f"✅ Found cached summary for user {user_id}")
            return result.data[0]
        
        print(f"ℹ️ No cached summary found for user {user_id}")
        return None
        
    except Exception as e:
        print(f"❌ Error fetching cached summary: {e}")
        return None


def clear_user_data(user_id: str):
    """
    Clear all processed data for a user
    (Files in Storage remain, only DB records are cleared)
    """
    try:
        # Delete from processed reports
        result1 = supabase.table('medical_reports_processed').delete().eq(
            'user_id', user_id
        ).execute()
        
        # Delete cached summaries
        result2 = supabase.table('medical_summaries_cache').delete().eq(
            'user_id', user_id
        ).execute()
        
        deleted_count = len(result1.data) if result1.data else 0
        print(f"✅ Cleared {deleted_count} records for user {user_id}")
        return deleted_count
        
    except Exception as e:
        print(f"❌ Error clearing user data: {e}")
        raise


# ============================================
# HEALTH CHECK
# ============================================

def test_connection():
    """
    Test Supabase connection
    """
    try:
        # Test database
        result = supabase.table('medical_reports_processed').select('id').limit(1).execute()
        
        # Test storage
        buckets = supabase.storage.list_buckets()
        
        print("✅ Supabase connection successful")
        print(f"   - Database access: OK")
        print(f"   - Storage access: OK")
        print(f"   - Buckets found: {len(buckets)}")
        return True
        
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        return False


if __name__ == "__main__":
    # Run this to test connection
    print("\n🧪 Testing Supabase connection...\n")
    test_connection()