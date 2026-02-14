import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const getDisplayName = (displayName: string | null, phone: string | null) => {
  const trimmed = displayName?.trim() ?? '';
  if (trimmed) {
    return trimmed;
  }
  const phoneValue = phone?.trim() ?? '';
  return phoneValue || 'Unknown member';
};

type LinkRow = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string | null;
  profile_id: string | null;
};

type ProfileLookupRow = {
  id: string;
  display_name: string | null;
  name: string | null;
  phone: string | null;
  is_primary: boolean | null;
  created_at: string | null;
};

const parseDate = (value: string | null) => {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : Number.MAX_SAFE_INTEGER;
};

const pickPreferredProfile = (profiles: ProfileLookupRow[]) =>
  [...profiles].sort((a, b) => {
    const primaryDiff = Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary));
    if (primaryDiff !== 0) return primaryDiff;
    return parseDate(a.created_at) - parseDate(b.created_at);
  })[0] ?? null;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedProfileId = url.searchParams.get('profileId')?.trim() || null;

  // Check for Bearer token in Authorization header (for mobile apps)
  const authHeader = request.headers.get('authorization');
  let user: { id: string } | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (!authError && authUser) {
      user = authUser;
    }
  } else {
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
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (!authError && authUser) {
      user = authUser;
    }
  }

  if (!user) {
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

  if (requestedProfileId) {
    let ownsRequestedProfile = false;

    const { data: ownedByAuth, error: ownedByAuthError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', requestedProfileId)
      .eq('auth_id', user.id)
      .maybeSingle();

    if (!ownedByAuthError && ownedByAuth?.id) {
      ownsRequestedProfile = true;
    }

    if (!ownsRequestedProfile) {
      const { data: ownedByUser, error: ownedByUserError } = await adminClient
        .from('profiles')
        .select('id')
        .eq('id', requestedProfileId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (ownedByUserError && ownedByUserError.code !== 'PGRST116') {
        return NextResponse.json({ message: ownedByUserError.message }, { status: 500 });
      }

      if (ownedByUser?.id) {
        ownsRequestedProfile = true;
      }
    }

    if (!ownsRequestedProfile) {
      return NextResponse.json({ message: 'Invalid profile selection.' }, { status: 403 });
    }
  }

  let outgoingQuery = adminClient
    .from('care_circle_links')
    .select('id, requester_id, recipient_id, status, created_at, updated_at, profile_id')
    .eq('requester_id', user.id);

  if (requestedProfileId) {
    outgoingQuery = outgoingQuery.eq('profile_id', requestedProfileId);
  }

  const incomingQuery = adminClient
    .from('care_circle_links')
    .select('id, requester_id, recipient_id, status, created_at, updated_at, profile_id')
    .eq('recipient_id', user.id);

  const [{ data: outgoingLinks, error: outgoingError }, { data: incomingLinks, error: incomingError }] =
    await Promise.all([outgoingQuery, incomingQuery]);

  if (outgoingError || incomingError) {
    return NextResponse.json({ message: outgoingError?.message || incomingError?.message }, { status: 500 });
  }

  const links = [...(outgoingLinks ?? []), ...(incomingLinks ?? [])] as LinkRow[];
  const memberIds = Array.from(
    new Set(
      links
        .flatMap((link) => [link.requester_id, link.recipient_id])
        .filter((id) => id && id !== user.id)
    )
  );

  const profilesByUserId = new Map<string, ProfileLookupRow[]>();
  const profilesById = new Map<string, ProfileLookupRow>();

  if (memberIds.length > 0) {
    const { data: memberProfilesByUser } = await adminClient
      .from('profiles')
      .select('id, user_id, display_name, name, phone, is_primary, created_at')
      .in('user_id', memberIds);

    (memberProfilesByUser ?? []).forEach((profile) => {
      const mapped: ProfileLookupRow = {
        id: profile.id,
        display_name: profile.display_name ?? null,
        name: profile.name ?? null,
        phone: profile.phone ?? null,
        is_primary: profile.is_primary ?? null,
        created_at: profile.created_at ?? null,
      };
      profilesById.set(profile.id, mapped);
      const userProfiles = profilesByUserId.get(profile.user_id) ?? [];
      userProfiles.push(mapped);
      profilesByUserId.set(profile.user_id, userProfiles);
    });

    const missingMemberIds = memberIds.filter((id) => !profilesByUserId.has(id));
    if (missingMemberIds.length > 0) {
      const { data: memberProfilesByAuth } = await adminClient
        .from('profiles')
        .select('id, auth_id, display_name, name, phone, is_primary, created_at')
        .in('auth_id', missingMemberIds);

      (memberProfilesByAuth ?? []).forEach((profile) => {
        const mapped: ProfileLookupRow = {
          id: profile.id,
          display_name: profile.display_name ?? null,
          name: profile.name ?? null,
          phone: profile.phone ?? null,
          is_primary: profile.is_primary ?? null,
          created_at: profile.created_at ?? null,
        };
        profilesById.set(profile.id, mapped);
        const userProfiles = profilesByUserId.get(profile.auth_id) ?? [];
        userProfiles.push(mapped);
        profilesByUserId.set(profile.auth_id, userProfiles);
      });
    }
  }

  const resolveDisplayName = (profile: ProfileLookupRow | null) =>
    profile?.display_name?.trim() ||
    profile?.name?.trim() ||
    getDisplayName(null, profile?.phone ?? null);

  const outgoing = (outgoingLinks ?? []).map((link) => {
    const memberUserId = link.recipient_id;
    const memberProfile = pickPreferredProfile(profilesByUserId.get(memberUserId) ?? []);
    return {
      id: link.id,
      memberId: memberUserId,
      memberProfileId: memberProfile?.id ?? null,
      profileId: link.profile_id,
      status: link.status,
      displayName: resolveDisplayName(memberProfile),
      createdAt: link.created_at,
      updatedAt: link.updated_at,
    };
  });

  const incoming = (incomingLinks ?? []).map((link) => {
    const memberUserId = link.requester_id;
    const linkedProfile = link.profile_id ? profilesById.get(link.profile_id) ?? null : null;
    const fallbackProfile = pickPreferredProfile(profilesByUserId.get(memberUserId) ?? []);
    const memberProfile = linkedProfile ?? fallbackProfile;
    return {
      id: link.id,
      memberId: memberUserId,
      memberProfileId: memberProfile?.id ?? null,
      profileId: link.profile_id,
      status: link.status,
      displayName: resolveDisplayName(memberProfile),
      createdAt: link.created_at,
      updatedAt: link.updated_at,
    };
  });

  return NextResponse.json({ outgoing, incoming });
}
