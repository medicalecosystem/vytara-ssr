'use client';

// medicalinfoform-3

import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from "react";
import { supabase } from "@/lib/createClient";
import Image from "next/image";

export default function PastMedicalHistoryUI() {
  const router = useRouter();

  // STATES
  const [diagnosedCondition, setDiagnosedCondition] = useState([""]);
  const [pastSurgeries, setPastSurgeries] = useState([{ name: "", date: "" }]);
  const [hospitalization, setHospitalization] = useState([{ reason: "", date: "" }]);
  const [pastInjury, setPastInjury] = useState([""]);
  const [childhoodIllness, setChildhoodIllness] = useState([""]);
  const [pastMedications, setPastMedications] = useState([""]);
  const [longTermTreatments, setLongTermTreatments] = useState([""]);

  const handlePastMedical = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { 
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user){
      router.push("/login");
      return;
    } 
    
    const pastData = {
        diagnosedCondition,
        pastSurgeries,
        hospitalization,
        pastInjury,
        childhoodIllness,
        pastMedications,
        longTermTreatments,
    }
    const { error } = await supabase
        .from("profiles")
        .update( { past_medical_info: pastData } )
        .eq("user_id", user.id)

    if (error) {
        alert("Error: " + error.message);
    } else {
        router.push('/medicalinfoform-4');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#309898]/20 via-white to-[#FF8000]/10 flex items-center justify-center p-4">
    <form onSubmit={handlePastMedical} className="relative max-w-3xl w-full bg-white rounded-xl shadow-lg overflow-hidden p-6">
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

        <h2 className="text-center text-[#309898] mb-2">Past Medical History</h2>
        <p className="text-center text-gray-600 mb-6">Section 3/4</p>

          {/* ---------------------------------------------- */}
          {/* PREVIOUSLY DIAGNOSED DISEASES */}
          {/* ---------------------------------------------- */}
          <div className="space-y-4">
            <h3 className="text-[#FF8000] mb-4">Previously Diagnosed Diseases</h3>

            {diagnosedCondition.map((diag, index) => (
              <div className="flex gap-2 items-center" key={index}>
                <input
                  value={diag}
                  onChange={(e) => {
                    const updated = [...diagnosedCondition];
                    updated[index] = e.target.value;
                    setDiagnosedCondition(updated);
                  }}
                  placeholder="e.g., Thyroid, Jaundice"
                  className="flex-1 px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                />

                {index > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setDiagnosedCondition(diagnosedCondition.filter((_, i) => i !== index))
                    }
                    className="text-[#FF8000]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={() => setDiagnosedCondition([...diagnosedCondition, ""])}
              className="flex items-center gap-2 text-[#FF8000] cursor-pointer"
            >
              <Plus className="w-5 h-5" /> Add Diagnosed Condition
            </button>
          </div>

          {/* ---------------------------------------------- */}
          {/* PAST SURGERIES */}
          {/* ---------------------------------------------- */}
          <div className="space-y-4">
            <h3 className="text-[#FF8000] mb-4">Past Surgeries</h3>

            {pastSurgeries.map((surg, index) => (
              <div key={index} className="p-4 border rounded-lg bg-gray-50 space-y-3 relative text-gray-800">

                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => setPastSurgeries(pastSurgeries.filter((_, i) => i !== index))}
                    className="absolute top-2 right-2 text-red-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}

                <input
                  value={surg.name}
                  onChange={(e) => {
                    const updated = [...pastSurgeries];
                    updated[index].name = e.target.value;
                    setPastSurgeries(updated);
                  }}
                  placeholder="Surgery Name"
                  className="w-full px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                />

                <input
                  type="date"
                  value={surg.date}
                  onChange={(e) => {
                    const updated = [...pastSurgeries];
                    updated[index].date = e.target.value;
                    setPastSurgeries(updated);
                  }}
                  className="w-full px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                />
              </div>
            ))}

            <button
              type="button"
              onClick={() => setPastSurgeries([...pastSurgeries, { name: "", date: "" }])}
              className="flex items-center gap-2 text-[#FF8000] cursor-pointer"
            >
              <Plus className="w-5 h-5" /> Add Surgery
            </button>
          </div>

          {/* ---------------------------------------------- */}
          {/* HOSPITALIZATIONS */}
          {/* ---------------------------------------------- */}
          <div className="space-y-4">
            <h3 className="text-[#FF8000] mb-4">Hospitalizations</h3>

            {hospitalization.map((hosp, index) => (
              <div key={index} className="p-4 border rounded-lg bg-gray-50 space-y-3 relative">

                {index > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setHospitalization(hospitalization.filter((_, i) => i !== index))
                    }
                    className="absolute top-2 right-2 text-red-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}

                <input
                  value={hosp.reason}
                  onChange={(e) => {
                    const updated = [...hospitalization];
                    updated[index].reason = e.target.value;
                    setHospitalization(updated);
                  }}
                  placeholder="Hospital / Reason"
                  className="w-full px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                />

                <input
                  type="date"
                  value={hosp.date}
                  onChange={(e) => {
                    const updated = [...hospitalization];
                    updated[index].date = e.target.value;
                    setHospitalization(updated);
                  }}
                  className="w-full px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                />
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                setHospitalization([...hospitalization, { reason: "", date: "" }])
              }
              className="flex items-center gap-2 text-[#FF8000] cursor-pointer"
            >
              <Plus className="w-5 h-5" /> Add Hospitalization
            </button>
          </div>

          {/* ---------------------------------------------- */}
          {/* PAST INJURIES */}
          {/* ---------------------------------------------- */}
          <div className="space-y-4">
            <h3 className="text-[#FF8000] mb-4">Past Injuries</h3>

            {pastInjury.map((inj, index) => (
              <div key={index} className="flex gap-2 items-center">

                <input
                  value={inj}
                  onChange={(e) => {
                    const updated = [...pastInjury];
                    updated[index] = e.target.value;
                    setPastInjury(updated);
                  }}
                  placeholder="e.g., Fractured Arm"
                  className="flex-1 px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                />

                {index > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setPastInjury(pastInjury.filter((_, i) => i !== index))
                    }
                    className="text-[#FF8000]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={() => setPastInjury([...pastInjury, ""])}
              className="flex items-center gap-2 text-[#FF8000] cursor-pointer"
            >
              <Plus className="w-5 h-5" /> Add Injury
            </button>
          </div>

          {/* ---------------------------------------------- */}
          {/* CHILDHOOD ILLNESSES */}
          {/* ---------------------------------------------- */}
          <div className="space-y-4">
            <h3 className="text-[#FF8000] mb-4">Childhood Illnesses</h3>

            {childhoodIllness.map((ill, index) => (
              <div key={index} className="flex gap-2 items-center">

                <input
                  value={ill}
                  onChange={(e) => {
                    const updated = [...childhoodIllness];
                    updated[index] = e.target.value;
                    setChildhoodIllness(updated);
                  }}
                  placeholder="e.g., Chickenpox"
                  className="flex-1 px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                />

                {index > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setChildhoodIllness(childhoodIllness.filter((_, i) => i !== index))
                    }
                    className="text-[#FF8000]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}

              </div>
            ))}

            <button
              type="button"
              onClick={() => setChildhoodIllness([...childhoodIllness, ""])}
              className="flex items-center gap-2 text-[#FF8000] cursor-pointer"
            >
              <Plus className="w-5 h-5" /> Add Childhood Illness
            </button>
          </div>

          {/* ---------------------------------------------- */}
          {/* PAST MEDICATIONS */}
          {/* ---------------------------------------------- */}
          <div className="space-y-4">
            <h3 className="text-[#FF8000] mb-4">Past Medications Taken</h3>

            {pastMedications.map((med, index) => (
              <div key={index} className="flex gap-2 items-center">

                <input
                  value={med}
                  onChange={(e) => {
                    const updated = [...pastMedications];
                    updated[index] = e.target.value;
                    setPastMedications(updated);
                  }}
                  placeholder="e.g., Antibiotics"
                  className="flex-1 px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                />

                {index > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setPastMedications(pastMedications.filter((_, i) => i !== index))
                    }
                    className="text-[#FF8000]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={() => setPastMedications([...pastMedications, ""])}
              className="flex items-center gap-2 text-[#FF8000] cursor-pointer"
            >
              <Plus className="w-5 h-5" /> Add Medication
            </button>
          </div>

          {/* ---------------------------------------------- */}
          {/* LONG-TERM TREATMENTS */}
          {/* ---------------------------------------------- */}
          <div className="space-y-4">
            <h3 className="text-[#FF8000] mb-4">Long-Term Treatments (Previously Taken)</h3>

            {longTermTreatments.map((treat, index) => (
              <div key={index} className="flex gap-2 items-center">

                <input
                  value={treat}
                  onChange={(e) => {
                    const updated = [...longTermTreatments];
                    updated[index] = e.target.value;
                    setLongTermTreatments(updated);
                  }}
                  placeholder="e.g., Physical Therapy"
                  className="flex-1 px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                />

                {index > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setLongTermTreatments(longTermTreatments.filter((_, i) => i !== index))
                    }
                    className="text-[#FF8000]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={() => setLongTermTreatments([...longTermTreatments, ""])}
              className="flex items-center gap-2 text-[#FF8000] cursor-pointer"
            >
              <Plus className="w-5 h-5" /> Add Treatment
            </button>
          </div>
            <div className="flex justify-between mt-8">
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
