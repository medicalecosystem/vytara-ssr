import { supabase } from '@/lib/supabase';

type PersonalProfile = {
  display_name: string | null;
  phone: string | null;
  gender: string | null;
  address: string | null;
  family_history: unknown;
};

type HealthProfile = {
  date_of_birth: string | null;
  blood_group: string | null;
  bmi: number | null;
  age: number | null;
  current_diagnosed_condition: unknown;
  allergies: unknown;
  ongoing_treatments: unknown;
  current_medication: unknown;
  previous_diagnosed_conditions: unknown;
  past_surgeries: unknown;
  childhood_illness: unknown;
  long_term_treatments: unknown;
};

export const profileApi = {
  getPersonalProfile: (userId: string) =>
    supabase
      .from('personal')
      .select('display_name, phone, gender, address, family_history')
      .eq('id', userId)
      .maybeSingle<PersonalProfile>(),

  getHealthProfile: (userId: string) =>
    supabase
      .from('health')
      .select(
        'date_of_birth, blood_group, bmi, age, current_diagnosed_condition, allergies, ongoing_treatments, current_medication, previous_diagnosed_conditions, past_surgeries, childhood_illness, long_term_treatments'
      )
      .eq('user_id', userId)
      .maybeSingle<HealthProfile>(),
};
