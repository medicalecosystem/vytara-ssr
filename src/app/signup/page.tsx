'use client';

import { useState } from 'react';
import logoImage from 'figma:asset/8e191f727b2ef8023e7e4984e9036f679c3d3038.png';
import { supabase } from '@/lib/createClient'
import { error } from 'console';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // const navigate = useNavigate();
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword){
      alert("Missing info! Please Check again");
      return;
    }
    if (password != confirmPassword){
      alert("Passwords dont match! Please Check again");
      return;
    }
    setLoading(true);
    try{
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: "https://vytara-official.vercel.app/verified"
        }
      });
      if (error) throw error;

      alert("Sign Up Succesful");
      router.push('/confirmemail');
    } catch {
      alert("Sign Up Failed");
      console.error
    } finally {
      setLoading(false);
    }
  }

  const signInWithGoogle = async(e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
      const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "http://vytara-official/medicalinfoform-1",
          
      },
    });
  
    if (error){
      alert("Error: " + error.message);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#309898]/20 via-white to-[#FF8000]/10 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-[#309898]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#FF8000]/5 rounded-full blur-3xl"></div>
      </div>

      <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#309898] to-[#FF8000]"></div>
          
          <div className="p-8">
            <div className="flex justify-center mb-6">
              <Image
                src="/vytara-logo.png"
                alt="Vytara Logo"
                width={96}
                height={96}
                className='w-24 h-24'
                priority
              />
            </div>
            
            <h1 className="text-center text-[#309898] mb-2">Vytara</h1>
            <p className="text-center text-gray-600 mb-6">Create Your Account</p>

            <form className="space-y-4" onSubmit={handleSignup}>
              <div>
                <label className="block text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#309898] focus:outline-none transition-colors text-gray-800"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#309898] focus:outline-none transition-colors text-gray-800"
                  placeholder="Create a password"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#309898] focus:outline-none transition-colors text-gray-800"
                  placeholder="Confirm your password"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-yellow-400 text-white py-3 rounded-xl hover:shadow-lg transition-allw-full bg-gradient-to-r from-[#309898] to-[#FF8000] text-white py-3 rounded-lg hover:shadow-lg transition transform hover:scale-105 cursor-pointer"
              >
              {loading ? "Checking..." : "SignUp"}
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

              <div className="text-center mt-4">
                <p className="text-gray-600 mb-2">Already have an account?</p>
                <a href="/login" className="text-[#309898] hover:underline font-medium" onClick={() => router.push('/login')}>
                  Login here
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
