'use client'

import React from "react";
import { Mail } from "lucide-react";
import logoImage from 'figma:asset/8e191f727b2ef8023e7e4984e9036f679c3d3038.png';
import { useRouter } from 'next/navigation';
import { useState } from "react";
import { supabase } from '@/lib/createClient'
import Image from "next/image";

export default function ForgotPassword() {

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if(!email){
        alert("Please Enter the Email first");
        setLoading(false);
        return;
    }

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {redirectTo: "http://vytara-official.vercel.app/resetpassword"})

    alert("If your Email Exists then you would receive an Email!");
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#309898]/20 via-white to-[#FF8000]/20 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative border-4 border-[#309898]">
        
        {/* Logo */}
        <div className="flex justify-center mb-4">
            <Image
                src="/vytara-logo.png"
                alt="Vytara Logo"
                width={96}
                height={96}
                className='w-24 h-24'
                priority
            />
        </div>

        {/* Title */}
        <h1 className="text-center text-[#309898] text-3xl font-bold mb-2">
          Forgot Password?
        </h1>

        {/* Description */}
        <p className="text-center text-gray-600 mb-6">
          Enter your email address and we'll send you an OTP to reset your password.
        </p>

        <form className="space-y-4" onSubmit={handleReset}>
          
          {/* Email Input */}
          <div>
            <label className="block text-[#309898] mb-2 font-medium">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#309898] w-5 h-5" />
              <input
                type="email"
                placeholder="Enter your email"
                onChange={(e) => setEmail(e.target.value)}
                value={email}
                className="
                w-full
                pl-12 pr-4 py-3
                rounded-xl
                border-2
                border-[#309898]/40
                focus:border-[#FF8000]
                focus:ring-2
                focus:ring-[#FF8000]/40
                focus:outline-none
                transition
                placeholder:text-black
                "
            />
            </div>
          </div>

          {/* Button */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-[#309898] to-[#FF8000] text-white py-3 rounded-lg hover:shadow-lg transition transform hover:scale-105 font-semibold"
          >
            {loading ? "Sending..." : "Send Email"}
          </button>

          {/* Back Button */}
          <div className="text-center mt-6">
            <button
              type="button"
              className="text-[#309898] hover:underline text-sm"
              onClick={() => router.replace('/login')}
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}