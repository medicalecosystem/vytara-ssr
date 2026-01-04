'use client';

import { supabase } from "@/lib/createClient";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CallbackClient(){
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if ( error || !data.session ) {
        router.replace('/login');
        return;
      }

      const user = data.session.user;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('login_check')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile || profile.login_check !== true) {
        await supabase.auth.signOut();
        alert("No account found. Please Sign up First");
        router.replace('/signup');
        return;
      }

      router.replace('/app/homepage');
    };

    handleAuth();
  }, [router])

  return <p>Finalizing Authentication</p>;
}