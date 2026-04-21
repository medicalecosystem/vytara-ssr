import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/auth';
import {
  sanitizePermissionInput,
  upsertCareCirclePermissions,
  fetchCareCirclePermissions,
} from '@/lib/careCirclePermissions';

type PermissionsPayload = {
  linkId?: string;
  recipientId?: string;
  permissions?: Record<string, unknown>;
};

type LinkRow = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'declined';
  profile_id: string | null;
};

const isMissingColumnError = (
  error: { code?: string; message?: string } | null | undefined,
  column: string
) =>
  error?.code === 'PGRST204' ||
  error?.message?.toLowerCase().includes(column.toLowerCase()) ||
  false;

async function resolveOwnerLink(
  adminClient: SupabaseClient,
  user: { id: string },
  payload: PermissionsPayload
): Promise<{ link: LinkRow } | { error: NextResponse }> {
  const linkId = payload.linkId?.trim();
  const explicitRecipientId = payload.recipientId?.trim();

  if (linkId) {
    const { data, error } = await adminClient
      .from('care_circle_links')
      .select('id, requester_id, recipient_id, status, profile_id')
      .eq('id', linkId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      return { error: NextResponse.json({ message: error.message }, { status: 500 }) };
    }
    const link = data as LinkRow | null;
    if (!link) {
      return { error: NextResponse.json({ message: 'Care circle link not found.' }, { status: 404 }) };
    }
    if (link.requester_id !== user.id) {
      return {
        error: NextResponse.json(
          { message: 'Only the care circle owner can update permissions.' },
          { status: 403 }
        ),
      };
    }
    return { link };
  }

  if (explicitRecipientId) {
    const { data, error } = await adminClient
      .from('care_circle_links')
      .select('id, requester_id, recipient_id, status, profile_id')
      .eq('requester_id', user.id)
      .eq('recipient_id', explicitRecipientId)
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      return { error: NextResponse.json({ message: error.message }, { status: 500 }) };
    }
    const link = data as LinkRow | null;
    if (!link) {
      return { error: NextResponse.json({ message: 'Care circle link not found.' }, { status: 404 }) };
    }
    return { link };
  }

  return {
    error: NextResponse.json({ message: 'linkId or recipientId is required.' }, { status: 400 }),
  };
}

async function assertPrimaryProfileLink(
  adminClient: SupabaseClient,
  user: { id: string },
  link: LinkRow
): Promise<NextResponse | null> {
  if (!link.profile_id) {
    return NextResponse.json(
      { message: 'Invalid care circle link profile.' },
      { status: 400 }
    );
  }

  const primaryByAuth = await adminClient
    .from('profiles')
    .select('id')
    .eq('id', link.profile_id)
    .eq('is_primary', true)
    .eq('auth_id', user.id)
    .maybeSingle();

  if (primaryByAuth.error && !isMissingColumnError(primaryByAuth.error, 'auth_id') && primaryByAuth.error.code !== 'PGRST116') {
    return NextResponse.json({ message: primaryByAuth.error.message }, { status: 500 });
  }
  if (primaryByAuth.data?.id) return null;

  const primaryByUser = await adminClient
    .from('profiles')
    .select('id')
    .eq('id', link.profile_id)
    .eq('is_primary', true)
    .eq('user_id', user.id)
    .maybeSingle();

  if (primaryByUser.error && primaryByUser.error.code !== 'PGRST116') {
    return NextResponse.json({ message: primaryByUser.error.message }, { status: 500 });
  }
  if (primaryByUser.data?.id) return null;

  return NextResponse.json(
    { message: 'Permissions must be updated from the primary profile link.' },
    { status: 403 }
  );
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ message: 'Service role key is missing.' }, { status: 500 });
    }

    const url = new URL(request.url);
    const linkId = url.searchParams.get('linkId')?.trim() || undefined;
    const recipientId = url.searchParams.get('recipientId')?.trim() || undefined;

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const resolved = await resolveOwnerLink(adminClient, user, { linkId, recipientId });
    if ('error' in resolved) return resolved.error;

    const permissions = await fetchCareCirclePermissions(
      adminClient,
      resolved.link.requester_id,
      resolved.link.recipient_id
    );

    return NextResponse.json({
      linkId: resolved.link.id,
      recipientId: resolved.link.recipient_id,
      permissions,
    });
  } catch (error) {
    console.error('Error reading care circle permissions:', error);
    return NextResponse.json({ message: 'Failed to read care circle permissions' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ message: 'Service role key is missing.' }, { status: 500 });
    }

    let payload: PermissionsPayload;
    try {
      payload = (await request.json()) as PermissionsPayload;
    } catch {
      return NextResponse.json({ message: 'Invalid request payload.' }, { status: 400 });
    }

    const perms = sanitizePermissionInput(payload.permissions);
    if (Object.keys(perms).length === 0) {
      return NextResponse.json({ message: 'No valid permissions provided.' }, { status: 400 });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const resolved = await resolveOwnerLink(adminClient, user, payload);
    if ('error' in resolved) return resolved.error;
    const { link } = resolved;

    const primaryError = await assertPrimaryProfileLink(adminClient, user, link);
    if (primaryError) return primaryError;

    if (link.status !== 'accepted') {
      return NextResponse.json(
        { message: 'Permissions can only be updated for accepted members.' },
        { status: 400 }
      );
    }

    const updated = await upsertCareCirclePermissions(
      adminClient,
      link.requester_id,
      link.recipient_id,
      perms
    );

    return NextResponse.json({
      linkId: link.id,
      recipientId: link.recipient_id,
      permissions: updated,
    });
  } catch (error) {
    console.error('Error updating care circle permissions:', error);
    return NextResponse.json({ message: 'Failed to update care circle permissions' }, { status: 500 });
  }
}
