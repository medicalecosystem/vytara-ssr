import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const getDisplayName = (email: string | null) => {
  const trimmed = email?.trim() ?? '';
  if (trimmed) {
    return trimmed;
  }
  return 'Unknown member';
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
    {
      auth: { persistSession: false },
    }
  );

  const { data: links, error: linksError } = await adminClient
    .from('care_circle_links')
    .select('id, requester_id, recipient_id, status, created_at')
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);

  if (linksError) {
    return NextResponse.json({ message: linksError.message }, { status: 500 });
  }

  const memberIds = Array.from(
    new Set(
      (links ?? [])
        .flatMap((link) => [link.requester_id, link.recipient_id])
        .filter((id) => id && id !== user.id)
    )
  );

  const credentialsLookup: Record<string, string | null> = {};
  if (memberIds.length > 0) {
    const { data: credentials } = await adminClient
      .from('credentials')
      .select('id, email')
      .in('id', memberIds);
    (credentials ?? []).forEach((credential) => {
      credentialsLookup[credential.id] = credential.email ?? null;
    });
  }

  const outgoing = (links ?? [])
    .filter((link) => link.requester_id === user.id)
    .map((link) => ({
      id: link.id,
      memberId: link.recipient_id,
      status: link.status,
      displayName: getDisplayName(credentialsLookup[link.recipient_id] ?? null),
      createdAt: link.created_at,
    }));

  const incoming = (links ?? [])
    .filter((link) => link.recipient_id === user.id)
    .map((link) => ({
      id: link.id,
      memberId: link.requester_id,
      status: link.status,
      displayName: getDisplayName(credentialsLookup[link.requester_id] ?? null),
      createdAt: link.created_at,
    }));

  return NextResponse.json({ outgoing, incoming });
}
