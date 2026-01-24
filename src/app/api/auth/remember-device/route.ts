import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

type RememberDevicePayload = {
  action: 'register' | 'verify' | 'remove';
  deviceToken: string;
  label?: string;
  userId?: string;
  accessToken?: string;
};

const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

export async function POST(request: Request) {
  let payload: RememberDevicePayload | null = null;
  try {
    payload = (await request.json()) as RememberDevicePayload;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!payload?.deviceToken) {
    return NextResponse.json({ message: 'Missing device token.' }, { status: 400 });
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

  const deviceTokenHash = hashToken(payload.deviceToken);

  if (payload.action === 'register') {
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

    let userId = "";
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!authError && user?.id) {
      userId = user.id;
    }

    if (!userId && payload.accessToken) {
      const anonClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
      );
      const { data: authData, error: tokenError } =
        await anonClient.auth.getUser(payload.accessToken);
      if (!tokenError && authData.user?.id) {
        userId = authData.user.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
    }

    const { error } = await adminClient
      .from('remembered_devices')
      .upsert(
        {
          user_id: userId,
          device_token_hash: deviceTokenHash,
          label: payload.label ?? null,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: 'device_token_hash' }
      );

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  if (payload.action === 'verify') {
    const { data, error } = await adminClient
      .from('remembered_devices')
      .select('user_id')
      .eq('device_token_hash', deviceTokenHash)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ message: 'Not found.' }, { status: 404 });
    }

    if (payload.userId && data.user_id !== payload.userId) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
    }

    await adminClient
      .from('remembered_devices')
      .update({ last_used_at: new Date().toISOString() })
      .eq('device_token_hash', deviceTokenHash);

    return NextResponse.json({ ok: true, userId: data.user_id });
  }

  if (payload.action === 'remove') {
    const { error } = await adminClient
      .from('remembered_devices')
      .delete()
      .eq('device_token_hash', deviceTokenHash);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ message: 'Invalid action.' }, { status: 400 });
}
