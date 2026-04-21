import { careCircleApi } from '@/api';
import type { VaultCategory, VaultFolder } from '@/api/modules/carecircle';
import type { CareCirclePermissions } from '@/lib/careCirclePermissions';

export const careCircleRepository = {
  getLinks: (profileId?: string) => careCircleApi.getLinks(profileId),
  inviteByContact: (
    contact: string,
    profileId: string,
    permissions?: CareCirclePermissions
  ) => careCircleApi.inviteByContact(contact, profileId, permissions),
  respondToInvite: (linkId: string, decision: 'accepted' | 'declined') => careCircleApi.respondToInvite(linkId, decision),
  getPermissions: (linkId: string) => careCircleApi.getPermissions(linkId),
  updatePermissions: (linkId: string, permissions: Partial<CareCirclePermissions>) =>
    careCircleApi.updatePermissions(linkId, permissions),
  getMemberDetails: (linkId: string) => careCircleApi.getMemberDetails(linkId),
  getMemberVault: (linkId: string, category?: VaultCategory) => careCircleApi.getMemberVault(linkId, category),
  getMemberVaultSignedUrl: (linkId: string, folder: string, name: string) => careCircleApi.getMemberVaultSignedUrl(linkId, folder, name),
  uploadMemberVaultFile: (
    linkId: string,
    folder: VaultFolder,
    file: { uri: string; name: string; mimeType?: string | null },
    fileName?: string,
    actorProfileId?: string
  ) => careCircleApi.uploadMemberVaultFile(linkId, folder, file, fileName, actorProfileId),
  renameMemberVaultFile: (
    linkId: string,
    folder: VaultFolder,
    name: string,
    nextName: string,
    actorProfileId?: string
  ) => careCircleApi.renameMemberVaultFile(linkId, folder, name, nextName, actorProfileId),
  deleteMemberVaultFile: (
    linkId: string,
    folder: VaultFolder,
    name: string,
    actorProfileId?: string
  ) => careCircleApi.deleteMemberVaultFile(linkId, folder, name, actorProfileId),
  getActivity: (limit?: number, sinceHours?: number) => careCircleApi.getActivity(limit, sinceHours),
};
