import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/auth';
import { isValidFileName } from '@/lib/validation';
import { authorizeCareCircleMemberAccess } from '@/lib/careCirclePermissions';

const CARE_CIRCLE_FOLDERS = ['reports', 'prescriptions', 'insurance', 'bills'] as const;
type CareCircleFolder = (typeof CARE_CIRCLE_FOLDERS)[number];

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const linkId = url.searchParams.get('linkId')?.trim();
    const folder = url.searchParams.get('folder') as CareCircleFolder | null;
    const name = url.searchParams.get('name')?.trim() ?? '';

    if (!linkId || !folder || !name) {
      return NextResponse.json({ message: 'Missing required parameters.' }, { status: 400 });
    }

    if (!isValidFileName(name)) {
      return NextResponse.json({ error: 'Invalid file name.' }, { status: 400 });
    }

    if (!CARE_CIRCLE_FOLDERS.includes(folder)) {
      return NextResponse.json({ message: 'Invalid folder.' }, { status: 400 });
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
      requiredPermission: 'vault',
    });

    if (!authResult.ok) {
      return NextResponse.json({ message: authResult.message }, { status: authResult.status });
    }

    const path = `${authResult.access.ownerProfileId}/${folder}/${name}`;
    const { data, error } = await adminClient.storage.from('medical-vault').createSignedUrl(path, 60);

    if (error || !data?.signedUrl) {
      return NextResponse.json({ message: 'Unable to create signed URL.' }, { status: 500 });
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (error) {
    console.error('Error creating care circle vault signed url:', error);
    return NextResponse.json({ message: 'Failed to create signed url' }, { status: 500 });
  }
}
