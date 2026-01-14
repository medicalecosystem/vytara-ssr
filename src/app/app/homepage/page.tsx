"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/createClient";
import { useRouter } from "next/navigation";
import { AppointmentsModal } from '@/components/AppointmentsModal'
import {
  Calendar,
  Users,
  Stethoscope,
  Pill,
  AlertCircle,
  Menu,
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
  [key: string]: string;
};

type EmergencyContact = {
  name: string;
  phone: number;
  relation: string;
};

type Doctor = {
  name: string;
  number: number;
  speciality: string;
};

type Medication = {
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

  const handleAddAppointment = (appointment: Appointment) => {
    setAppointments(prev => {
      const exists = prev.find(a => a.id === appointment.id);
      if (exists) {
        return prev.map(a => (a.id === appointment.id ? appointment : a));
      }
      return [...prev, appointment];
    });
  };

  const handleDeleteAppointment = (id: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
  };

  /* =======================
     SOS HANDLER
  ======================= */

  const handleSOS = async () => {
    // Check if emergency contacts exist
    if (!emergencyContacts || emergencyContacts.length === 0) {
      alert("Please set up emergency contacts first before using SOS.\n\nClick on 'Emergency Contacts' card to add your emergency contacts.");
      setActiveSection("emergency");
      return;
    }

    // Confirm before sending
    const confirmed = confirm(
      "Are you sure you want to send an SOS alert to all your emergency contacts?\n\nThis will send an emergency message to:\n" +
      emergencyContacts.map((c) => `• ${c.name} (${c.phone})`).join("\n")
    );

    if (!confirmed) {
      return;
    }

    setIsSendingSOS(true);

    try {
      const response = await fetch("/api/sos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

      // Show success confirmation
      alert(
        `✅ SOS Alert Sent Successfully!\n\n${data.message}\n\nYour emergency contacts have been notified.`
      );
    } catch (error: any) {
      console.error("SOS error:", error);
      // Show user-friendly error message
      const errorMessage = error.message === "Please enter a valid number" 
        ? "Please enter a valid number"
        : error.message || "Failed to send SOS alert. Please try again.";
      alert(`❌ ${errorMessage}`);
    } finally {
      setIsSendingSOS(false);
    }
  };

  /* =======================
     AUTH USER
  ======================= */
  
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
          setName(profile.fullName || "");
        }

        if ( error ){
          console.log("Error: ", error);
        }
      }
    }
    fetchProfileData();
  }, [userId]);

  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserId(data.user.id);
      }
    }
    getUser();
  }, []);

  /* =======================
     FETCH EMERGENCY CONTACTS
  ======================= */

  useEffect(() => {
    if (!userId) return;

    async function fetchContacts() {
      const { data, error } = await supabase
        .from("profiles")
        .select("personal")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Emergency fetch error:", error);
        return;
      }

      if (data?.personal?.emergencyContact) {
        setEmergencyContacts(data.personal.emergencyContact);
      }
    }

    fetchContacts();
  }, [userId]);

  /* =======================
     FETCH HEALTH DATA
  ======================= */

  useEffect(() => {
    if (!userId) return;

    async function fetchHealthData() {
      const { data, error } = await supabase
        .from("profiles")
        .select("health")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Health fetch error:", error);
        return;
      }

      if (data?.health) {
        setMedications(data.health.currentMedications || []);
        setMedicalTeam(data.health.doctor || []);
      }
    }

    fetchHealthData();
  }, [userId]);

  /* =======================
     UI
  ======================= */

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 text-slate-900">

      <main className="max-w-7xl mx-auto px-6 py-12">

        {/* HERO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <span className="inline-block bg-teal-500 text-white px-4 py-1 rounded-full text-sm font-semibold mb-6">
              Health Companion
            </span>

            <h2
              className="text-5xl lg:text-6xl font-bold mb-4 leading-tight"
              style={{
                background: `linear-gradient(90deg, #4FD1A6, #FFBF69)`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent'
              }}
            >
              Welcome, {name}
            </h2>

            <p className="text-slate-600 text-lg max-w-md">
              Designed with empathy. Built for clarity. Ready when you need it.
            </p>
          </div>

          {/* SOS */}
          <div className="hidden lg:flex justify-center">
            <button
              onClick={handleSOS}
              disabled={isSendingSOS}
              className={`w-48 h-48 rounded-full ${
                isSendingSOS
                  ? "bg-red-400 cursor-not-allowed"
                  : "bg-red-500 hover:bg-red-600"
              } text-white shadow-2xl flex flex-col items-center justify-center transition hover:scale-110 disabled:hover:scale-100`}
            >
              <AlertCircle size={64} />
              <span className="text-4xl font-bold mt-4">
                {isSendingSOS ? "Sending..." : "SOS"}
              </span>
            </button>
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
              <EmergencyModal data={emergencyContacts} />
            )}
            {activeSection === "doctors" && (
              <DoctorsModal data={medicalTeam} />
            )}
            {activeSection === "medications" && (
              <MedicationsModal data={medications} />
            )}
          </Modal>
        )}

        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card title="Calendar" icon={Calendar} onClick={() => setActiveSection("calendar")} />
          <Card title="Emergency Contacts" icon={Users} onClick={() => setActiveSection("emergency")} />
          <Card title="Medical Team" icon={Stethoscope} onClick={() => setActiveSection("doctors")} />
          <Card title="Medications" icon={Pill} onClick={() => setActiveSection("medications")} />
        </div>
      </main>
    </div>
  );
}

/* =======================
   MODAL
======================= */

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100"
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

function EmergencyModal({ data }: { data: EmergencyContact[] }) {
  if (!data.length) return <p>No emergency contacts found.</p>;

  return (
    <>
      <h2 className="text-2xl font-bold mb-4">Emergency Contacts</h2>
      {data.map((c, i) => (
        <DemoItem key={i} title={c.name} subtitle={`${c.relation} • ${c.phone}`} />
      ))}
    </>
  );
}

function DoctorsModal({ data }: { data: Doctor[] }) {
  if (!data.length) return <p>No doctors added.</p>;

  return (
    <>
      <h2 className="text-2xl font-bold mb-4">Medical Team</h2>
      {data.map((d, i) => (
        <DemoItem key={i} title={d.name} subtitle={d.speciality} />
      ))}
    </>
  );
}

function MedicationsModal({ data }: { data: Medication[] }) {
  if (!data.length) return <p>No medications found.</p>;

  return (
    <>
      <h2 className="text-2xl font-bold mb-4">Current Medications</h2>
      {data.map((m, i) => (
        <DemoItem key={i} title={m.name} subtitle={`${m.dosage} • ${m.frequency}`} />
      ))}
    </>
  );
}

/* =======================
   SHARED UI
======================= */

function DemoItem({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="p-4 rounded-xl bg-slate-50 border hover:bg-slate-100 transition mb-2">
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

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
