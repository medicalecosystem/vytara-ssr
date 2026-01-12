/*
'use client';

import { supabase } from '@/lib/createClient';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CallbackClient() {
  const router = useRouter();

  useEffect(() => {
    const finalizeAuth = async () => {
      // ?? VERY IMPORTANT: initialize session from email link
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        router.replace('/auth/login');
        return;
      }

      const user = data.session.user;

      // ?? Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('profile_complete')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        router.replace('/auth/signup');
        return;
      }

      // ? IF medical form NOT completed ? go there
      if (profile.profile_complete === false) {
        router.replace('/medicalinfoform-1');
        return;
      }

      // ? IF completed ? homepage
      router.replace('/app/homepage');
    };

    finalizeAuth();
  }, [router]);

  return <p>Finalizing your account...</p>;
}
*/
