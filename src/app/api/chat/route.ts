/**
 * Proxies chat (FAQ assistant) requests to the Flask backend.
 * Requires Flask backend running (e.g. python app.py in backend/).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { createRateLimiter, getClientIP } from '@/lib/rateLimit';

const chatLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 20 });

const FLASK_API_URL = process.env.NEXT_PUBLIC_CHATBOT_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const block = chatLimiter.check(ip);
    if (block) return block;

    if (!(await getAuthenticatedUser(request))) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
          reply: 'Please sign in to use the assistant.',
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const res = await fetch(`${FLASK_API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error('[api/chat] Flask backend unreachable:', e);
    return NextResponse.json(
      {
        success: false,
        reply: "Assistant is unavailable. Run the full app with: npm run dev:all (and ensure backend/.env has GROQ_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY).",
      },
      { status: 503 }
    );
  }
}
