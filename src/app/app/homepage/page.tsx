// "use client";

// import { useEffect, useState } from "react";
// import { supabase } from "@/lib/createClient";
// import { useRouter } from "next/navigation";
// import { AppointmentsModal } from '@/components/AppointmentsModal';
// import { MedicalSummaryModal } from '@/components/MedicalSummaryModal'; // NEW IMPORT
// import {
//   Calendar,
//   Users,
//   Stethoscope,
//   Pill,
//   AlertCircle,
//   X,
// } from "lucide-react";

// /* =======================
//    TYPES (DEFINE FIRST)
// ======================= */

// type Appointment = {
//   id: string;
//   date: string;
//   time: string;
//   title: string;
//   type: string;
//   [key: string]: string;
// };

// type EmergencyContact = {
//   name: string;
//   phone: number; // ✅ kept as number (as you want)
//   relation: string;
// };

// type Doctor = {
//   name: string;
//   number: number;
//   speciality: string;
// };

// type Medication = {
//   name: string;
//   dosage: string;
//   purpose: string;
//   frequency: string;
// };


// /* =======================
//    PAGE COMPONENT
// ======================= */

// export default function HomePage() {

// useEffect(() => {
//   const init = async () => {
//     const { data } = await supabase.auth.getUser();
//     if (data?.user?.id) setUserId(data.user.id);
//   };
//   init();

//   const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
//     setUserId(session?.user?.id ?? "");
//   });

//   return () => sub.subscription.unsubscribe();
// }, []);

//   const router = useRouter();
//   const [appointments, setAppointments] = useState<Appointment[]>([]);
//   const [isMenuOpen, setIsMenuOpen] = useState(false);
//   const [activeSection, setActiveSection] = useState<string | null>(null);
//   const [userId, setUserId] = useState<string>("");

//   const [name, setName] = useState("");
//   const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(
//     []
//   );
//   const [medicalTeam, setMedicalTeam] = useState<Doctor[]>([]);
//   const [medications, setMedications] = useState<Medication[]>([]);
//   const [isSendingSOS, setIsSendingSOS] = useState(false);

//   // NEW: State for medical summary modal
//   const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

//   const handleAddAppointment = (appointment: Appointment) => {
//     setAppointments((prev) => {
//       const exists = prev.find((a) => a.id === appointment.id);
//       if (exists) {
//         return prev.map((a) => (a.id === appointment.id ? appointment : a));
//       }
//       return [...prev, appointment];
//     });
//   };

//   const handleDeleteAppointment = (id: string) => {
//     setAppointments((prev) => prev.filter((a) => a.id !== id));
//   };

//   /* =======================
//      EMERGENCY CONTACTS: ADD / DELETE
//   ======================= */

//   const addEmergencyContact = async (contact: EmergencyContact) => {
//     if (!userId) return;

//     // ✅ FIX: contact.phone is a number, so no .trim()
//     if (!contact.name.trim() || !contact.relation.trim() || !Number.isFinite(contact.phone)) {
//       alert("Please fill Name, Phone and Relation.");
//       return;
//     }

//     const { data, error } = await supabase
//       .from("user_emergency_contacts")
//       .select("contacts")
//       .eq("user_id", userId)
//       .maybeSingle();

//     if (error) {
//       console.error("Fetch personal error:", error);
//       alert("Failed to load your profile. Please try again.");
//       return;
//     }

//     const existing: EmergencyContact[] = Array.isArray(data?.contacts)
//       ? data.contacts
//       : [];

//     const updatedContacts = [...existing, contact];

//     const { error: updateErr } = await supabase
//       .from("user_emergency_contacts")
//       .upsert(
//         {
//           user_id: userId,
//           contacts: updatedContacts,
//         },
//         { onConflict: "user_id" }
//       );

//     if (updateErr) {
//       console.error("Update personal error:", updateErr);
//       alert("Failed to save contact. Please try again.");
//       return;
//     }

//     setEmergencyContacts(updatedContacts);
//   };

//   const deleteEmergencyContact = async (indexToDelete: number) => {
//     if (!userId) return;

//     const confirmed = confirm("Delete this emergency contact?");
//     if (!confirmed) return;

//     const { data, error } = await supabase
//       .from("user_emergency_contacts")
//       .select("contacts")
//       .eq("user_id", userId)
//       .maybeSingle();

//     if (error) {
//       console.error("Fetch personal error:", error);
//       alert("Failed to load your profile. Please try again.");
//       return;
//     }

//     const existing: EmergencyContact[] = Array.isArray(data?.contacts)
//       ? data.contacts
//       : [];

//     const updatedContacts = existing.filter((_, idx) => idx !== indexToDelete);

//     const { error: updateErr } = await supabase
//       .from("user_emergency_contacts")
//       .upsert(
//         {
//           user_id: userId,
//           contacts: updatedContacts,
//         },
//         { onConflict: "user_id" }
//       );

//     if (updateErr) {
//       console.error("Update personal error:", updateErr);
//       alert("Failed to delete contact. Please try again.");
//       return;
//     }

//     setEmergencyContacts(updatedContacts);
//   };

//   /* =======================
//      SOS HANDLER
//   ======================= */

