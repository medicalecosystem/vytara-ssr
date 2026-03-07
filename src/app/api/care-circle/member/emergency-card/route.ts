import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/auth';

type CareCircleRole = 'family' | 'friend';

type LinkRow = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'declined';
  relationship: string | null;
  profile_id: string | null;
};

const normalizeCareCircleRole = (value: string | null | undefined): CareCircleRole => {
  const normalized = (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_');
  if (normalized === 'family') return 'family';
  return 'friend';
};

const canReadEmergencyCard = (role: CareCircleRole) => role === 'family' || role === 'friend';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const linkId = url.searchParams.get('linkId')?.trim();

    if (!linkId) {
      return NextResponse.json({ message: 'linkId is required.' }, { status: 400 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ message: 'Service role key is missing.' }, { status: 500 });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const { data: linkRow, error: linkError } = await adminClient
      .from('care_circle_links')
      .select('id, requester_id, recipient_id, status, relationship, profile_id')
      .eq('id', linkId)
      .maybeSingle();

    if (linkError && linkError.code !== 'PGRST116') {
      return NextResponse.json({ message: linkError.message }, { status: 500 });
    }

    const link = linkRow as LinkRow | null;
    if (!link) {
      return NextResponse.json({ message: 'Care circle link not found.' }, { status: 404 });
    }

    const role = normalizeCareCircleRole(link.relationship);
    const isAuthorizedRecipient =
      link.recipient_id === user.id && link.status === 'accepted' && canReadEmergencyCard(role);

    if (!isAuthorizedRecipient) {
      return NextResponse.json(
        { message: 'Not allowed for this care circle member.' },
        { status: 403 }
      );
    }

    if (!link.profile_id) {
      return NextResponse.json({ message: 'Owner profile is not available.' }, { status: 404 });
    }

    const { data: emergencyCard, error: emergencyCardError } = await adminClient
      .from('care_emergency_cards')
      .select(
        [
          'name',
          'age',
          'date_of_birth',
          'photo_id_on_file',
          'photo_id_last4',
          'emergency_contact_name',
          'emergency_contact_phone',
          'preferred_hospital',
          'insurer_name',
          'plan_type',
          'tpa_helpline',
          'insurance_last4',
          'blood_group',
          'critical_allergies',
          'chronic_conditions',
          'current_meds',
          'emergency_instructions',
        ].join(',')
      )
      .eq('profile_id', link.profile_id)
      .maybeSingle();

    if (emergencyCardError && emergencyCardError.code !== 'PGRST116') {
      return NextResponse.json({ message: emergencyCardError.message }, { status: 500 });
    }

    return NextResponse.json({
      card: emergencyCard ?? null,
      profileId: link.profile_id,
    });
  } catch (error) {
    console.error('Error fetching care circle emergency card:', error);
    return NextResponse.json(
      { message: 'Failed to fetch care circle emergency card' },
      { status: 500 }
    );
  }
}
