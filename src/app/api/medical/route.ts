/**
 * Next.js API Route for Medical RAG Integration
 */

import { NextRequest, NextResponse } from 'next/server';

const FLASK_API_URL = process.env.NEXT_PUBLIC_FLASK_API_URL || 'http://localhost:5000';

async function callFlask(endpoint: string, method: string, body?: any) {
  const url = `${FLASK_API_URL}${endpoint}`;
  
  console.log(`📡 [Next.js API] Calling Flask: ${method} ${url}`);
  
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    const responseText = await response.text();
    
    if (responseText.startsWith('{') || responseText.startsWith('[')) {
      const data = JSON.parse(responseText);
      console.log(`✅ [Next.js API] Flask response OK`);
      return { status: response.status, data };
    } else {
      throw new Error(`Flask returned HTML instead of JSON`);
    }
  } catch (error: any) {
    console.error('❌ [Next.js API] Error:', error.message);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📥 [Next.js API] POST /api/medical');
    
    const body = await request.json();
    const { action, folder_type, use_cache, user_id } = body;
    
    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'user_id is required' },
        { status: 400 }
      );
    }
    
    console.log(`📋 [Next.js API] Action: ${action}, User: ${user_id}`);
    
    if (action === 'process') {
      const result = await callFlask('/api/process-files', 'POST', {
        user_id,
        folder_type: folder_type || 'reports'
      });
      return NextResponse.json(result.data, { status: result.status });
    }
    
    else if (action === 'generate-summary') {
      const result = await callFlask('/api/generate-summary', 'POST', {
        user_id,
        folder_type,
        use_cache: use_cache !== false
      });
      return NextResponse.json(result.data, { status: result.status });
    }
    
    else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }
    
  } catch (error: any) {
    console.error('❌ [Next.js API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}