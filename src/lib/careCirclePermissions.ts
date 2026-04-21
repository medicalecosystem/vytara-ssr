import type { SupabaseClient } from '@supabase/supabase-js';

export type CareCirclePermissionKey =
  | 'emergency_card'
  | 'appointments'
  | 'medications'
  | 'vault'
  | 'personal_info'
  | 'activity_log';

export type CareCirclePermissions = Record<CareCirclePermissionKey, boolean>;

export const CARE_CIRCLE_PERMISSION_KEYS: readonly CareCirclePermissionKey[] = [
  'emergency_card',
  'appointments',
  'medications',
  'vault',
  'personal_info',
  'activity_log',
] as const;

export const CARE_CIRCLE_PERMISSION_LABELS: Record<CareCirclePermissionKey, string> = {
  emergency_card: 'Emergency card',
  appointments: 'Appointments',
  medications: 'Medications',
  vault: 'Vault',
  personal_info: 'Personal info',
  activity_log: 'Activity log',
};

export const CARE_CIRCLE_PERMISSION_DESCRIPTIONS: Record<CareCirclePermissionKey, string> = {
  emergency_card: 'Always-available summary for first responders and trusted contacts.',
  appointments: 'View, add, and manage appointments shared with this member.',
  medications: 'View, add, and manage medications shared with this member.',
  vault: 'View, upload, rename, and delete documents in the shared vault.',
  personal_info: 'Profile details, health details, and medical team.',
  activity_log: 'Recent activity history for this profile.',
};

export const CARE_CIRCLE_DEFAULT_PERMISSIONS: CareCirclePermissions = {
  emergency_card: true,
  appointments: false,
  medications: false,
  vault: false,
  personal_info: false,
  activity_log: false,
};

type PermissionRow = {
  perm_emergency_card: boolean | null;
  perm_appointments: boolean | null;
  perm_medications: boolean | null;
  perm_vault: boolean | null;
  perm_personal_info: boolean | null;
  perm_activity_log: boolean | null;
};

export const PERMISSION_ROW_COLUMNS =
  'perm_emergency_card, perm_appointments, perm_medications, perm_vault, perm_personal_info, perm_activity_log';

export const rowToPermissions = (row: PermissionRow | null | undefined): CareCirclePermissions => ({
  emergency_card: row?.perm_emergency_card ?? CARE_CIRCLE_DEFAULT_PERMISSIONS.emergency_card,
  appointments: row?.perm_appointments ?? CARE_CIRCLE_DEFAULT_PERMISSIONS.appointments,
  medications: row?.perm_medications ?? CARE_CIRCLE_DEFAULT_PERMISSIONS.medications,
  vault: row?.perm_vault ?? CARE_CIRCLE_DEFAULT_PERMISSIONS.vault,
  personal_info: row?.perm_personal_info ?? CARE_CIRCLE_DEFAULT_PERMISSIONS.personal_info,
  activity_log: row?.perm_activity_log ?? CARE_CIRCLE_DEFAULT_PERMISSIONS.activity_log,
});

export const permissionsToRow = (perms: Partial<CareCirclePermissions>) => {
  const out: Partial<PermissionRow> = {};
  if (perms.emergency_card !== undefined) out.perm_emergency_card = perms.emergency_card;
  if (perms.appointments !== undefined) out.perm_appointments = perms.appointments;
  if (perms.medications !== undefined) out.perm_medications = perms.medications;
  if (perms.vault !== undefined) out.perm_vault = perms.vault;
  if (perms.personal_info !== undefined) out.perm_personal_info = perms.personal_info;
  if (perms.activity_log !== undefined) out.perm_activity_log = perms.activity_log;
  return out;
};

export const sanitizePermissionInput = (
  input: Partial<Record<string, unknown>> | null | undefined
): Partial<CareCirclePermissions> => {
  if (!input || typeof input !== 'object') return {};
  const out: Partial<CareCirclePermissions> = {};
  for (const key of CARE_CIRCLE_PERMISSION_KEYS) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === 'boolean') out[key] = value;
  }
  return out;
};

