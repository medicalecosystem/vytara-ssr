'use client';

import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/createClient";
import { useEffect, useState } from "react";
import Image from "next/image";
export default function MedicalInfoFormUI() {
  const router = useRouter();
  
  // Modal state - controls which section is visible
  const [currentSection, setCurrentSection] = useState(1);

  // Section 1 - Personal Information
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bmi, setBmi] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState([
    { name: "", phone: "", relation: "" },
  ]);

  // Section 2 - Health Information
  const [conditions, setConditions] = useState([""]);
  const [currentMedications, setCurrentMedications] = useState([
    { name: "", dosage: "", frequency: "", purpose: "" },
  ]);
  const [allergies, setAllergies] = useState([""]);
  const [treatments, setTreatments] = useState([""]);
  const [doctor, setDoctor] = useState([
    { name: "", phone: "", speciality: "" }
  ]);

  // Section 3 - Past Medical History
  const [diagnosedCondition, setDiagnosedCondition] = useState([""]);
  const [pastSurgeries, setPastSurgeries] = useState([{ name: "", date: "" }]);
  const [hospitalization, setHospitalization] = useState([{ reason: "", date: "" }]);
  const [pastInjury, setPastInjury] = useState([""]);
  const [childhoodIllness, setChildhoodIllness] = useState([""]);
  const [pastMedications, setPastMedications] = useState([""]);
  const [longTermTreatments, setLongTermTreatments] = useState([""]);

  // Section 4 - Family Medical History
  const [familyMedicalHistory, setFamilyMedicalHistory] = useState([
    { disease: "", relation: "" },
  ]);

  // BMI calculation
  useEffect(() => {
    const h = Number(height);
    const w = Number(weight);
    if (!h || !w){
      setBmi("");
      return;
    }
    const height_in_m = h / 100;
    const calc_bmi = w / (height_in_m * height_in_m);
    if(!isNaN(calc_bmi) && isFinite(calc_bmi)){
      setBmi(calc_bmi.toFixed(1));
    }
  }, [height, weight]);

  // Handle Section 1 submission
  const handleSection1Submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      alert("Authentication expired. Please login again.");
      router.replace("/auth/login");
      return;
    }

    const personalData = {
      fullName,
      dob,
      gender,
      bloodGroup,
      height,
      weight,
      bmi,
      contactNumber,
      emergencyContact,
      address,
    };

    const { error } = await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        personal: personalData,
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error(error);
      alert(error.message);
    } else {
      setCurrentSection(2);
    }
  };

  // Handle Section 2 submission
  const handleSection2Submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user){
      router.push("/login");
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
      setCurrentSection(3);
    }
  };

  // Handle Section 3 submission
  const handleSection3Submit = async (e: React.FormEvent<HTMLFormElement>) => {
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
        setCurrentSection(4);
    }
  };

  // Handle Section 4 submission (Final)
  const handleSection4Submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user){
      router.push("/login");
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
        alert("Error: " + error.message);
    } else {
        router.push('/app/homepage')
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#309898]/20 via-white to-[#FF8000]/10 flex items-center justify-center p-4">
      <div className="relative max-w-3xl w-full bg-white rounded-xl shadow-lg overflow-hidden p-6">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#309898] to-[#FF8000]" />

        <div className="flex justify-center mb-4">
          <Image
            src="/vytara-logo.png"
            alt="Vytara Logo"
            width={96}
            height={96}
            priority
          />
        </div>

        {/* SECTION 1 - PERSONAL INFORMATION */}
        {currentSection === 1 && (
          <form onSubmit={handleSection1Submit}>
            <h2 className="text-center text-[#309898] mb-2">Medical Information</h2>
            <p className="text-center text-gray-600 mb-6">Section 1 / 4</p>

            <div className="min-h-[500px] space-y-6">
              <div className="space-y-4">
                <h3 className="text-[#FF8000] mb-4">Basic Personal Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[#309898] mb-2">Full Name *</label>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                      placeholder="Full Name"
                    />
                  </div>

                  <div>
                    <label className="block text-[#309898] mb-2">Date of Birth *</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[#309898] mb-2">Gender *</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                    >
                      <option>Select Gender</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#309898] mb-2">Blood Group *</label>  
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                    >
                      <option>Select Blood Group</option>
                      <option>A+</option>
                      <option>A−</option>
                      <option>B+</option>
                      <option>B−</option>
                      <option>AB+</option>
                      <option>AB−</option>
                      <option>O+</option>
                      <option>O−</option>
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-[#309898] mb-2">Address *</label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                      placeholder="Address"
                    />
                  </div>

                  <div>
                    <label className="block text-[#309898] mb-2">Height (cm)</label>
                    <input
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="eg: 172"
                      className="w-full px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[#309898] mb-2">Weight</label>
                    <input
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="eg: 70 kg"
                      className="w-full px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[#309898] mb-2">BMI</label>
                    <input
                      value={bmi}
                      placeholder="eg: 2.7"
                      className="w-full px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-[#309898] mb-2">Contact Number *</label>
                    <input
                      type="tel"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                      placeholder="eg: 1234567890"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[#309898]">Emergency Contacts</label>
                    <button
                      type="button"
                      className="text-[#FF8000]"
                      onClick={() =>
                        setEmergencyContact([
                          ...emergencyContact,
                          { name: "", phone: "", relation: "" },
                        ])
                      }
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {emergencyContact.map((contact, index) => (
                    <div key={index} className="border p-4 rounded-xl mb-4">
                      <div className="flex gap-2 mb-2">
                        <input
                          placeholder="Name"
                          className="flex-1 px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                          value={contact.name}
                          onChange={(e) => {
                            const updated = [...emergencyContact];
                            updated[index].name = e.target.value;
                            setEmergencyContact(updated);
                          }}
                        />
                        <input
                          placeholder="Phone"
                          className="flex-1 px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                          value={contact.phone}
                          onChange={(e) => {
                            const updated = [...emergencyContact];
                            updated[index].phone = e.target.value;
                            setEmergencyContact(updated);
                          }}
                        />
                      </div>
                      <input
                        placeholder="Relation"
                        className="w-full px-4 py-2 rounded-lg border-2 border-[#309898]/30 mb-2 text-gray-800"
                        value={contact.relation}
                        onChange={(e) => {
                          const updated = [...emergencyContact];
                          updated[index].relation = e.target.value;
                          setEmergencyContact(updated);
                        }}
                      />
                      {index !== 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const filtered = emergencyContact.filter((_, i) => i !== index);
                            setEmergencyContact(filtered);
                          }}
                          className="text-red-500 flex items-center gap-1"
                        >
                          <X className="w-5 h-5" /> Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={() => router.push("/signup")}
                className="flex items-center gap-2 text-[#309898]"
              >
                <ChevronLeft /> Previous
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 bg-[#FF8000] text-white px-6 py-2 rounded-lg cursor-pointer"
              >
                Next
              </button>
            </div>
          </form>
        )}

        {/* SECTION 2 - HEALTH INFORMATION */}
        {currentSection === 2 && (
          <form onSubmit={handleSection2Submit}>
            <h2 className="text-center text-[#309898] mb-2">Health Information</h2>
            <p className="text-center text-gray-600 mb-6">Section 2/4</p>

            <div className="space-y-6">
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
                    setDoctor([
                      ...doctor,
                      { name: "", phone: "", speciality: "" },
                    ])
                  }
                  className="flex items-center gap-2 text-[#FF8000] cursor-pointer"
                >
                  <Plus className="w-5 h-5" /> Add Doctor
                </button>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              {/* <button
                type="button"
                onClick={() => setCurrentSection(1)}
                className="flex items-center gap-2 text-[#309898]"
              >
                <ChevronLeft /> Previous
              </button> */}
              <button
                type="submit"
                className="flex items-center gap-2 bg-[#FF8000] text-white px-6 py-2 rounded-lg hover:bg-[#309898] cursor-pointer"
              >
                Next <ChevronRight />
              </button>
            </div>
          </form>
        )}

        {/* SECTION 3 - PAST MEDICAL HISTORY */}
        {currentSection === 3 && (
          <form onSubmit={handleSection3Submit}>
            <h2 className="text-center text-[#309898] mb-2">Past Medical History</h2>
            <p className="text-center text-gray-600 mb-6">Section 3/4</p>

            <div className="space-y-6">
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
            </div>

            <div className="flex justify-between mt-8">
              {/* <button
                type="button"
                onClick={() => setCurrentSection(2)}
                className="flex items-center gap-2 text-[#309898]"
              >
                <ChevronLeft /> Previous
              </button> */}
              <button
                type="submit"
                className="flex items-center gap-2 bg-[#FF8000] text-white px-6 py-2 rounded-lg hover:bg-[#309898] cursor-pointer"
              >
                Next <ChevronRight />
              </button>
            </div>
          </form>
        )}

        {/* SECTION 4 - FAMILY MEDICAL HISTORY */}
        {currentSection === 4 && (
          <form onSubmit={handleSection4Submit}>
            <h2 className="text-center text-[#309898] mb-2">Family Medical History</h2>
            <p className="text-center text-gray-600 mb-6">Section 4/4</p>

            <div className="space-y-6">
              <h3 className="text-[#FF8000] mb-2">Family Medical History</h3>

              {familyMedicalHistory.map((row, index) => (
                <div key={index} className="flex gap-4 items-center relative">
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
            </div>

            <div className="flex justify-between mt-8">
              {/* <button
                type="button"
                onClick={() => setCurrentSection(3)}
                className="flex items-center gap-2 text-[#309898]"
              >
                <ChevronLeft /> Previous
              </button> */}
              <button
                type="submit"
                className="flex items-center gap-2 bg-[#FF8000] text-white px-6 py-2 rounded-lg hover:bg-[#309898] cursor-pointer"
              >
                Complete <ChevronRight />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
