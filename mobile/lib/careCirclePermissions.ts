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

export const sanitizePermissions = (input: unknown): CareCirclePermissions => {
  const base: CareCirclePermissions = { ...CARE_CIRCLE_DEFAULT_PERMISSIONS };
  if (!input || typeof input !== 'object') return base;
  const record = input as Record<string, unknown>;
  for (const key of CARE_CIRCLE_PERMISSION_KEYS) {
    const value = record[key];
    if (typeof value === 'boolean') base[key] = value;
  }
  return base;
};

export const permissionsEqual = (a: CareCirclePermissions, b: CareCirclePermissions): boolean =>
  CARE_CIRCLE_PERMISSION_KEYS.every((key) => a[key] === b[key]);

export const countGrantedPermissions = (perms: CareCirclePermissions): number =>
  CARE_CIRCLE_PERMISSION_KEYS.reduce((sum, key) => (perms[key] ? sum + 1 : sum), 0);

export const formatPermissionsSummary = (perms: CareCirclePermissions): string => {
  const granted = CARE_CIRCLE_PERMISSION_KEYS.filter((key) => perms[key]);
  if (granted.length === 0) return 'No access granted';
  return granted.map((key) => CARE_CIRCLE_PERMISSION_LABELS[key]).join(', ');
};

export const hasDataAccess = (perms: CareCirclePermissions): boolean =>
  CARE_CIRCLE_PERMISSION_KEYS.some((key) => key !== 'emergency_card' && perms[key]);
