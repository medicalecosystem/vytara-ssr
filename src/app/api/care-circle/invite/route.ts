import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

type InvitePayload = {
  contact?: string;
};

const normalizeContact = (value: string) => value.replace(/[^\d+]/g, '');

export async function POST(request: Request) {
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

  const payload = (await request.json()) as InvitePayload;
  const contact = payload.contact?.trim();

  if (!contact) {
    return NextResponse.json({ message: 'Contact is required.' }, { status: 400 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false },
    }
  );

  let recipientId: string | null = null;

  if (contact.includes('@')) {
    const emailContact = contact.toLowerCase();
    let page = 1;
    const perPage = 1000;

    while (!recipientId) {
      const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
      if (error) {
        return NextResponse.json({ message: error.message }, { status: 500 });
      }

      recipientId =
        data.users.find((candidate) => candidate.email?.toLowerCase() === emailContact)
          ?.id ?? null;

      if (!recipientId && data.nextPage) {
        page = data.nextPage;
      } else {
        break;
      }
    }
  }

  if (!recipientId) {
    const contactVariants = Array.from(
      new Set([contact, normalizeContact(contact)].filter(Boolean))
    );
    const filters = contactVariants
      .map((value) => `personal->>contactNumber.eq.${value}`)
      .join(',');

    const { data: profiles, error: profileError } = await adminClient
      .from('profiles')
      .select('user_id')
      .or(filters);

    if (profileError) {
      return NextResponse.json({ message: profileError.message }, { status: 500 });
    }

    recipientId = profiles?.[0]?.user_id ?? null;
  }

  if (!recipientId) {
    return NextResponse.json(
      { message: 'No registered user found with that contact.' },
      { status: 404 }
    );
  }

  if (recipientId === user.id) {
    return NextResponse.json({ message: 'You cannot invite yourself.' }, { status: 400 });
  }

  const { error: inviteError } = await adminClient.from('care_circle_links').insert({
    requester_id: user.id,
    recipient_id: recipientId,
  });

  if (inviteError) {
    const message =
      inviteError.code === '23505'
        ? 'An invite already exists for this member.'
        : inviteError.message;
    return NextResponse.json({ message }, { status: 400 });
  }

  return NextResponse.json({ recipientId });
}


