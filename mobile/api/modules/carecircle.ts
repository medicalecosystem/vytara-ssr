import { apiRequest } from '@/api/client';

type CareCircleStatus = 'pending' | 'accepted' | 'declined';

type CareCircleLink = {
  id: string;
  memberId: string;
  status: CareCircleStatus;
  displayName: string;
  createdAt: string;
  updatedAt?: string | null;
};

export const careCircleApi = {
  getLinks: () => apiRequest<{ outgoing: CareCircleLink[]; incoming: CareCircleLink[] }>(
    '/api/care-circle/links'
  ),

  inviteByContact: (contact: string) =>
    apiRequest<{ recipientId: string }>('/api/care-circle/invite', {
      method: 'POST',
      body: { contact },
    }),
};
