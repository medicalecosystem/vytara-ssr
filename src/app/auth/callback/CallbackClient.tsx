'use client';

import { supabase } from '@/lib/createClient';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CallbackClient() {
  const router = useRouter();

  useEffect(() => {
    const handleOAuth = async () => {
      // 🔑 IMPORTANT: finalize OAuth session
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(window.location.href);

      if (exchangeError) {
        router.replace('/login');
        return;
      }

      // ✅ Now session is guaranteed
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_complete')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile || !profile.profile_complete) {
        router.replace('/app/complete-profile');
        return;
      }

      router.replace('/homepage');
    };

    handleOAuth();
  }, [router]);

  return <p>Signing you in...</p>;
}