export async function fetchCareCirclePermissions(
  adminClient: SupabaseClient,
  ownerUserId: string,
  recipientId: string
): Promise<CareCirclePermissions> {
  const { data, error } = await adminClient
    .from('care_circle_permissions')
    .select(PERMISSION_ROW_COLUMNS)
    .eq('owner_user_id', ownerUserId)
    .eq('recipient_id', recipientId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return rowToPermissions(data as PermissionRow | null);
}

export async function fetchCareCirclePermissionsMap(
  adminClient: SupabaseClient,
  ownerUserId: string,
  recipientIds: string[]
): Promise<Map<string, CareCirclePermissions>> {
  const result = new Map<string, CareCirclePermissions>();
  if (!recipientIds.length) return result;

  const { data, error } = await adminClient
    .from('care_circle_permissions')
    .select(`recipient_id, ${PERMISSION_ROW_COLUMNS}`)
    .eq('owner_user_id', ownerUserId)
    .in('recipient_id', recipientIds);

  if (error) throw error;

  for (const row of (data as Array<PermissionRow & { recipient_id: string }>) ?? []) {
    result.set(row.recipient_id, rowToPermissions(row));
  }

  for (const rid of recipientIds) {
    if (!result.has(rid)) result.set(rid, { ...CARE_CIRCLE_DEFAULT_PERMISSIONS });
  }

  return result;
}

export async function upsertCareCirclePermissions(
  adminClient: SupabaseClient,
  ownerUserId: string,
  recipientId: string,
  perms: Partial<CareCirclePermissions>
): Promise<CareCirclePermissions> {
  const payload = {
    owner_user_id: ownerUserId,
    recipient_id: recipientId,
    ...permissionsToRow(perms),
  };

  const { data, error } = await adminClient
    .from('care_circle_permissions')
    .upsert(payload, { onConflict: 'owner_user_id,recipient_id' })
    .select(PERMISSION_ROW_COLUMNS)
    .single();

  if (error) throw error;
  return rowToPermissions(data as PermissionRow);
}

export const hasPermission = (
  perms: CareCirclePermissions | null | undefined,
  key: CareCirclePermissionKey
): boolean => Boolean(perms?.[key]);

type MemberLinkRow = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'declined';
  profile_id: string | null;
};

export type AuthorizedMemberAccess = {
  linkId: string;
  ownerUserId: string;
  ownerProfileId: string;
  actorUserId: string;
  permissions: CareCirclePermissions;
};

/**
 * Looks up a care_circle_links row by id, verifies that the current user is the
 * accepted recipient, and confirms they have the required permission on the
 * owner's (owner_user_id, recipient_id) permissions record.
 */
export async function authorizeCareCircleMemberAccess(params: {
  adminClient: SupabaseClient;
  user: { id: string };
  linkId: string;
  requiredPermission: CareCirclePermissionKey;
}): Promise<
  | { ok: true; access: AuthorizedMemberAccess }
  | { ok: false; status: number; message: string }
> {
  const { adminClient, user, linkId, requiredPermission } = params;

  const { data: linkRow, error: linkError } = await adminClient
    .from('care_circle_links')
    .select('id, requester_id, recipient_id, status, profile_id')
    .eq('id', linkId)
    .maybeSingle();

  if (linkError && linkError.code !== 'PGRST116') {
    return { ok: false, status: 500, message: linkError.message };
  }

  const link = linkRow as MemberLinkRow | null;
  if (!link) {
    return { ok: false, status: 404, message: 'Care circle link not found.' };
  }

  if (link.recipient_id !== user.id || link.status !== 'accepted') {
    return { ok: false, status: 403, message: 'Not allowed for this care circle member.' };
  }

  if (!link.profile_id) {
    return { ok: false, status: 404, message: 'Owner profile is not available.' };
  }

  let permissions: CareCirclePermissions;
  try {
    permissions = await fetchCareCirclePermissions(adminClient, link.requester_id, link.recipient_id);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load permissions.';
    return { ok: false, status: 500, message };
  }

  if (!permissions[requiredPermission]) {
    return { ok: false, status: 403, message: 'Not allowed for this care circle member.' };
  }

  return {
    ok: true,
    access: {
      linkId: link.id,
      ownerUserId: link.requester_id,
      ownerProfileId: link.profile_id,
      actorUserId: user.id,
      permissions,
    },
  };
}