//   const handleSOS = async () => {
//     if (!emergencyContacts || emergencyContacts.length === 0) {
//       alert(
//         "Please set up emergency contacts first before using SOS.\n\nClick on 'Emergency Contacts' card to add your emergency contacts."
//       );
//       setActiveSection("emergency");
//       return;
//     }

//     const confirmed = confirm(
//       "Are you sure you want to send an SOS alert to all your emergency contacts?\n\nThis will send an emergency message to:\n" +
//         emergencyContacts.map((c) => `• ${c.name} (${c.phone})`).join("\n")
//     );

//     if (!confirmed) return;

//     setIsSendingSOS(true);

//     try {
//       const response = await fetch("/api/sos", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           emergencyContacts: emergencyContacts,
//           userName: name || "A user",
//         }),
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         const errorMessage = data.error || "Failed to send SOS alert";
//         throw new Error(errorMessage);
//       }

//       alert(
//         `✅ SOS Alert Sent Successfully!\n\n${data.message}\n\nYour emergency contacts have been notified.`
//       );
//     } catch (error: any) {
//       console.error("SOS error:", error);
//       const errorMessage =
//         error.message === "Please enter a valid number"
//           ? "Please enter a valid number"
//           : error.message || "Failed to send SOS alert. Please try again.";
//       alert(`❌ ${errorMessage}`);
//     } finally {
//       setIsSendingSOS(false);
//     }
//   };

//   /* =======================
//      AUTH USER
//   ======================= */

//   useEffect(() => {
//     async function fetchProfileData() {
//       if (!userId) return;
//       const { data, error } = await supabase
//         .from("personal")
//         .select("display_name")
//         .eq("id", userId)
//         .maybeSingle();

//       if (data?.display_name) {
//         setName(data.display_name);
//       }

//       if (error) {
//         console.log("Error: ", error);
//       }
//     }
//     fetchProfileData();
//   }, [userId]);

//   useEffect(() => {
//     async function getUser() {
//       const { data } = await supabase.auth.getUser();
//       if (data?.user) {
//         setUserId(data.user.id);
//       }
//     }
//     getUser();
//   }, []);

//   /* =======================
//      FETCH EMERGENCY CONTACTS
//   ======================= */

//   useEffect(() => {
//     if (!userId) return;

//     async function fetchContacts() {
//       const { data, error } = await supabase
//         .from("user_emergency_contacts")
//         .select("contacts")
//         .eq("user_id", userId)
//         .maybeSingle();

//       if (error) {
//         console.error("Emergency fetch error:", error);
//         return;
//       }

//       const contacts = Array.isArray(data?.contacts) ? data.contacts : [];
//       setEmergencyContacts(contacts);
//     }

//     fetchContacts();
//   }, [userId]);

//   /* =======================
//      FETCH HEALTH DATA
//   ======================= */

//   useEffect(() => {
//     if (!userId) return;

//     async function fetchHealthData() {
//       const { data, error } = await supabase
//         .from("profiles")
//         .select("health")
//         .eq("user_id", userId)
//         .single();

//       if (error) {
//         console.error("Health fetch error:", error);
//         return;
//       }

//       if (data?.health) {
//         setMedications(data.health.currentMedications || []);
//         setMedicalTeam(data.health.doctor || []);
//       }
//     }

//     fetchHealthData();
//   }, [userId]);

//   /* =======================
//      UI
//   ======================= */

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 text-slate-900">
//       <main className="max-w-7xl mx-auto px-6 py-12">
//         {/* HERO */}
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
//           <div>
//             <span className="inline-block bg-teal-500 text-white px-4 py-1 rounded-full text-sm font-semibold mb-6">
//               Health Companion
//             </span>

//             <h2
//               className="text-5xl lg:text-6xl font-bold mb-4 leading-tight"
//               style={{
//                 background: `linear-gradient(90deg, #4FD1A6, #FFBF69)`,
//                 WebkitBackgroundClip: "text",
//                 backgroundClip: "text",
//                 color: "transparent",
//               }}
//             >
//               Welcome, {name}
//             </h2>

//             <p className="text-slate-600 text-lg max-w-md">
//               Designed with empathy. Built for clarity. Ready when you need it.
//             </p>

//             {/* UPDATED: Get Summary button now opens modal */}
//             <button
//               onClick={() => {
//                 console.log('🔘 Get Summary button clicked!');
//                 setIsSummaryModalOpen(true);
//                 console.log('🔘 Modal state set to true');
//               }}
//               disabled={!userId}
//               className={`mt-8 px-10 py-5 text-lg rounded-2xl font-bold shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl ${
//                 userId
//                   ? 'bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer'
//                   : 'bg-gray-400 cursor-not-allowed text-gray-200'
//               }`}
//             >
//               Get Summary
//             </button>
//           </div>

