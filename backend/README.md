# Medical RAG Backend - Setup Instructions

## 🚀 Quick Setup

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd <repo-name>/backend
```

### Step 2: Create Virtual Environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Set Up Environment Variables

Create a `.env` file in the `backend` folder with these credentials:

```env
# Groq API Key
GROQ_API_KEY=gsk_your_key_here

# Supabase (Already configured - same database)
SUPABASE_URL=https://mhlkzulgpeirtjiopzvu.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzd...
```

**Note:** Supabase is already set up with tables and storage. You just need to add the Groq API key.

Get your Groq API key from: https://console.groq.com/keys (free tier available)

### Step 5: Run the Server

```bash
python app_api.py
```

You should see:
```
✅ Supabase client initialized
🚀 Medical RAG API Server Starting...
```

Server is now running at: **http://localhost:5000**

### Step 6: Test It

Open a new terminal:

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "message": "Medical RAG API is running",
  "supabase_connected": true
}
```

## ✅ You're All Set!

The backend is now running and connected to the existing Supabase database.

## 🐛 Troubleshooting

### "Module not found" error
```bash
# Make sure virtual environment is activated
pip install -r requirements.txt
```

### "GROQ_API_KEY not set" error
- Check `.env` file exists in `backend/` folder
- Verify the API key is correct (no quotes needed)

### Port 5000 already in use
Change port in `app_api.py` (last line):
```python
app.run(debug=True, host="0.0.0.0", port=5001)
```

## 📂 Project Structure

```
backend/
├── app_api.py              # Main Flask API server
├── supabase_helper.py      # Supabase operations
├── rag_pipeline/           # RAG processing pipeline
│   ├── extractor_OCR.py    # PDF/image text extraction
│   ├── clean_chunk.py      # Text cleaning
│   ├── embed_store.py      # FAISS indexing
│   └── rag_query.py        # RAG query + Groq LLM
├── .env                    # Environment variables (create this)
└── requirements.txt        # Python dependencies
```

## 🔗 API Endpoints

Once running, the API provides:

- `GET /api/health` - Health check
- `POST /api/process-files` - Extract text from PDFs
- `POST /api/generate-summary` - Generate AI summary
- `GET /api/reports/{user_id}` - List processed reports
- `DELETE /api/clear-cache/{user_id}` - Clear cache

Full API documentation available on request.