/**
 * Next.js API Route for Medical RAG Integration
 */

import { NextRequest, NextResponse } from 'next/server';

const LOCAL_FLASK_API_URL = 'http://localhost:5000';
const RENDER_FLASK_API_URL = 'https://testing-9obu.onrender.com';
const DEFAULT_FLASK_API_URL =
  process.env.NODE_ENV === 'production'
    ? RENDER_FLASK_API_URL
    : LOCAL_FLASK_API_URL;

type FlaskProxyError = Error & { status?: number };

function createProxyError(message: string, status: number): FlaskProxyError {
  const error = new Error(message) as FlaskProxyError;
  error.status = status;
  return error;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function getCandidateBackendUrls(): string[] {
  const isProd = process.env.NODE_ENV === 'production';
  const candidates = [
    process.env.BACKEND_URL,
    process.env.NEXT_PUBLIC_BACKEND_URL,
    DEFAULT_FLASK_API_URL,
    RENDER_FLASK_API_URL,
    ...(isProd ? [] : [LOCAL_FLASK_API_URL]),
  ]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map(normalizeBaseUrl);

  return candidates.filter((url, index) => candidates.indexOf(url) === index);
}

async function callFlask(endpoint: string, method: string, body?: unknown) {
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const candidateUrls = getCandidateBackendUrls();
  const attemptErrors: string[] = [];

  for (const baseUrl of candidateUrls) {
    const url = `${baseUrl}${endpoint}`;
    console.log(`📡 [Next.js API] Calling Flask: ${method} ${url}`);

    try {
      const response = await fetch(url, options);
      const contentType = response.headers.get('content-type') || '';
      const responseText = await response.text();
      const trimmedResponseText = responseText.trimStart();

      if (
        contentType.includes('application/json') ||
        trimmedResponseText.startsWith('{') ||
        trimmedResponseText.startsWith('[')
      ) {
        try {
          const data = JSON.parse(trimmedResponseText);
          console.log(`✅ [Next.js API] Flask response OK from ${baseUrl}`);
          return { status: response.status, data, backendUrl: baseUrl };
        } catch {
          attemptErrors.push(`invalid JSON (${response.status}) from ${url}`);
          continue;
        }
      }

      const bodyPreview =
        trimmedResponseText.slice(0, 120).replace(/\s+/g, ' ') || '<empty>';
      attemptErrors.push(
        `non-JSON (${response.status}) from ${url}, starts with: ${bodyPreview}`
      );
    } catch (error: unknown) {
      attemptErrors.push(`network failure for ${url}: ${getErrorMessage(error)}`);
    }
  }

  const joinedErrors = attemptErrors.join(' | ');
  throw createProxyError(
    `Unable to reach a valid Flask JSON endpoint. Set BACKEND_URL/NEXT_PUBLIC_BACKEND_URL correctly. Attempts: ${joinedErrors}`,
    503
  );
}

export async function POST(request: NextRequest) {
  try {
    console.log('📥 [Next.js API] POST /api/medical');
    
    const body = await request.json();
    const {
      action,
      folder_type,
      use_cache,
      force_regenerate,
      max_new_structured_extractions,
      user_id
    } = body;
    
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
      return NextResponse.json(
        { ...result.data, backend_url: result.backendUrl },
        { status: result.status }
      );
    }
    
    else if (action === 'generate-summary') {
      const result = await callFlask('/api/generate-summary', 'POST', {
        user_id,
        folder_type,
        use_cache: use_cache !== false,
        force_regenerate: force_regenerate === true,
        max_new_structured_extractions
      });
      return NextResponse.json(
        { ...result.data, backend_url: result.backendUrl },
        { status: result.status }
      );
    }
    
    else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }
    
  } catch (error: unknown) {
    console.error('❌ [Next.js API] Error:', error);
    const status =
      error instanceof Error && 'status' in error && typeof error.status === 'number'
        ? error.status
        : 500;
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
        backend_candidates: getCandidateBackendUrls(),
      },
      { status }
    );
  }
}