//           {/* SOS */}
//           <div className="hidden lg:flex justify-center">
//             <button
//               onClick={handleSOS}
//               disabled={isSendingSOS}
//               className={`relative w-48 h-48 rounded-full ${
//                 isSendingSOS
//                   ? "bg-red-400 cursor-not-allowed"
//                   : "bg-red-500 hover:bg-red-600"
//               } text-white shadow-2xl flex items-center justify-center transition hover:scale-110 disabled:hover:scale-100 ${
//                 isSendingSOS ? "" : "animate-sos-pulse"
//               }`}
//             >
//               <span
//                 className={`absolute -inset-6 rounded-full bg-red-500/50 blur-[52px] animate-sos-glow-slow ${
//                   isSendingSOS ? "opacity-0" : "opacity-100"
//                 }`}
//                 aria-hidden="true"
//               />
//               <span
//                 className={`absolute -inset-2 rounded-full bg-red-500/60 blur-3xl animate-sos-glow ${
//                   isSendingSOS ? "opacity-0" : "opacity-100"
//                 }`}
//                 aria-hidden="true"
//               />
//               <span className="relative z-10 flex flex-col items-center justify-center">
//                 <AlertCircle size={64} />
//                 <span className="text-4xl font-bold mt-4">
//                   {isSendingSOS ? "Sending..." : "SOS"}
//                 </span>
//               </span>
//             </button>
//           </div>
//         </div>

//         {/* MODAL */}
//         {activeSection && (
//           <Modal onClose={() => setActiveSection(null)}>
//             {activeSection === "calendar" && (
//               <CalendarView
//                 appointments={appointments}
//                 onAddAppointment={handleAddAppointment}
//                 onDeleteAppointment={handleDeleteAppointment}
//                 onClose={() => setActiveSection(null)}
//               />
//             )}

//             {activeSection === "emergency" && (
//               <EmergencyModal
//                 data={emergencyContacts}
//                 onAdd={addEmergencyContact}
//                 onDelete={deleteEmergencyContact}
//               />
//             )}

//             {activeSection === "doctors" && <DoctorsModal data={medicalTeam} />}

//             {activeSection === "medications" && (
//               <MedicationsModal data={medications} />
//             )}
//           </Modal>
//         )}

//         {/* NEW: Medical Summary Modal */}
//         <MedicalSummaryModal
//           isOpen={isSummaryModalOpen}
//           onClose={() => setIsSummaryModalOpen(false)}
//           folderType="reports"
//           userId={userId}  // ← ADD THIS LINE
//         />

//         {/* CARDS */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//           <Card
//             title="Calendar"
//             icon={Calendar}
//             onClick={() => setActiveSection("calendar")}
//           />
//           <Card
//             title="Emergency Contacts"
//             icon={Users}
//             onClick={() => setActiveSection("emergency")}
//           />
//           <Card
//             title="Medical Team"
//             icon={Stethoscope}
//             onClick={() => setActiveSection("doctors")}
//           />
//           <Card
//             title="Medications"
//             icon={Pill}
//             onClick={() => setActiveSection("medications")}
//           />
//         </div>
//       </main>
//     </div>
//   );
// }

// /* =======================
//    MODAL
// ======================= */

// function Modal({
//   children,
//   onClose,
// }: {
//   children: React.ReactNode;
//   onClose: () => void;
// }) {
//   return (
//     <div
//       onClick={onClose}
//       className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
//     >
//       <div
//         onClick={(e) => e.stopPropagation()}
//         className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-2xl relative"
//       >
//         <button
//           onClick={onClose}
//           className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100"
//         >
//           <X />
//         </button>
//         {children}
//       </div>
//     </div>
//   );
// }

// /* =======================
//    MODAL CONTENTS
// ======================= */

// function CalendarView({
//   appointments,
//   onAddAppointment,
//   onDeleteAppointment,
//   onClose,
// }: {
//   appointments: Appointment[];
//   onAddAppointment: (appointment: Appointment) => void;
//   onDeleteAppointment: (id: string) => void;
//   onClose: () => void;
// }) {
//   return (
//     <AppointmentsModal
//       appointments={appointments}
//       onClose={onClose}
//       onAddAppointment={onAddAppointment}
//       onDeleteAppointment={onDeleteAppointment}
//     />
//   );
// }

// function EmergencyModal({
//   data,
//   onAdd,
//   onDelete,
// }: {
//   data: EmergencyContact[];
//   onAdd: (contact: EmergencyContact) => Promise<void> | void;
//   onDelete: (index: number) => Promise<void> | void;
// }) {
//   const [showForm, setShowForm] = useState(false);
//   const [saving, setSaving] = useState(false);

//   const [name, setName] = useState("");
//   const [phone, setPhone] = useState("");
//   const [relation, setRelation] = useState("");
//   const contacts = Array.isArray(data) ? data : [];

//   const resetForm = () => {
//     setName("");
//     setPhone("");
//     setRelation("");
//   };

//   // ✅ FIX: phone is stored as number, so parse from input string
//   const handleSave = async () => {
//     const parsedPhone = Number(phone);

//     if (!name.trim() || !relation.trim() || !Number.isFinite(parsedPhone)) {
//       alert("Please enter a valid Name, Phone and Relation.");
//       return;
//     }

//     setSaving(true);
//     try {
//       await onAdd({
//         name: name.trim(),
//         phone: parsedPhone,
//         relation: relation.trim(),
//       });
//       resetForm();
//       setShowForm(false);
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <>
//       <div className="flex items-start justify-between gap-4 mb-4">
//         <h2 className="text-2xl font-bold">Emergency Contacts</h2>

//         <button
//           onClick={() => {
//             setShowForm((v) => !v);
//             if (!showForm) resetForm();
//           }}
//           className="mt-6 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
//         >
//           {showForm ? "Close" : "+ Add Contact"}
//         </button>
//       </div>

