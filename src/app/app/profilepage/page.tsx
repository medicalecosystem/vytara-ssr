'use client'

import {
  User, Mail, Phone, Activity, Edit2,
  Download, Droplet, Calculator, CalendarCheck,
  ChevronDown, Users, Menu, X, Pill, History, LogOut, Calendar, Locate, Plus
} from 'lucide-react';
import { supabase } from '@/lib/createClient';
import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePageUI() {

  const router = useRouter();
  const [isPersonalInfoModalOpen, setIsPersonalInfoModalOpen] = useState(false);
  const [isCurrentMedicalModalOpen, setIsCurrentMedicalModalOpen] = useState(false);
  const [isPastMedicalModalOpen, setIsPastMedicalModalOpen] = useState(false);
  const [isFamilyHistoryModalOpen, setIsFamilyHistoryModalOpen] = useState(false);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    async function getUser(){
      const { data } = await supabase.auth.getUser();
      if(data.user){
        setUserId(data.user.id)
        setEmail(data.user.email ?? "")
      }
    }
    getUser();
  }, [])

  {/* PERSONAL DATA */}
  const [userName, setUserName] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [address, setAddress] = useState("");
  const [bmi, setBmi] = useState("");

  {/* MEDICAL DATA */}
  const [conditions, setConditions] = useState<string[]>([]);
  const [allergy, setAllergy] = useState<string[]>([]);
  const [treatment, setTreatment] = useState<string[]>([]);

  type Medication = {
    name: string,
    dosage: string,
    purpose: string,
    frequency: string
  }
  
  const [currentMedications, setCurrentMedications] = useState<Medication[]>([]);

  {/* PAST MEDICAL HISTORY */}

  const [previousDiagnosedCondition, setPreviousDiagnosedCondition] = useState<string[]>([]);
  const [childhoodIllness, setChildhoodIllness] = useState<string[]>([]);
  const [longTermTreatments, setLongTermTreatments] = useState<string[]>([]);

  type PastSurgery = {
    name: string,
    date: string
  }

  const [pastSurgeries, setPastSurgeries] = useState<PastSurgery[]>([]);

  type FamilyMedicalHistory = {
    disease: string,
    relation: string,
  }

  const [familyMedicalHistory, setFamilyMedicalHistory] = useState<FamilyMedicalHistory[]>([]);

  useEffect(() => {
    async function fetchProfileData() {
      if (userId) {
        const { data, error } = await supabase
          .from('profiles')
          .select('personal')
          .eq('user_id', userId)
          .single();
        
        if ( data && data.personal ) {
          const profile = data.personal;
          setUserName(profile.fullName || "");
          setGender(profile.gender || "");
          setDob(profile.dob || "");
          setPhoneNumber(profile.contactNumber || "");
          setBloodGroup(profile.bloodGroup || "");
          setBmi(profile.bmi || "");
          setAddress(profile.address || "");
        }

        if ( error ){
          console.log("Error: ", error);
        }
      }
    }
    fetchProfileData();
  }, [userId]);

  useEffect(() => {
    async function fetchHealthData(){
      const { data, error } = await supabase
      .from("profiles")
      .select("health")
      .eq("user_id", userId)
      .single()

      if (error){
        console.log("Error: ", error);
        return;
      }

      if (data && data.health){
        setConditions(data.health.conditions || []);
        setAllergy(data.health.allergies || []);  
        setTreatment(data.health.treatments || []);
        setCurrentMedications(data.health.currentMedications || []);
      }
    }
    fetchHealthData();
  }, [userId]);

  useEffect(() => {
    async function fetchPastData() {
      const { data, error } = await supabase
        .from("profiles")
        .select("past_medical_info")
        .eq("user_id", userId)
        .single()

        if (error) {
          console.log("Error: " + error);
        }

        if ( data && data.past_medical_info ) {
          setPreviousDiagnosedCondition(data.past_medical_info.diagnosedCondition || []);
          setPastSurgeries(data.past_medical_info.pastSurgeries || []);
          setChildhoodIllness(data.past_medical_info.childhoodIllness || []);
          setLongTermTreatments(data.past_medical_info.longTermTreatments || []);
        }
    }
    fetchPastData();
  }, [userId]);

  useEffect(() => {
    async function fetchFamilyHealthData() {
      const { data, error } = await supabase
        .from("profiles")
        .select("family_history")
        .eq("user_id", userId)
        .single()

      if ( error ) { 
        console.log("Error: ", error)
      }

      if ( data && data.family_history){
        setFamilyMedicalHistory(data.family_history.familyMedicalHistory || []);
      }
    }
    fetchFamilyHealthData();
  }, [userId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#003B46] via-[#006770] via-[#00838B] to-[#00A3A9] pb-10 font-sans">
      
      {/* Navbar */}
      

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-stretch">
          
          {/* Left: Basic Info & KPIs */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-xl shadow-teal-900/20 border border-white/20 flex flex-col h-full relative overflow-hidden">  
            
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-teal-50 to-orange-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-80 pointer-events-none"></div>

            {/* Edit Button */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <button 
                onClick={() => setIsPersonalInfoModalOpen(true)}
                className="p-2 bg-white/90 backdrop-blur text-gray-500 hover:text-[#FF8000] hover:bg-orange-50 rounded-full border border-gray-200 shadow-sm transition"
              >  
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Info */}
            <div className="flex flex-col md:flex-row items-start gap-6 mb-8 mt-2 relative z-0">
              {/* Switch Profile Button & Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <button className="flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur hover:bg-white text-gray-700 rounded-full text-xs font-bold uppercase tracking-wider transition border border-gray-200 shadow-sm">
                    <Users className="w-3 h-3 text-teal-600" />
                    <span>Switch Profile</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-100 to-blue-100 flex items-center justify-center border-[4px] border-white shadow-lg shrink-0">
                  <User className="w-10 h-10 text-teal-700/80" />
                </div>
              </div>

              <div className="flex-1 w-full pt-2">
                <div className="mb-4">
                  <h2 className="text-3xl font-bold text-gray-800 tracking-tight">{userName}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wide rounded-full border border-blue-200">
                      {gender}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 group hover:text-teal-600 transition">
                    <div className="w-6 h-6 rounded-full bg-gray-100 group-hover:bg-teal-50 flex items-center justify-center">
                      <Mail className="w-3 h-3" />
                    </div> 
                    <span className="break-words whitespace-normal">{email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 group hover:text-teal-600 transition">
                    <div className="w-6 h-6 rounded-full bg-gray-100 group-hover:bg-teal-50 flex items-center justify-center">
                      <Phone className="w-3 h-3" />
                    </div>
                    <span>{phoneNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 group hover:text-teal-600 transition">
                    <div className="w-6 h-6 rounded-full bg-gray-100 group-hover:bg-teal-50 flex items-center justify-center">
                      <Calendar className="w-3 h-3" />
                    </div>
                    <span>{dob}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 group hover:text-teal-600 transition">
                    <div className="w-6 h-6 rounded-full bg-gray-100 group-hover:bg-teal-50 flex items-center justify-center">
                      <Locate className="w-3 h-3" />
                    </div>
                    <span className='break-words whitespace-normal'>{address}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* KPI 1 */}
              <div className="bg-red-50 p-4 rounded-2xl border border-red-100 hover:border-red-300 transition shadow-sm group">
                <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Droplet className="w-3 h-3 fill-red-400 text-red-400 group-hover:scale-110 transition" /> Blood
                </p>
                <p className="text-2xl font-bold text-gray-800">{bloodGroup}</p>
              </div>
               
              {/* KPI 2 */}
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 hover:border-blue-300 transition shadow-sm group">
                <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Calculator className="w-3 h-3 text-blue-500 group-hover:scale-110 transition" /> BMI
                </p>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-bold text-gray-800">{bmi}</p>
                  <span className="text-[10px] text-gray-500 font-medium">kg/m²</span>
                </div>
              </div>

              {/* KPI 3 */}
              {/* <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 hover:border-purple-300 transition shadow-sm group">
                <p className="text-[10px] text-purple-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CalendarCheck className="w-3 h-3 text-purple-500 group-hover:scale-110 transition" /> Visits
                </p>
                <p className="text-2xl font-bold text-gray-800">12</p>
              </div> */}
            </div>
          </div>

          {/* Right: Historical Visits */}
          <div className="bg-white rounded-3xl p-6 shadow-xl shadow-teal-900/20 border border-white/20 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
                  <History className="w-4 h-4" />
                </div>
                Historical Visits
              </h3>

              <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md transition">
                View All
              </button>
            </div>

            {/* EMPTY STATE */}
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-gray-400 italic">
                No historical visits
              </p>
            </div>
          </div>

        </div>

        {/* Medical Information Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          
          {/* Current Medical Status */}
          <div className="bg-white rounded-3xl p-6 shadow-xl shadow-teal-900/20 border border-white/20">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
              <div className="p-2 bg-red-50 rounded-lg text-red-600">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-800">Current Medical Status</h3>
              <button 
                onClick={() => setIsCurrentMedicalModalOpen(true)}
                className="p-2 bg-white/90 backdrop-blur text-gray-500 hover:text-[#FF8000] hover:bg-orange-50 rounded-full border border-gray-200 shadow-sm transition"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Current Diagnosed Conditions */}
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-3 block">Current Diagnosed Conditions</label>
                <div className="flex flex-wrap gap-2">
                  {conditions.length > 0 ? (
                    conditions.map((condition, index) => (
                      <span
                        key={index}
                        className='px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100'
                      >
                        {condition}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-sm">No conditions added</span>
                  )}
                </div>
              </div>

              {/* Allergies */}
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-3 block">Allergies</label>
                <div className="flex flex-wrap gap-2">
                    {allergy.length > 0 ? (
                      allergy.map((allergy, index) => (
                        <span
                          key={index}
                          className='px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100'
                        >
                          {allergy}
                        </span>
                      ))
                    ) : (
                      <span className='text-gray-400 text-sm'>No Allergies Added</span>
                    )}
                </div>
              </div>

              {/* Ongoing Treatments */}
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-3 block">Ongoing Treatments</label>
                  <div className="flex flex-wrap gap-2">
                    {treatment.length > 0 ? (
                      treatment.map((treatment, index) => (
                        <span
                          key={index}
                          className='px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100'
                        >
                          {treatment}
                        </span>
                      ))
                    ) : (
                      <span className='text-gray-400 text-sm'>No Treatments Currently</span>
                    )}  
                  </div>  
                <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-3 block">Current Medication</label>                  
                {currentMedications.map((current, index) => (
                  <div 
                    key={index}
                    className='flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100'
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                        <Pill className="w-4 h-4" />
                      </div>

                      <div>
                        <p className="font-bold text-gray-700">{current.name}</p>
                        <p className="text-xs text-gray-500">Purpose: {current.purpose}</p>
                        <p className="text-xs text-gray-500">Dosage: {current.frequency}</p>
                      </div>
                    </div>

                    <span className='text-sm font-medium text-gray-500 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-100'>
                      {current.dosage}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Past Medical History */}
          <div className="bg-white rounded-3xl p-6 shadow-xl shadow-teal-900/20 border border-white/20">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <History className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-800">Past Medical History</h3>
              <button 
                onClick={() => setIsPastMedicalModalOpen(true)}
                className="p-2 bg-white/90 backdrop-blur text-gray-500 hover:text-[#FF8000] hover:bg-orange-50 rounded-full border border-gray-200 shadow-sm transition"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Previous Diagnosed Conditions */}
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-3 block">Previous Diagnosed Conditions</label>
                <div className="flex flex-wrap gap-2">
                  {previousDiagnosedCondition.length > 0 ? (
                    previousDiagnosedCondition.map((previousDiagnosedCondition, index) => (
                      <span
                        key={index}
                        className='px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100'
                      >
                        {previousDiagnosedCondition}
                      </span>
                    ))
                  ) : (
                    <span className='text-gray-400 text-sm'>No Previous Conditions Added</span>
                  )}
                </div>
              </div>

              {/* Past Surgeries */}
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-3 block">Past Surgeries</label>
                <div className="space-y-2">
                  {pastSurgeries.map((pastSurgeries, index) => (
                    <div 
                      key={index}
                      className='flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100'
                    >
                      <div className="flex items-center gap-3">
                        {/* <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                        </div> */}

                        <div>
                          <p className="font-bold text-gray-700">{pastSurgeries.name}</p>
                          <p className="text-xs text-gray-500">Date: {pastSurgeries.date}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Childhood Illness */}
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-3 block">Childhood Illness</label>
                <div className="flex flex-wrap gap-2">
                  {childhoodIllness.length > 0 ? (
                    childhoodIllness.map((childhoodIllness, index) => (
                      <span
                        key={index}
                        className='px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100'
                      >
                        {childhoodIllness}
                      </span>
                    ))
                  ) : (
                    <span className='text-gray-400 text-sm'>No ChildHoodIllnesses Added</span>
                  )}
                </div>
              </div>

              {/* Long Term Treatments */}
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-3 block">Long Term Treatments</label>
                  {longTermTreatments.length > 0 ? (
                    longTermTreatments.map((longTermTreatments, index) => (
                      <span
                        key={index}
                        className='px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100'
                      >
                        {longTermTreatments}
                      </span>
                    ))
                  ) : (
                    <span className='text-gray-400 text-sm'>No Long Term Treatments Added</span>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Family Medical History */}
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-teal-900/20 border border-white/20 mb-6">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-800">Family Medical History</h3>
            <button 
              onClick={() => setIsFamilyHistoryModalOpen(true)}
              className="p-2 bg-white/90 backdrop-blur text-gray-500 hover:text-[#FF8000] hover:bg-orange-50 rounded-full border border-gray-200 shadow-sm transition"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-green-300 transition">
            <div className="space-y-2">
              {familyMedicalHistory.map((familyMedicalHistory, index) => (
                <div 
                  key={index}
                  className='flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100'
                >
                  <div className="flex items-center gap-3">
                    {/* <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                    </div> */}
                      <p className="font-bold text-gray-700">{familyMedicalHistory.relation}</p>
                      <p className="text-xs text-gray-500">Disease: {familyMedicalHistory.disease}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>   
        {/* Personal Info Modal */}
        {isPersonalInfoModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">Edit Personal Information</h3>
                <button 
                  onClick={() => setIsPersonalInfoModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const personalData = {
                    fullName: userName,
                    dob,
                    gender,
                    bloodGroup,
                    contactNumber: phoneNumber,
                    address,
                    bmi,
                  };
                  const { error } = await supabase
                    .from("profiles")
                    .update({ personal: personalData })
                    .eq("user_id", userId);
                  if (error) {
                    alert("Error: " + error.message);
                  } else {
                    setIsPersonalInfoModalOpen(false);
                    alert("Personal information updated successfully!");
                  }
                }}>
                  <div className="space-y-4">
                    <h3 className="text-[#FF8000] mb-4">Basic Personal Information</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-[#309898] mb-2">Full Name *</label>
                        <input
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
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
                        <label className="block text-[#309898] mb-2">Contact Number *</label>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                          placeholder="eg: 1234567890"
                        />
                      </div>

                      <div>
                        <label className="block text-[#309898] mb-2">BMI</label>
                        <input
                          value={bmi}
                          onChange={(e) => setBmi(e.target.value)}
                          placeholder="eg: 24.5"
                          className="w-full px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setIsPersonalInfoModalOpen(false)}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-[#FF8000] text-white rounded-lg hover:bg-[#309898] transition"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Current Medical Status Modal */}
        {isCurrentMedicalModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">Edit Current Medical Status</h3>
                <button 
                  onClick={() => setIsCurrentMedicalModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const healthData = {
                    conditions,
                    currentMedications,
                    allergies: allergy,
                    treatments: treatment,
                  };
                  const { error } = await supabase
                    .from("profiles")
                    .update({ health: healthData })
                    .eq("user_id", userId);
                  if (error) {
                    alert("Error: " + error.message);
                  } else {
                    setIsCurrentMedicalModalOpen(false);
                    alert("Health information updated successfully!");
                  }
                }}>
                  <div className="space-y-6">
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
                      {allergy.map((allergyItem, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <input
                            value={allergyItem}
                            onChange={(e) => {
                              const updated = [...allergy];
                              updated[index] = e.target.value;
                              setAllergy(updated);
                            }}
                            placeholder="e.g., Peanuts, Penicillin"
                            className="flex-1 px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                          />
                          {index > 0 && (
                            <button
                              type="button"
                              className="text-red-500"
                              onClick={() =>
                                setAllergy(allergy.filter((_, i) => i !== index))
                              }
                            >
                              <X className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setAllergy([...allergy, ""])}
                        className="flex items-center gap-2 text-[#FF8000] cursor-pointer"
                      >
                        <Plus className="w-5 h-5" /> Add Allergy
                      </button>
                    </div>

                    {/* TREATMENTS */}
                    <div className="space-y-4">
                      <h3 className="text-[#FF8000] mb-4">Ongoing Treatments</h3>
                      {treatment.map((treat, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <input
                            value={treat}
                            onChange={(e) => {
                              const updated = [...treatment];
                              updated[index] = e.target.value;
                              setTreatment(updated);
                            }}
                            placeholder="e.g., Physiotherapy, Dialysis"
                            className="flex-1 px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                          />
                          {index > 0 && (
                            <button
                              type="button"
                              className="text-red-500"
                              onClick={() =>
                                setTreatment(treatment.filter((_, i) => i !== index))
                              }
                            >
                              <X className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setTreatment([...treatment, ""])}
                        className="flex items-center gap-2 text-[#FF8000] cursor-pointer"
                      >
                        <Plus className="w-5 h-5" /> Add Treatment
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setIsCurrentMedicalModalOpen(false)}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-[#FF8000] text-white rounded-lg hover:bg-[#309898] transition"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Past Medical History Modal */}
        {isPastMedicalModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">Edit Past Medical History</h3>
                <button 
                  onClick={() => setIsPastMedicalModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const pastData = {
                    diagnosedCondition: previousDiagnosedCondition,
                    pastSurgeries,
                    childhoodIllness,
                    longTermTreatments,
                  };
                  const { error } = await supabase
                    .from("profiles")
                    .update({ past_medical_info: pastData })
                    .eq("user_id", userId);
                  if (error) {
                    alert("Error: " + error.message);
                  } else {
                    setIsPastMedicalModalOpen(false);
                    alert("Past medical history updated successfully!");
                  }
                }}>
                  <div className="space-y-6">
                    {/* PREVIOUSLY DIAGNOSED DISEASES */}
                    <div className="space-y-4">
                      <h3 className="text-[#FF8000] mb-4">Previously Diagnosed Diseases</h3>
                      {previousDiagnosedCondition.map((diag, index) => (
                        <div className="flex gap-2 items-center" key={index}>
                          <input
                            value={diag}
                            onChange={(e) => {
                              const updated = [...previousDiagnosedCondition];
                              updated[index] = e.target.value;
                              setPreviousDiagnosedCondition(updated);
                            }}
                            placeholder="e.g., Thyroid, Jaundice"
                            className="flex-1 px-4 py-2 rounded-lg border-2 border-[#309898]/30 text-gray-800"
                          />
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviousDiagnosedCondition(previousDiagnosedCondition.filter((_, i) => i !== index))
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
                        onClick={() => setPreviousDiagnosedCondition([...previousDiagnosedCondition, ""])}
                        className="flex items-center gap-2 text-[#FF8000] cursor-pointer"
                      >
                        <Plus className="w-5 h-5" /> Add Diagnosed Condition
                      </button>
                    </div>

                    {/* PAST SURGERIES */}
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

                    {/* CHILDHOOD ILLNESSES */}
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

                    {/* LONG-TERM TREATMENTS */}
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

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setIsPastMedicalModalOpen(false)}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-[#FF8000] text-white rounded-lg hover:bg-[#309898] transition"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Family Medical History Modal */}
        {isFamilyHistoryModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">Edit Family Medical History</h3>
                <button 
                  onClick={() => setIsFamilyHistoryModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const familyData = { familyMedicalHistory };
                  const { error } = await supabase
                    .from("profiles")
                    .update({ family_history: familyData })
                    .eq("user_id", userId);
                  if (error) {
                    alert("Error: " + error.message);
                  } else {
                    setIsFamilyHistoryModalOpen(false);
                    alert("Family medical history updated successfully!");
                  }
                }}>
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

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setIsFamilyHistoryModalOpen(false)}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-[#FF8000] text-white rounded-lg hover:bg-[#309898] transition"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )} 
      </main>
    </div>
  );
}