export const MEDICAL_FOLDERS = {
  reports: 'reports',
  prescriptions: 'prescriptions',
  bills: 'bills',
  insurance: 'insurance',
} as const;

export type MedicalFolder = keyof typeof MEDICAL_FOLDERS;
<<<<<<< HEAD
=======

>>>>>>> d691f591826da69abd5b5bb08dc043b4dd11a45d
