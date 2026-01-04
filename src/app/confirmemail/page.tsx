'use client'

import Image from "next/image";

export default function ConfirmationEmailPage() {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#309898]/20 via-white to-[#FF8000]/20 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative border-4 border-[#309898]">

        {/* Logo */}
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

        <h1 className="text-center text-[#309898] mb-2 text-2xl font-semibold">
          Vytara
        </h1>

        <p className="text-center text-gray-600 mb-6">
          Your Personal Health Companion
        </p>

        <div className="text-center space-y-4 pt-4 pb-6">
          <h2 className="text-xl font-semibold text-[#309898]">
            Confirmation Email Sent
          </h2>

          <p className="text-gray-600 px-6">
            We've sent a verification link to your email.  
            Please check your inbox and follow the instructions to activate your account.
          </p>
        </div>

        <div className="text-center mt-6">
          <button className="bg-gradient-to-r from-[#309898] to-[#FF8000] text-white px-6 py-3 rounded-lg hover:shadow-lg transition transform hover:scale-105 cursor-pointer" onClick={() => window.location.href = "https://www.gmail.com"}>
             Open Gmail
          </button>

          {/* <p className="text-gray-600 mt-4 text-sm">
            Didn’t receive the mail? <span className="text-[#309898] hover:underline cursor-pointer">Resend</span>
          </p> */}
        </div>

      </div>
    </div>
  );
}