//       {showForm && (
//         <div className="mb-5 p-4 rounded-2xl border bg-slate-50">
//           <div className="grid grid-cols-1 gap-3">
//             <div>
//               <label className="text-sm font-medium text-slate-700">
//                 Name
//               </label>
//               <input
//                 value={name}
//                 onChange={(e) => setName(e.target.value)}
//                 className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 bg-white"
//                 placeholder="e.g., Mom / John Doe"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-slate-700">
//                 Phone
//               </label>
//               <input
//                 value={phone}
//                 onChange={(e) => setPhone(e.target.value)}
//                 inputMode="numeric"
//                 className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 bg-white"
//                 placeholder="e.g., 9876543210"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-slate-700">
//                 Relation
//               </label>
//               <input
//                 value={relation}
//                 onChange={(e) => setRelation(e.target.value)}
//                 className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 bg-white"
//                 placeholder="e.g., Parent / Friend / Spouse"
//               />
//             </div>

//             <div className="flex justify-end gap-3 pt-2">
//               <button
//                 onClick={() => {
//                   resetForm();
//                   setShowForm(false);
//                 }}
//                 className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
//                 disabled={saving}
//               >
//                 Cancel
//               </button>

//               <button
//                 onClick={handleSave}
//                 disabled={saving}
//                 className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
//               >
//                 {saving ? "Saving..." : "Save"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {!contacts.length && !showForm ? (
//         <p className="text-slate-600">No emergency contacts found.</p>
//       ) : (
//         <div className="space-y-2">
//           {contacts.map((c, i) => (
//             <div
//               key={i}
//               className="p-4 rounded-xl bg-slate-50 border hover:bg-slate-100 transition flex items-center justify-between gap-4"
//             >
//               <div>
//                 <p className="font-semibold">{c.name}</p>
//                 <p className="text-sm text-slate-500">
//                   {c.relation} • {c.phone}
//                 </p>
//               </div>

//               <button
//                 onClick={() => onDelete(i)}
//                 className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
//                 title="Delete contact"
//               >
//                 Delete
//               </button>
//             </div>
//           ))}
//         </div>
//       )}
//     </>
//   );
// }

// function DoctorsModal({ data }: { data: Doctor[] }) {
//   if (!data.length) return <p>No doctors added.</p>;

//   return (
//     <>
//       <h2 className="text-2xl font-bold mb-4">Medical Team</h2>
//       {data.map((d, i) => (
//         <DemoItem key={i} title={d.name} subtitle={d.speciality} />
//       ))}
//     </>
//   );
// }

// function MedicationsModal({ data }: { data: Medication[] }) {
//   if (!data.length) return <p>No medications found.</p>;

//   return (
//     <>
//       <h2 className="text-2xl font-bold mb-4">Current Medications</h2>
//       {data.map((m, i) => (
//         <DemoItem
//           key={i}
//           title={m.name}
//           subtitle={`${m.dosage} • ${m.frequency}`}
//         />
//       ))}
//     </>
//   );
// }

// /* =======================
//    SHARED UI
// ======================= */

// function DemoItem({ title, subtitle }: { title: string; subtitle: string }) {
//   return (
//     <div className="p-4 rounded-xl bg-slate-50 border hover:bg-slate-100 transition mb-2">
//       <p className="font-semibold">{title}</p>
//       <p className="text-sm text-slate-500">{subtitle}</p>
//     </div>
//   );
// }

// function Card({ title, icon: Icon, onClick }: any) {
//   return (
//     <div
//       onClick={onClick}
//       className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-xl hover:scale-105 transition cursor-pointer border"
//     >
//       <div className="w-14 h-14 mx-auto mb-4 bg-teal-100 rounded-full flex items-center justify-center">
//         <Icon size={24} className="text-teal-600" />
//       </div>
//       <h3 className="font-bold text-center">{title}</h3>
//       <p className="text-xs text-slate-500 text-center mt-2">View details</p>
//     </div>
//   );
// }
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/createClient";
import { useRouter } from "next/navigation";
import { AppointmentsModal } from '@/components/AppointmentsModal';
import { EmergencyContactsModal, type EmergencyContact } from "@/components/EmergencyContactsModal";
import { MedicalSummaryModal } from '@/components/MedicalSummaryModal'; // NEW IMPORT
import {
  Calendar,
  Users,
  Stethoscope,
  Pill,
  AlertCircle,
  Bell,
  X,
} from "lucide-react";

/* =======================
   TYPES (DEFINE FIRST)
======================= */

type Appointment = {
  id: string;
  date: string;
  time: string;
  title: string;
  type: string;
};

type Doctor = {
  id: string;
  name: string;
  number: string;
  speciality: string;
};

type Medication = {
  id: string;
  name: string;
  dosage: string;
  purpose: string;
  frequency: string;
};

/* =======================
   PAGE COMPONENT
======================= */

