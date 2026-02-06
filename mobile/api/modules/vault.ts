import { supabase } from '@/lib/supabase';
import type { MedicalFolder } from '@/constants/medicalFolders';

export type VaultFile = {
  name: string;
  created_at: string;
};

// NOTE: These are stubs. In many apps you'd use Supabase Storage APIs
// and signed URLs behind an API. This keeps the interface stable.
export const vaultApi = {
  listFiles: async (userId: string, folder: MedicalFolder) => {
    const { data, error } = await supabase.storage
      .from('medical-vault')
      .list(`${userId}/${folder}`, {
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) return { data: null, error };

    return {
      data: (data ?? []).map((file) => ({
        name: file.name,
        created_at: file.created_at ?? new Date().toISOString(),
      })) as VaultFile[],
      error: null,
    };
  },
  getSignedUrl: async (path: string, expiresInSeconds = 60 * 5) => {
    const { data, error } = await supabase.storage
      .from('medical-vault')
      .createSignedUrl(path, expiresInSeconds);
    if (error) return { data: null, error };
    return { data, error: null };
  },
  uploadFile: async (
    userId: string,
    folder: MedicalFolder,
    file: { uri: string; name: string; mimeType?: string | null },
    targetName?: string
  ) => {
    const response = await fetch(file.uri);
    const blob = await response.blob();
    const name = targetName ?? file.name;
    const path = `${userId}/${folder}/${name}`;
    const { data, error } = await supabase.storage.from('medical-vault').upload(path, blob, {
      contentType: file.mimeType ?? undefined,
      upsert: false,
    });
    if (error) return { data: null, error };
    return { data, error: null };
  },
  deleteFile: async (path: string) => {
    const { data, error } = await supabase.storage.from('medical-vault').remove([path]);
    if (error) return { data: null, error };
    return { data, error: null };
  },
  renameFile: async (fromPath: string, toPath: string) => {
    const { data, error } = await supabase.storage.from('medical-vault').move(fromPath, toPath);
    if (error) return { data: null, error };
    return { data, error: null };
  },
};
