import { careCircleApi } from '@/api';

export const careCircleRepository = {
  getLinks: () => careCircleApi.getLinks(),
  inviteByContact: (contact: string) => careCircleApi.inviteByContact(contact),
};
