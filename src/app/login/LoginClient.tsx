'use client';

import { supabase } from '@/lib/createClient';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';
import Image from 'next/image';

export default function LoginSignupModal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      setLoading(false);
      alert('Login Failed: Invalid Credentials');
      return;
    }

    const user = data.user;

    setLoading(false);
    alert('Login Successful');
    router.push('/homepage');
  };

  const signInWithGoogle = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'http://vytara-official.vercel.app/auth/callback',
      },
    });

    if (error) {
      alert('Error: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#309898]/20 via-white to-[#FF8000]/20 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#309898] to-[#FF8000]" />

        <div className="p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Image
              src="/vytara-logo.png"
              alt="Vytara Logo"
              width={96}
              height={96}
              className="w-24 h-24"
              priority
            />
          </div>

          <h1 className="text-center text-[#309898] mb-2">Vytara</h1>
          <p className="text-center text-gray-600 mb-6">
            Your Personal Health Companion
          </p>

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-[#309898] mb-2">Email</label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-lg border-2 border-[#309898]/30 focus:border-[#FF8000] focus:outline-none transition text-gray-800"
                placeholder="Enter your Email"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[#309898] mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#309898]/30 focus:border-[#FF8000] focus:outline-none transition text-gray-800"
                  placeholder="Enter your Password"
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Eye
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 cursor-pointer hover:text-[#309898] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#309898] to-[#FF8000] text-white py-3 rounded-lg hover:shadow-lg transition transform hover:scale-105 cursor-pointer"
            >
              {loading ? 'Checking...' : 'Login'}
            </button>

            <button
              onClick={signInWithGoogle}
              className="flex items-center justify-center gap-3 w-full border border-gray-300 rounded-xl py-3 bg-white hover:bg-gray-50 transition-all shadow-sm cursor-pointer"
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="w-5 h-5"
              />
              <span className="text-sm font-medium text-gray-700">
                Sign in with Google
              </span>
            </button>

            <div className="flex justify-between text-sm mt-4">
              <button
                type="button"
                className="text-[#FF8000] hover:underline cursor-pointer"
                onClick={() => router.push('/forgotpassword')}
              >
                Forgot Password?
              </button>

              <button
                type="button"
                className="text-[#309898] hover:underline cursor-pointer"
                onClick={() => router.push('/signup')}
              >
                Sign Up
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
