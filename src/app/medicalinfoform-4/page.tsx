'use client'

// medicalinfoform-4

import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import logoImage from "figma:asset/8e191f727b2ef8023e7e4984e9036f679c3d3038.png";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from "react";
import { supabase } from "@/lib/createClient";

import Image from "next/image";
import { profile } from "console";

export default function FamilyMedicalHistoryUI() {
  const router = useRouter();

  // STATE
  const [familyMedicalHistory, setFamilyMedicalHistory] = useState([
    { disease: "", relation: "" },
  ]);

  const handlesubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user){
      router.push("/auth/login");
      return;
    }

    const familyData = {
        familyMedicalHistory
    }

    const { error } = await supabase
        .from("profiles")
        .update( {
          family_history: familyData,
          profile_complete: true
        } )
        .eq("user_id", user.id)

    if (error) {
        alert("Erorr: " + error.message);
    } else {
        router.push('/app/homepage')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#309898]/20 via-white to-[#FF8000]/10 flex items-center justify-center p-4">
    <form onSubmit={handlesubmit} className="relative max-w-3xl w-full bg-white rounded-xl shadow-lg overflow-hidden p-6">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#309898] to-[#FF8000]" />
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

        <h2 className="text-center text-[#309898] mb-2">Family Medical History</h2>
        <p className="text-center text-gray-600 mb-6">Section 4/4</p>
          {/* TITLE */}
          <h3 className="text-[#FF8000] mb-2">Family Medical History</h3>

          {/* DYNAMIC ROWS – UI KEPT SAME */}
          {familyMedicalHistory.map((row, index) => (
            <div key={index} className="flex gap-4 items-center relative">

              {/* INPUT */}
              <input
                value={row.disease}
                onChange={(e) => {
                  const updated = [...familyMedicalHistory];
                  updated[index].disease = e.target.value;
                  setFamilyMedicalHistory(updated);
                }}
                placeholder="e.g., Diabetes"
                className="flex-1 px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
              />

              {/* SELECT */}
              <select
                value={row.relation}
                onChange={(e) => {
                  const updated = [...familyMedicalHistory];
                  updated[index].relation = e.target.value;
                  setFamilyMedicalHistory(updated);
                }}
                className="flex-1 px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
              >
                <option value="">Select Relation</option>
                <option>Father</option>
                <option>Mother</option>
                <option>Brother</option>
                <option>Sister</option>
                <option>Grandparents</option>
              </select>

              {/* REMOVE BUTTON */}
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setFamilyMedicalHistory(
                      familyMedicalHistory.filter((_, i) => i !== index)
                    );
                  }}
                  className="text-red-500"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}

          {/* ADD BUTTON */}
          <button
            type="button"
            onClick={() =>
              setFamilyMedicalHistory([
                ...familyMedicalHistory,
                { disease: "", relation: "" },
              ])
            }
            className="flex items-center gap-2 text-[#FF8000] cursor-pointer"
          >
            <Plus className="w-5 h-5" /> Add More
          </button>

          {/* NEXT BUTTON */}
          <div className="flex justify-end mt-8">
            <button
              type="submit"
              className="flex items-center gap-2 bg-[#FF8000] text-white px-6 py-2 rounded-lg hover:bg-[#309898] cursor-pointer"
            >
              Next <ChevronRight />
            </button>
          </div>
    </form>
    </div>
  );
}
