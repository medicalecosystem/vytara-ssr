'use client'

import { ChevronRight, Plus, X } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from "react";
import { supabase } from "@/lib/createClient";
import Image from "next/image";

export default function HealthInfoFormUI() {
  const router = useRouter();
  const [conditions, setConditions] = useState([""]);
  const [currentMedications, setCurrentMedications] = useState([
    { name: "", dosage: "", frequency: "", purpose: "" },
  ]);
  const [allergies, setAllergies] = useState([""]);
  const [treatments, setTreatments] = useState([""]);
  const [doctor, setDoctor] = useState([
    { name: "", phone: "", speciality: "" }
  ]);

  const handleNext = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user){
      router.push("/auth/login");
      return;
    }

    const healthData = {
      conditions,
      currentMedications,
      allergies,
      treatments,
      doctor
    };

    const { error } = await supabase
      .from("profiles")
      .update({ health: healthData })
      .eq("user_id", user.id);

    if (error) {
      alert("Error: " + error.message);
    } else {
      router.push("/medicalinfoform-3");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#309898]/20 via-white to-[#FF8000]/10 flex items-center justify-center p-4">
      <form onSubmit={handleNext} className="relative max-w-3xl w-full bg-white rounded-xl shadow-lg overflow-hidden p-6">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#309898] to-[#FF8000]" />
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
          <h2 className="text-center text-[#309898] mb-2">Health Information</h2>
          <p className="text-center text-gray-600 mb-6">Section 2/4</p>
            {/* CONDITIONS */}
            <div className="space-y-4">
              <h3 className="text-[#FF8000] mb-4">Current Diagnosed Conditions</h3>

              {conditions.map((cond, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    value={cond}
                    onChange={(e) => {
                      const updated = [...conditions];
                      updated[index] = e.target.value;
                      setConditions(updated);
                    }}
                    placeholder="e.g., Diabetes, Asthma"
                    className="flex-1 px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                  />

                  {index > 0 && (
                    <button
                      type="button"
                      className="text-red-500"
                      onClick={() =>
                        setConditions(conditions.filter((_, i) => i !== index))
                      }
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={() => setConditions([...conditions, ""])}
                type="button"
                className="flex items-center gap-2 text-[#FF8000] cursor-pointer"
              >
                <Plus className="w-5 h-5" /> Add Condition
              </button>
            </div>

            {/* MEDICATIONS */}
            <div className="space-y-4">
              <h3 className="text-[#FF8000] mb-4">Current Medications</h3>

              {currentMedications.map((med, index) => (
                <div
                  key={index}
                  className="p-4 border-2 border-[#309898]/30 rounded-lg bg-gray-50 space-y-3 relative"
                >
                  {index > 0 && (
                    <button
                      type="button"
                      className="absolute top-2 right-2 text-red-500"
                      onClick={() =>
                        setCurrentMedications(currentMedications.filter((_, i) => i !== index))
                      }
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[#309898] mb-2">Medication Name</label>
                      <input
                        value={med.name}
                        onChange={(e) => {
                          const updated = [...currentMedications];
                          updated[index].name = e.target.value;
                          setCurrentMedications(updated);
                        }}
                        placeholder="e.g., Metformin"
                        className="w-full px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[#309898] mb-2">Dosage</label>
                      <input
                        value={med.dosage}
                        onChange={(e) => {
                          const updated = [...currentMedications];
                          updated[index].dosage = e.target.value;
                          setCurrentMedications(updated);
                        }}
                        placeholder="e.g., 500 mg"
                        className="w-full px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[#309898] mb-2">Frequency</label>
                      <input
                        value={med.frequency}
                        onChange={(e) => {
                          const updated = [...currentMedications];
                          updated[index].frequency = e.target.value;
                          setCurrentMedications(updated);
                        }}
                        placeholder="e.g., Twice a day"
                        className="w-full px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[#309898] mb-2">Purpose</label>
                      <input
                        value={med.purpose}
                        onChange={(e) => {
                          const updated = [...currentMedications];
                          updated[index].purpose = e.target.value;
                          setCurrentMedications(updated);
                        }}
                        placeholder="e.g., Blood sugar control"
                        className="w-full px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setCurrentMedications([
                    ...currentMedications,
                    { name: "", dosage: "", frequency: "", purpose: "" },
                  ])
                }
                className="flex items-center gap-2 text-[#FF8000] cursor-pointer"
              >
                <Plus className="w-5 h-5" /> Add Medication
              </button>
            </div>

            {/* ALLERGIES */}
            <div className="space-y-4">
              <h3 className="text-[#FF8000] mb-4">Allergies</h3>

              {allergies.map((allergy, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    value={allergy}
                    onChange={(e) => {
                      const updated = [...allergies];
                      updated[index] = e.target.value;
                      setAllergies(updated);
                    }}
                    placeholder="e.g., Peanuts, Penicillin"
                    className="flex-1 px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                  />

                  {index > 0 && (
                    <button
                      type="button"
                      className="text-red-500"
                      onClick={() =>
                        setAllergies(allergies.filter((_, i) => i !== index))
                      }
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => setAllergies([...allergies, ""])}
                className="flex items-center gap-2 text-[#FF8000] cursor-pointer"
              >
                <Plus className="w-5 h-5" /> Add Allergy
              </button>
            </div>

            {/* TREATMENTS */}
            <div className="space-y-4">
              <h3 className="text-[#FF8000] mb-4">Ongoing Treatments</h3>

              {treatments.map((treat, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    value={treat}
                    onChange={(e) => {
                      const updated = [...treatments];
                      updated[index] = e.target.value;
                      setTreatments(updated);
                    }}
                    placeholder="e.g., Physiotherapy, Dialysis"
                    className="flex-1 px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                  />

                  {index > 0 && (
                    <button
                      type="button"
                      className="text-red-500"
                      onClick={() =>
                        setTreatments(treatments.filter((_, i) => i !== index))
                      }
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => setTreatments([...treatments, ""])}
                className="flex items-center gap-2 text-[#FF8000] cursor-pointer"
              >
                <Plus className="w-5 h-5" /> Add Treatment
              </button>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-[#FF8000] mb-4">Current Doctor</h3>

              {doctor.map((doc, index) => (
                <div
                  key={index}
                  className="p-4 border-2 border-[#309898]/30 rounded-lg bg-gray-50 space-y-3 relative"
                >
                  {index > 0 && (
                    <button
                      type="button"
                      className="absolute top-2 right-2 text-red-500"
                      onClick={() =>
                        setDoctor(doctor.filter((_, i) => i !== index))
                      }
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[#309898] mb-2">Doctor Name</label>
                      <input
                        value={doc.name}
                        onChange={(e) => {
                          const updated = [...doctor];
                          updated[index].name = e.target.value;
                          setDoctor(updated);
                        }}
                        placeholder="e.g., Dr. Joe"
                        className="w-full px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[#309898] mb-2">Phone Number</label>
                      <input
                        value={doc.phone}
                        onChange={(e) => {
                          const updated = [...doctor];
                          updated[index].phone = e.target.value;
                          setDoctor(updated);
                        }}
                        placeholder="e.g., 1234567890"
                        className="w-full px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[#309898] mb-2">Speciality</label>
                      <input
                        value={doc.speciality}
                        onChange={(e) => {
                          const updated = [...doctor];
                          updated[index].speciality = e.target.value;
                          setDoctor(updated);
                        }}
                        placeholder="e.g., Cardiologist"
                        className="w-full px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setCurrentMedications([
                    ...currentMedications,
                    { name: "", dosage: "", frequency: "", purpose: "" },
                  ])
                }
                className="flex items-center gap-2 text-[#FF8000] cursor-pointer"
              >
                <Plus className="w-5 h-5" /> Add Doctors
              </button>
            </div>

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
