import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const getDisplayName = (email: string | null) => {
  const trimmed = email?.trim() ?? '';
  return trimmed || 'Unknown member';
};

export async function GET() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { message: 'Service role key is missing.' },
      { status: 500 }
    );
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  // 🔁 ONLY REAL CHANGE: family_links
  const { data: links, error } = await adminClient
    .from('family_links')
    .select('id, requester_id, recipient_id, status, created_at')
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const memberIds = Array.from(
    new Set(
      (links ?? [])
        .flatMap((l) => [l.requester_id, l.recipient_id])
        .filter((id) => id && id !== user.id)
    )
  );

  const credentialsLookup: Record<string, string | null> = {};

  if (memberIds.length > 0) {
    const { data: credentials } = await adminClient
      .from('credentials')
      .select('id, email')
      .in('id', memberIds);

    (credentials ?? []).forEach((c) => {
      credentialsLookup[c.id] = c.email ?? null;
    });
  }

  const outgoing = (links ?? [])
    .filter((l) => l.requester_id === user.id)
    .map((l) => ({
      id: l.id,
      memberId: l.recipient_id,
      status: l.status,
      displayName: getDisplayName(credentialsLookup[l.recipient_id]),
      createdAt: l.created_at,
    }));

  const incoming = (links ?? [])
    .filter((l) => l.recipient_id === user.id)
    .map((l) => ({
      id: l.id,
      memberId: l.requester_id,
      status: l.status,
      displayName: getDisplayName(credentialsLookup[l.requester_id]),
      createdAt: l.created_at,
    }));

  return NextResponse.json({ outgoing, incoming });
}
