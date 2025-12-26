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
        router.replace('/login');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('login_check')
        .eq('user_id', user.id)
        .single();

      // 🚫 Block access unless login_check === true
      if (!profile || error || profile.login_check !== true) {
        await supabase.auth.signOut();
        alert("No Account found please Sign Up first")
        router.replace('/signup');
        return;
      }

      router.replace('/homepage');
    }

    checkProfile();
  }, [router]);

  return <p>Checking account...</p>;
}
