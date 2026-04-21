import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/auth';
import { authorizeCareCircleMemberAccess } from '@/lib/careCirclePermissions';

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

    const authResult = await authorizeCareCircleMemberAccess({
      adminClient,
      user,
      linkId,
      requiredPermission: 'emergency_card',
    });

    if (!authResult.ok) {
      return NextResponse.json({ message: authResult.message }, { status: authResult.status });
    }

    const ownerProfileId = authResult.access.ownerProfileId;

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
      .eq('profile_id', ownerProfileId)
      .maybeSingle();

    if (emergencyCardError && emergencyCardError.code !== 'PGRST116') {
      return NextResponse.json({ message: emergencyCardError.message }, { status: 500 });
    }

    return NextResponse.json({
      card: emergencyCard ?? null,
      profileId: ownerProfileId,
    });
  } catch (error) {
    console.error('Error fetching care circle emergency card:', error);
    return NextResponse.json(
      { message: 'Failed to fetch care circle emergency card' },
      { status: 500 }
    );
  }
}
