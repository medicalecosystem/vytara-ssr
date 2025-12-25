'use client'

import {
  User, Mail, Phone, Activity, Edit2,
  Download, Droplet, Calculator, CalendarCheck,
  ChevronDown, Users, Menu, X, Pill, History, LogOut, Calendar, Locate
} from 'lucide-react';
import { supabase } from '@/lib/createClient';
import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePageUI() {

  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent){
      if(menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      <header 
        className="sticky top-0 z-40 border-b border-white/20 shadow-sm"
        style={{ background: 'linear-gradient(90deg, #006770 0%, #00838B 40%, #00A3A9 100%)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md p-2">
                <div className="w-full h-full bg-teal-600 rounded-full"></div>
              </div>
              <h1 className="text-xl font-bold text-white tracking-wide">Vytara</h1>
            </div>
            
            {/* Menu Button */}
            <div className="relative" ref={menuRef}>
              <button 
                className="p-2 text-white hover:bg-white/20 rounded-lg flex items-center justify-center transition border border-white/30 bg-white/10 backdrop-blur-sm"
                onClick={() => setMenuOpen(!menuOpen)}
              >  
                {menuOpen ? <X className='w-7 h-7'/> : <Menu className="w-7 h-7" />}
              </button>
              {menuOpen && (
                <div className='absolute right-0 mt-2 w-44 rounded-xl border border-white/20 bg-black/70 backdrop-blur-md shadow-lg overflow-hidden z-50'>

                  <button
                    onClick={() => {
                      setMenuOpen(false) 
                      router.push('/homepage')
                    }}
                    className='w-full px-4 py-3 text-left text-white hover:bg-white/10 transition'
                  >
                    Home
                  </button>
                  <button
                    onClick={() => setMenuOpen(false)}
                    className='w-full px-4 py-3 text-left text-white hover:bg-white/10 transition'
                  >
                    Home
                  </button>
                  <button
                    onClick={() => setMenuOpen(false)}
                    className='w-full px-4 py-3 text-left text-white hover:bg-white/10 transition'
                  >
                    Home
                  </button>
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 text-left text-red-400 hover:bg-white/10 transition flex items-center gap-2"
                  >
                    <LogOut className='w-4 h-4' />
                    Logout
                  </button>
                </div>  
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* Left: Basic Info & KPIs */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-xl shadow-teal-900/20 border border-white/20 flex flex-col justify-between relative overflow-hidden">
            
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-teal-50 to-orange-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-80 pointer-events-none"></div>

            {/* Edit Button */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <button className="p-2 bg-white/90 backdrop-blur text-gray-500 hover:text-[#FF8000] hover:bg-orange-50 rounded-full border border-gray-200 shadow-sm transition">
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
                  <History className="w-4 h-4"/>
                </div> 
                Historical Visits
              </h3>
              <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md transition">View All</button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px] pr-2">
              {[
                { title: 'Annual Physical Checkup', doctor: 'Dr. Sarah Smith', date: '15', month: 'Nov' },
                { title: 'Dental Cleaning', doctor: 'Dr. Emily Chen', date: '02', month: 'Oct' },
                { title: 'Viral Fever Consultation', doctor: 'Dr. Sarah Smith', date: '20', month: 'Aug' }
              ].map((event, index) => (
                <div key={index} className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-2xl transition cursor-pointer group border border-transparent hover:border-gray-100">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-white group-hover:shadow-md flex flex-col items-center justify-center text-gray-500 group-hover:text-blue-600 shrink-0 transition duration-300">
                    <span className="text-lg font-bold leading-none">{event.date}</span>
                    <span className="text-[10px] font-bold uppercase">{event.month}</span>
                  </div>
                  <div className="pt-0.5">
                    <p className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition">{event.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{event.doctor}</p>
                  </div>
                </div>
              ))}
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
      </main>
    </div>
  );
}