export default function HomePage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");

  const [name, setName] = useState("");
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [medicalTeam, setMedicalTeam] = useState<Doctor[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isSendingSOS, setIsSendingSOS] = useState(false);

  // NEW: State for medical summary modal
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [greeting, setGreeting] = useState("Good Morning");

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) {
        setGreeting("Good Morning");
      } else if (hour < 18) {
        setGreeting("Good Afternoon");
      } else {
        setGreeting("Good Evening");
      }
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60_000);
    return () => clearInterval(interval);
  }, []);

  /* =======================
     AUTH USER SETUP
  ======================= */

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) setUserId(data.user.id);
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? "");
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  /* =======================
     FETCH USER NAME FROM PROFILES
  ======================= */

  useEffect(() => {
    async function fetchProfileData() {
      if (userId) {
        const { data, error } = await supabase
          .from("personal")
          .select("display_name")
          .eq("id", userId)
          .single();

        if (data?.display_name) {
          setName(data.display_name || "");
        }

        if (error) {
          console.log("Error fetching profile: ", error);
        }
      }
    }
    fetchProfileData();
  }, [userId]);

  /* =======================
     FETCH EMERGENCY CONTACTS FROM DB (JSONB)
  ======================= */

  useEffect(() => {
    if (!userId) return;

    const fetchEmergencyContacts = async () => {
      const { data, error } = await supabase
        .from("user_emergency_contacts")
        .select("contacts")
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          setEmergencyContacts([]);
        } else {
          console.error("Emergency fetch error:", error);
          setEmergencyContacts([]);
        }
        return;
      }

      setEmergencyContacts(data?.contacts || []);
    };

    fetchEmergencyContacts();
  }, [userId]);

  /* =======================
     FETCH MEDICAL TEAM FROM DB (JSONB)
  ======================= */

  useEffect(() => {
    if (!userId) return;

    async function fetchMedicalTeam() {
      const { data, error } = await supabase
        .from("user_medical_team")
        .select("doctors")
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code !== "PGRST116") {
          console.error("Medical team fetch error:", error);
        }
        setMedicalTeam([]);
        return;
      }

      setMedicalTeam(data?.doctors || []);
    }

    fetchMedicalTeam();
  }, [userId]);

  /* =======================
     FETCH MEDICATIONS FROM DB (JSONB)
  ======================= */

  useEffect(() => {
    if (!userId) return;

    async function fetchMedications() {
      const { data, error } = await supabase
        .from("user_medications")
        .select("medications")
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code !== "PGRST116") {
          console.error("Medications fetch error:", error);
        }
        setMedications([]);
        return;
      }

      setMedications(data?.medications || []);
    }

    fetchMedications();
  }, [userId]);

  /* =======================
     FETCH APPOINTMENTS FROM DB (JSONB)
  ======================= */

  useEffect(() => {
    if (!userId) return;

    async function fetchAppointments() {
      const { data, error } = await supabase
        .from("user_appointments")
        .select("appointments")
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code !== "PGRST116") {
          console.error("Appointments fetch error:", error);
        }
        setAppointments([]);
        return;
      }

      setAppointments(data?.appointments || []);
    }

    fetchAppointments();
  }, [userId]);

  /* =======================
     APPOINTMENTS: ADD / UPDATE / DELETE
  ======================= */

  const handleAddAppointment = async (appointment: Appointment) => {
    if (!userId) return;

    let updatedAppointments: Appointment[];

    const existingIndex = appointments.findIndex((a) => a.id === appointment.id);
    
    if (existingIndex !== -1) {
      updatedAppointments = appointments.map((a) =>
        a.id === appointment.id ? appointment : a
      );
    } else {
      updatedAppointments = [...appointments, appointment];
    }

    const { error } = await supabase
      .from("user_appointments")
      .upsert({
        user_id: userId,
        appointments: updatedAppointments,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Save appointment error:", error);
      alert("Failed to save appointment");
      return;
    }

    setAppointments(updatedAppointments);
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!userId) return;

    const confirmed = confirm("Delete this appointment?");
    if (!confirmed) return;

    const updatedAppointments = appointments.filter((a) => a.id !== id);

    const { error } = await supabase
      .from("user_appointments")
      .upsert({
        user_id: userId,
        appointments: updatedAppointments,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Delete appointment error:", error);
      alert("Failed to delete appointment");
      return;
    }

    setAppointments(updatedAppointments);
  };

  /* =======================
     EMERGENCY CONTACTS: ADD / DELETE
  ======================= */

  const addEmergencyContact = async (contact: EmergencyContact) => {
    if (!userId) return;

    if (!contact.name.trim() || !contact.phone.trim() || !contact.relation.trim()) {
      alert("Please fill Name, Phone and Relation.");
      return;
    }

    const newContact = {
      id: crypto.randomUUID(),
      name: contact.name.trim(),
      phone: contact.phone.trim(),
      relation: contact.relation.trim(),
    };

    const updatedContacts = [...emergencyContacts, newContact];

    const { error } = await supabase
      .from("user_emergency_contacts")
      .upsert({
        user_id: userId,
        contacts: updatedContacts,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Add emergency contact error:", error);
      alert("Failed to add contact. Please try again.");
      return;
    }

    setEmergencyContacts(updatedContacts);
  };

  const deleteEmergencyContact = async (id: string) => {
    if (!userId) return;

    const confirmed = confirm("Delete this emergency contact?");
    if (!confirmed) return;

    const updatedContacts = emergencyContacts.filter((c) => c.id !== id);

    const { error } = await supabase
      .from("user_emergency_contacts")
      .upsert({
        user_id: userId,
        contacts: updatedContacts,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Delete emergency contact error:", error);
      alert("Failed to delete contact. Please try again.");
      return;
    }

    setEmergencyContacts(updatedContacts);
  };

  /* =======================
     MEDICAL TEAM: ADD / EDIT / DELETE
  ======================= */

  const addDoctor = async (doctor: Doctor) => {
    if (!userId) return;

    if (!doctor.name.trim() || !doctor.number.trim() || !doctor.speciality.trim()) {
      alert("Please fill all fields.");
      return;
    }

    const newDoctor = {
      id: crypto.randomUUID(),
      name: doctor.name.trim(),
      number: doctor.number.trim(),
      speciality: doctor.speciality.trim(),
    };

    const updatedDoctors = [...medicalTeam, newDoctor];

    const { error } = await supabase
      .from("user_medical_team")
      .upsert({
        user_id: userId,
        doctors: updatedDoctors,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Add doctor error:", error);
      alert("Failed to add doctor. Please try again.");
      return;
    }

    setMedicalTeam(updatedDoctors);
  };

  const updateDoctor = async (doctor: Doctor) => {
    if (!userId) return;

    if (!doctor.name.trim() || !doctor.number.trim() || !doctor.speciality.trim()) {
      alert("Please fill all fields.");
      return;
    }

    const updatedDoctors = medicalTeam.map((d) =>
      d.id === doctor.id ? doctor : d
    );

    const { error } = await supabase
      .from("user_medical_team")
      .upsert({
        user_id: userId,
        doctors: updatedDoctors,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Update doctor error:", error);
      alert("Failed to update doctor. Please try again.");
      return;
    }

    setMedicalTeam(updatedDoctors);
  };

  const deleteDoctor = async (id: string) => {
    if (!userId) return;

    const confirmed = confirm("Delete this doctor?");
    if (!confirmed) return;

    const updatedDoctors = medicalTeam.filter((d) => d.id !== id);

    const { error } = await supabase
      .from("user_medical_team")
      .upsert({
        user_id: userId,
        doctors: updatedDoctors,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Delete doctor error:", error);
      alert("Failed to delete doctor. Please try again.");
      return;
    }

    setMedicalTeam(updatedDoctors);
  };

  /* =======================
     MEDICATIONS: ADD / EDIT / DELETE
  ======================= */

  const addMedication = async (medication: Medication) => {
    if (!userId) return;

    if (!medication.name.trim() || !medication.dosage.trim() || !medication.frequency.trim()) {
      alert("Please fill Name, Dosage, and Frequency.");
      return;
    }

    const newMedication = {
      id: crypto.randomUUID(),
      name: medication.name.trim(),
      dosage: medication.dosage.trim(),
      purpose: medication.purpose.trim(),
      frequency: medication.frequency.trim(),
    };

    const updatedMedications = [...medications, newMedication];

    const { error } = await supabase
      .from("user_medications")
      .upsert({
        user_id: userId,
        medications: updatedMedications,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Add medication error:", error);
      alert("Failed to add medication. Please try again.");
      return;
    }

    setMedications(updatedMedications);
  };

  const updateMedication = async (medication: Medication) => {
    if (!userId) return;

    if (!medication.name.trim() || !medication.dosage.trim() || !medication.frequency.trim()) {
      alert("Please fill Name, Dosage, and Frequency.");
      return;
    }

    const updatedMedications = medications.map((m) =>
      m.id === medication.id ? medication : m
    );

    const { error } = await supabase
      .from("user_medications")
      .upsert({
        user_id: userId,
        medications: updatedMedications,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Update medication error:", error);
      alert("Failed to update medication. Please try again.");
      return;
    }

    setMedications(updatedMedications);
  };

  const deleteMedication = async (id: string) => {
    if (!userId) return;

    const confirmed = confirm("Delete this medication?");
    if (!confirmed) return;

    const updatedMedications = medications.filter((m) => m.id !== id);

    const { error } = await supabase
      .from("user_medications")
      .upsert({
        user_id: userId,
        medications: updatedMedications,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Delete medication error:", error);
      alert("Failed to delete medication. Please try again.");
      return;
    }

    setMedications(updatedMedications);
  };

  /* =======================
     SOS HANDLER
  ======================= */

  const handleSOS = async () => {
    if (!emergencyContacts || emergencyContacts.length === 0) {
      alert(
        "Please set up emergency contacts first before using SOS.\n\nClick on 'Emergency Contacts' card to add your emergency contacts."
      );
      setActiveSection("emergency");
      return;
    }

    const confirmed = confirm(
      "Are you sure you want to send an SOS alert to all your emergency contacts?\n\nThis will send an emergency message to:\n" +
        emergencyContacts.map((c) => `• ${c.name} (${c.phone})`).join("\n")
    );

    if (!confirmed) return;

    setIsSendingSOS(true);

    try {
      const response = await fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emergencyContacts: emergencyContacts,
          userName: name || "A user",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || "Failed to send SOS alert";
        throw new Error(errorMessage);
      }

      alert(
        `✅ SOS Alert Sent Successfully!\n\n${data.message}\n\nYour emergency contacts have been notified.`
      );
    } catch (error: any) {
      console.error("SOS error:", error);
      const errorMessage =
        error.message === "Please enter a valid number"
          ? "Please enter a valid number"
          : error.message || "Failed to send SOS alert. Please try again.";
      alert(`❌ ${errorMessage}`);
    } finally {
      setIsSendingSOS(false);
    }
  };

  /* =======================
     UI
  ======================= */

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 text-slate-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        {/* HERO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <span className="inline-block bg-teal-500 text-white px-4 py-1 rounded-full text-sm font-semibold mb-6">
              Health Companion
            </span>

            <h2
              className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 leading-tight"
              style={{
                background: `linear-gradient(90deg, #4FD1A6, #FFBF69)`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {greeting}, {name}
            </h2>

            <p className="text-slate-600 text-lg max-w-md">
              Designed with empathy. Built for clarity. Ready when you need it.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* UPDATED: Get Summary button now opens modal */}
              <button
                onClick={() => {
                  console.log('🔘 Get Summary button clicked!');
                  setIsSummaryModalOpen(true);
                  console.log('🔘 Modal state set to true');
                }}
                disabled={!userId}
                className={`w-full sm:w-auto px-10 py-5 text-lg rounded-2xl font-bold shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl ${
                  userId
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer'
                    : 'bg-gray-400 cursor-not-allowed text-gray-200'
                }`}
              >
                Get Summary
              </button>

              <button
                onClick={handleSOS}
                disabled={isSendingSOS}
                className={`relative w-full sm:w-auto px-10 py-5 text-lg rounded-2xl font-bold shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl disabled:hover:scale-100 ${
                  isSendingSOS
                    ? "bg-red-400 cursor-not-allowed"
                    : "bg-red-500 hover:bg-red-600"
                } text-white ${
                  isSendingSOS ? "" : "animate-sos-pulse"
                }`}
              >
                <span className="relative z-10 flex items-center gap-3">
                  <AlertCircle size={22} />
                  <span>{isSendingSOS ? "Sending..." : "SOS"}</span>
                </span>
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="hidden lg:flex justify-end">
            <div className="bg-white rounded-3xl shadow-lg transition border w-full max-w-sm h-[420px] flex flex-col">
              <div className="flex items-center gap-3 px-6 py-5 border-b">
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                  <Bell size={18} className="text-teal-600" />
                </div>
                <h3 className="font-bold text-lg">Notifications</h3>
              </div>
              <div className="flex-1 flex items-center justify-center px-6 py-4 text-sm text-slate-500">
                No notifications yet
              </div>
            </div>
          </div>
        </div>

        {/* MODAL */}
        {activeSection && (
          <Modal onClose={() => setActiveSection(null)}>
            {activeSection === "calendar" && (
              <CalendarView
                appointments={appointments}
                onAddAppointment={handleAddAppointment}
                onDeleteAppointment={handleDeleteAppointment}
                onClose={() => setActiveSection(null)}
              />
            )}

            {activeSection === "emergency" && (
              <EmergencyContactsModal
                data={emergencyContacts}
                onAdd={addEmergencyContact}
                onDelete={deleteEmergencyContact}
              />
            )}

            {activeSection === "doctors" && (
              <DoctorsModal
                data={medicalTeam}
                onAdd={addDoctor}
                onUpdate={updateDoctor}
                onDelete={deleteDoctor}
              />
            )}

            {activeSection === "medications" && (
              <MedicationsModal
                data={medications}
                onAdd={addMedication}
                onUpdate={updateMedication}
                onDelete={deleteMedication}
              />
            )}
          </Modal>
        )}

        {/* NEW: Medical Summary Modal */}
        <MedicalSummaryModal
          isOpen={isSummaryModalOpen}
          onClose={() => setIsSummaryModalOpen(false)}
          folderType="reports"
          userId={userId}  // ← ADD THIS LINE
        />

        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card
            title="Calendar"
            icon={Calendar}
            onClick={() => setActiveSection("calendar")}
          />
          <Card
            title="Emergency Contacts"
            icon={Users}
            onClick={() => setActiveSection("emergency")}
          />
          <Card
            title="Medical Team"
            icon={Stethoscope}
            onClick={() => setActiveSection("doctors")}
          />
          <Card
            title="Medications"
            icon={Pill}
            onClick={() => setActiveSection("medications")}
          />
        </div>
      </main>
    </div>
  );
}

/* =======================
   MODAL
======================= */

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 z-10"
        >
          <X />
        </button>
        {children}
      </div>
    </div>
  );
}

/* =======================
   MODAL CONTENTS
======================= */

function CalendarView({
  appointments,
  onAddAppointment,
  onDeleteAppointment,
  onClose,
}: {
  appointments: Appointment[];
  onAddAppointment: (appointment: Appointment) => void;
  onDeleteAppointment: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <AppointmentsModal
      appointments={appointments}
      onClose={onClose}
      onAddAppointment={onAddAppointment}
      onDeleteAppointment={onDeleteAppointment}
    />
  );
}


function DoctorsModal({
  data,
  onAdd,
  onUpdate,
  onDelete,
}: {
  data: Doctor[];
  onAdd: (doctor: Doctor) => Promise<void> | void;
  onUpdate: (doctor: Doctor) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [speciality, setSpeciality] = useState("");

  const resetForm = () => {
    setName("");
    setNumber("");
    setSpeciality("");
    setEditingId(null);
  };

  const handleEdit = (doctor: Doctor) => {
    setName(doctor.name);
    setNumber(doctor.number);
    setSpeciality(doctor.speciality);
    setEditingId(doctor.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !number.trim() || !speciality.trim()) {
      alert("Please fill all fields.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await onUpdate({
          id: editingId,
          name: name.trim(),
          number: number.trim(),
          speciality: speciality.trim(),
        });
      } else {
        await onAdd({
          id: "",
          name: name.trim(),
          number: number.trim(),
          speciality: speciality.trim(),
        });
      }
      resetForm();
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4 mb-4">
        <h2 className="text-2xl font-bold">Medical Team</h2>

        <button
          onClick={() => {
            setShowForm((v) => !v);
            if (!showForm) resetForm();
          }}
          className="mt-6 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          {showForm ? "Close" : "+ Add Doctor"}
        </button>
      </div>

      {showForm && (
        <div className="mb-5 p-4 rounded-2xl border bg-slate-50">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 bg-white"
                placeholder="e.g., Dr. John Smith"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Phone Number</label>
              <input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                type="tel"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 bg-white"
                placeholder="e.g., 9876543210"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Speciality</label>
              <input
                value={speciality}
                onChange={(e) => setSpeciality(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 bg-white"
                placeholder="e.g., Cardiologist / General Physician"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                disabled={saving}
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {saving ? (editingId ? "Updating..." : "Saving...") : editingId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!data.length ? (
        <p className="text-slate-600">No doctors added.</p>
      ) : (
        <div className="space-y-2">
          {data.map((d) => (
            <div
              key={d.id}
              className="p-4 rounded-xl bg-slate-50 border hover:bg-slate-100 transition flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-semibold">{d.name}</p>
                <p className="text-sm text-slate-500">
                  {d.speciality} • {d.number}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(d)}
                  className="rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-600 hover:bg-teal-50"
                  title="Edit doctor"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(d.id)}
                  className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                  title="Delete doctor"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function MedicationsModal({
  data,
  onAdd,
  onUpdate,
  onDelete,
}: {
  data: Medication[];
  onAdd: (medication: Medication) => Promise<void> | void;
  onUpdate: (medication: Medication) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [purpose, setPurpose] = useState("");
  const [frequency, setFrequency] = useState("");

  const resetForm = () => {
    setName("");
    setDosage("");
    setPurpose("");
    setFrequency("");
    setEditingId(null);
  };

  const handleEdit = (medication: Medication) => {
    setName(medication.name);
    setDosage(medication.dosage);
    setPurpose(medication.purpose);
    setFrequency(medication.frequency);
    setEditingId(medication.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !dosage.trim() || !frequency.trim()) {
      alert("Please fill Name, Dosage, and Frequency.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await onUpdate({
          id: editingId,
          name: name.trim(),
          dosage: dosage.trim(),
          purpose: purpose.trim(),
          frequency: frequency.trim(),
        });
      } else {
        await onAdd({
          id: "",
          name: name.trim(),
          dosage: dosage.trim(),
          purpose: purpose.trim(),
          frequency: frequency.trim(),
        });
      }
      resetForm();
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4 mb-4">
        <h2 className="text-2xl font-bold">Medications</h2>

        <button
          onClick={() => {
            setShowForm((v) => !v);
            if (!showForm) resetForm();
          }}
          className="mt-6 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          {showForm ? "Close" : "+ Add Medication"}
        </button>
      </div>

      {showForm && (
        <div className="mb-5 p-4 rounded-2xl border bg-slate-50">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 bg-white"
                placeholder="e.g., Paracetamol"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Dosage</label>
              <input
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 bg-white"
                placeholder="e.g., 500mg"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Purpose (Optional)</label>
              <input
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 bg-white"
                placeholder="e.g., Pain relief / Fever"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Frequency</label>
              <input
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 bg-white"
                placeholder="e.g., Twice daily / As needed"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                disabled={saving}
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {saving ? (editingId ? "Updating..." : "Saving...") : editingId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!data.length ? (
        <p className="text-slate-600">No medications found.</p>
      ) : (
        <div className="space-y-2">
          {data.map((m) => (
            <div
              key={m.id}
              className="p-4 rounded-xl bg-slate-50 border hover:bg-slate-100 transition flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-semibold">{m.name}</p>
                <p className="text-sm text-slate-500">
                  {m.dosage} • {m.frequency} {m.purpose ? `• ${m.purpose}` : ""}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(m)}
                  className="rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-600 hover:bg-teal-50"
                  title="Edit medication"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(m.id)}
                  className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                  title="Delete medication"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* =======================
   SHARED UI
======================= */

function Card({ title, icon: Icon, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-xl hover:scale-105 transition cursor-pointer border"
    >
      <div className="w-14 h-14 mx-auto mb-4 bg-teal-100 rounded-full flex items-center justify-center">
        <Icon size={24} className="text-teal-600" />
      </div>
      <h3 className="font-bold text-center">{title}</h3>
      <p className="text-xs text-slate-500 text-center mt-2">View details</p>
    </div>
  );
}
