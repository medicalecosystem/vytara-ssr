'use client';

import { supabase } from '@/lib/createClient';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CallbackClient() {
  const router = useRouter();

  useEffect(() => {
    async function checkProfile() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        router.replace('/complete-profile');
        return;
      }

      router.push('/homepage');
    }

    checkProfile();
  }, [router]);

  return <p>Checking account...</p>;
}
