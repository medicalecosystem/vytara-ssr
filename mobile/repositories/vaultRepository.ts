import { vaultApi } from '@/api';
import type { MedicalFolder } from '@/constants/medicalFolders';

export const vaultRepository = {
  listFiles: (userId: string, folder: MedicalFolder) => vaultApi.listFiles(userId, folder),
};
