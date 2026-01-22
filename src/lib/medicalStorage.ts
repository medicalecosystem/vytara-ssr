import { supabase } from './createClient';
import { MedicalFolder } from '@/constants/medicalFolders';

export async function uploadMedicalFile(
  userId: string,
  folder: MedicalFolder,
  file: File
) {
  const filePath = `${userId}/${folder}/${crypto.randomUUID()}-${file.name}`;

  return supabase.storage
    .from('medical-vault')
    .upload(filePath, file, { upsert: false });
}

export async function listMedicalFiles(
  userId: string,
  folder: MedicalFolder
) {
  return supabase.storage
    .from('medical-vault')
    .list(`${userId}/${folder}`, {
      sortBy: { column: 'created_at', order: 'desc' },
    });
}

export async function deleteMedicalFile(path: string) {
  return supabase.storage
    .from('medical-vault')
    .remove([path]);
}

export async function getSignedUrl(path: string) {
  return supabase.storage
    .from('medical-vault')
    .createSignedUrl(path, 60);
}