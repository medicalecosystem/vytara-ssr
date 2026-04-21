import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/auth';
import {
  fetchCareCirclePermissions,
  type CareCirclePermissions,
} from '@/lib/careCirclePermissions';

type LinkRow = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'declined';
  profile_id: string | null;
};

const parseJsonArray = (value: unknown, fallbackKey: string) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && Array.isArray((value as Record<string, unknown>)[fallbackKey])) {
    return (value as Record<string, unknown>)[fallbackKey] as unknown[];
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>)[fallbackKey])) {
        return (parsed as Record<string, unknown>)[fallbackKey] as unknown[];
      }
    } catch {
      return [];
    }
  }
  return [];
};

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
      .select('id, requester_id, recipient_id, status, profile_id')
      .eq('id', linkId)
      .maybeSingle();

    if (linkError && linkError.code !== 'PGRST116') {
      return NextResponse.json({ message: linkError.message }, { status: 500 });
    }

    const link = linkRow as LinkRow | null;
    if (!link) {
      return NextResponse.json({ message: 'Care circle link not found.' }, { status: 404 });
    }

    if (link.recipient_id !== user.id || link.status !== 'accepted') {
      return NextResponse.json({ message: 'Not allowed for this care circle member.' }, { status: 403 });
    }

    if (!link.profile_id) {
      return NextResponse.json({ message: 'Owner profile is not available.' }, { status: 404 });
    }

    let permissions: CareCirclePermissions;
    try {
      permissions = await fetchCareCirclePermissions(adminClient, link.requester_id, link.recipient_id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load permissions.';
      return NextResponse.json({ message }, { status: 500 });
    }

    const ownerProfileId = link.profile_id;

    let personal: unknown = null;
    let health: unknown = null;
    let medicalTeam: unknown[] = [];
    let appointments: unknown[] = [];
    let medications: unknown[] = [];

    if (permissions.personal_info) {
      const { data: targetProfile, error: profileError } = await adminClient
        .from('profiles')
        .select('id, display_name, name, phone, gender, address')
        .eq('id', ownerProfileId)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        return NextResponse.json({ message: profileError.message }, { status: 500 });
      }

      if (targetProfile?.id) {
        personal = {
          display_name: targetProfile.display_name?.trim() || targetProfile.name?.trim() || null,
          phone: targetProfile.phone ?? null,
          gender: targetProfile.gender ?? null,
          address: targetProfile.address ?? null,
        };
      }

      const [healthRes, medicalTeamRes] = await Promise.all([
        adminClient
          .from('health')
          .select(
            'date_of_birth, blood_group, bmi, age, current_diagnosed_condition, allergies, ongoing_treatments, current_medication, previous_diagnosed_conditions, past_surgeries, childhood_illness, long_term_treatments'
          )
          .eq('profile_id', ownerProfileId)
          .maybeSingle(),
        adminClient
          .from('user_medical_team')
          .select('doctors')
          .eq('profile_id', ownerProfileId)
          .maybeSingle(),
      ]);

      if (healthRes.error && healthRes.error.code !== 'PGRST116') {
        return NextResponse.json({ message: healthRes.error.message }, { status: 500 });
      }
      if (medicalTeamRes.error && medicalTeamRes.error.code !== 'PGRST116') {
        return NextResponse.json({ message: medicalTeamRes.error.message }, { status: 500 });
      }

      health = healthRes.data ?? null;
      medicalTeam = parseJsonArray(medicalTeamRes.data?.doctors, 'doctors');
    }

    if (permissions.appointments) {
      const { data: appointmentsData, error: appointmentsError } = await adminClient
        .from('user_appointments')
        .select('appointments')
        .eq('profile_id', ownerProfileId)
        .maybeSingle();

      if (appointmentsError && appointmentsError.code !== 'PGRST116') {
        return NextResponse.json({ message: appointmentsError.message }, { status: 500 });
      }
      appointments = parseJsonArray(appointmentsData?.appointments, 'appointments');
    }

    if (permissions.medications) {
      const { data: medicationsData, error: medicationsError } = await adminClient
        .from('user_medications')
        .select('medications')
        .eq('profile_id', ownerProfileId)
        .maybeSingle();

      if (medicationsError && medicationsError.code !== 'PGRST116') {
        return NextResponse.json({ message: medicationsError.message }, { status: 500 });
      }
      medications = parseJsonArray(medicationsData?.medications, 'medications');
    }

    return NextResponse.json({
      permissions,
      personal,
      health,
      medicalTeam,
      appointments,
      medications,
    });
  } catch (error) {
    console.error('Error fetching care circle member details:', error);
    return NextResponse.json(
      { message: 'Failed to fetch care circle member details' },
      { status: 500 }
    );
  }
}
