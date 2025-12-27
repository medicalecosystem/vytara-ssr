export const MEDICAL_FOLDERS = {
  reports: 'reports',
  prescriptions: 'prescriptions',
  bills: 'bills',
  insurance: 'insurance',
} as const;

export type MedicalFolder = keyof typeof MEDICAL_FOLDERS;

