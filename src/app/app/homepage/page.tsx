"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/createClient";
import { useRouter } from "next/navigation";
import { AppointmentsModal } from "@/components/AppointmentsModal";
import {
  Calendar,
  Users,
  Stethoscope,
  Pill,
  AlertCircle,
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
  phone: number; // ✅ kept as number (as you want)
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

  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");

  const [name, setName] = useState("");
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(
    []
  );
  const [medicalTeam, setMedicalTeam] = useState<Doctor[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isSendingSOS, setIsSendingSOS] = useState(false);

  const handleAddAppointment = (appointment: Appointment) => {
    setAppointments((prev) => {
      const exists = prev.find((a) => a.id === appointment.id);
      if (exists) {
        return prev.map((a) => (a.id === appointment.id ? appointment : a));
      }
      return [...prev, appointment];
    });
  };

  const handleDeleteAppointment = (id: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  /* =======================
     EMERGENCY CONTACTS: ADD / DELETE
  ======================= */

  const addEmergencyContact = async (contact: EmergencyContact) => {
    if (!userId) return;

    // ✅ FIX: contact.phone is a number, so no .trim()
    if (!contact.name.trim() || !contact.relation.trim() || !Number.isFinite(contact.phone)) {
      alert("Please fill Name, Phone and Relation.");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("personal")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Fetch personal error:", error);
      alert("Failed to load your profile. Please try again.");
      return;
    }

    const personal = data?.personal || {};
    const existing: EmergencyContact[] = Array.isArray(personal.emergencyContact)
      ? personal.emergencyContact
      : [];

    const updatedContacts = [...existing, contact];

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({
        personal: {
          ...personal,
          emergencyContact: updatedContacts,
        },
      })
      .eq("user_id", userId);

    if (updateErr) {
      console.error("Update personal error:", updateErr);
      alert("Failed to save contact. Please try again.");
      return;
    }

    setEmergencyContacts(updatedContacts);
  };

  const deleteEmergencyContact = async (indexToDelete: number) => {
    if (!userId) return;

    const confirmed = confirm("Delete this emergency contact?");
    if (!confirmed) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("personal")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Fetch personal error:", error);
      alert("Failed to load your profile. Please try again.");
      return;
    }

    const personal = data?.personal || {};
    const existing: EmergencyContact[] = Array.isArray(personal.emergencyContact)
      ? personal.emergencyContact
      : [];

    const updatedContacts = existing.filter((_, idx) => idx !== indexToDelete);

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({
        personal: {
          ...personal,
          emergencyContact: updatedContacts,
        },
      })
      .eq("user_id", userId);

    if (updateErr) {
      console.error("Update personal error:", updateErr);
      alert("Failed to delete contact. Please try again.");
      return;
    }

    setEmergencyContacts(updatedContacts);
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
     AUTH USER
  ======================= */

  useEffect(() => {
    async function fetchProfileData() {
      if (userId) {
        const { data, error } = await supabase
          .from("profiles")
          .select("personal")
          .eq("user_id", userId)
          .single();

        if (data && data.personal) {
          const profile = data.personal;
          setName(profile.fullName || "");
        }

        if (error) {
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
      } else {
        setEmergencyContacts([]);
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
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
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
              <EmergencyModal
                data={emergencyContacts}
                onAdd={addEmergencyContact}
                onDelete={deleteEmergencyContact}
              />
            )}

            {activeSection === "doctors" && <DoctorsModal data={medicalTeam} />}

            {activeSection === "medications" && (
              <MedicationsModal data={medications} />
            )}
          </Modal>
        )}

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

function EmergencyModal({
  data,
  onAdd,
  onDelete,
}: {
  data: EmergencyContact[];
  onAdd: (contact: EmergencyContact) => Promise<void> | void;
  onDelete: (index: number) => Promise<void> | void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("");

  const resetForm = () => {
    setName("");
    setPhone("");
    setRelation("");
  };

  // ✅ FIX: phone is stored as number, so parse from input string
  const handleSave = async () => {
    const parsedPhone = Number(phone);

    if (!name.trim() || !relation.trim() || !Number.isFinite(parsedPhone)) {
      alert("Please enter a valid Name, Phone and Relation.");
      return;
    }

    setSaving(true);
    try {
      await onAdd({
        name: name.trim(),
        phone: parsedPhone,
        relation: relation.trim(),
      });
      resetForm();
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4 mb-4">
        <h2 className="text-2xl font-bold">Emergency Contacts</h2>

        <button
          onClick={() => {
            setShowForm((v) => !v);
            if (!showForm) resetForm();
          }}
          className="mt-6 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          {showForm ? "Close" : "+ Add Contact"}
        </button>
      </div>

      {showForm && (
        <div className="mb-5 p-4 rounded-2xl border bg-slate-50">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 bg-white"
                placeholder="e.g., Mom / John Doe"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Phone
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="numeric"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 bg-white"
                placeholder="e.g., 9876543210"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Relation
              </label>
              <input
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 bg-white"
                placeholder="e.g., Parent / Friend / Spouse"
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
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!data.length ? (
        <p className="text-slate-600">No emergency contacts found.</p>
      ) : (
        <div className="space-y-2">
          {data.map((c, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-slate-50 border hover:bg-slate-100 transition flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-sm text-slate-500">
                  {c.relation} • {c.phone}
                </p>
              </div>

              <button
                onClick={() => onDelete(i)}
                className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                title="Delete contact"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
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
        <DemoItem
          key={i}
          title={m.name}
          subtitle={`${m.dosage} • ${m.frequency}`}
        />
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
