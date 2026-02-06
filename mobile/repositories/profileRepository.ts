import { profileApi } from '@/api';

export const profileRepository = {
  getPersonalProfile: async (userId: string) => {
    const { data, error } = await profileApi.getPersonalProfile(userId);
    if (error) throw error;
    return data;
  },

  getHealthProfile: async (userId: string) => {
    const { data, error } = await profileApi.getHealthProfile(userId);
    if (error) throw error;
    return data;
  },
};
