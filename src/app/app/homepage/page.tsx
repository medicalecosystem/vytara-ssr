//homepage/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/createClient";
import { useRouter } from "next/navigation";
import { AppointmentsModal } from "@/components/AppointmentsModal";
import { EmergencyContactsModal, type EmergencyContact } from "@/components/EmergencyContactsModal";
import { MedicalTeamModal, type Doctor } from "@/components/MedicalTeamModal";
import { MedicationsModal, type Medication } from "@/components/MedicationsModal";
import { MedicalSummaryModal } from "@/components/MedicalSummaryModal";
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
   TYPES
======================= */

type Appointment = {
  id: string;
  date: string;
  time: string;
  title: string;
  type: string;
};

/* =======================
   PAGE COMPONENT
======================= */

export default function HomePage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");

  const [name, setName] = useState("");
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [medicalTeam, setMedicalTeam] = useState<Doctor[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isSendingSOS, setIsSendingSOS] = useState(false);
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
     FETCH CARE CIRCLE INVITES
  ======================= */

  useEffect(() => {
    if (!userId) return;
    let isActive = true;

    const fetchInvites = async () => {
      setNotificationsLoading(true);
      setNotificationsError("");
      try {
        const response = await fetch("/api/care-circle/links", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Unable to load invites.");
        }
        const data: {
          incoming?: Array<{
            id: string;
            status: string;
            displayName: string;
            createdAt: string;
          }>;
        } = await response.json();

        if (!isActive) return;
        const pendingIncoming =
          data.incoming
            ?.filter((invite) => invite.status === "pending")
            .map((invite) => ({
              id: invite.id,
              name: invite.displayName,
              createdAt: invite.createdAt,
            })) ?? [];

        setCareCircleInvites(pendingIncoming);
      } catch {
        if (!isActive) return;
        setNotificationsError("Unable to load notifications.");
        setCareCircleInvites([]);
      } finally {
        if (isActive) {
          setNotificationsLoading(false);
        }
      }
    };

    fetchInvites();
    const interval = setInterval(fetchInvites, 60_000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
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

    const newMedication: Medication = {
      id: crypto.randomUUID(),
      name: medication.name.trim(),
      dosage: medication.dosage.trim(),
      purpose: medication.purpose.trim(),
      frequency: medication.frequency.trim(),
      timesPerDay: medication.timesPerDay || 1,
      startDate: medication.startDate || new Date().toISOString().split('T')[0],
      endDate: medication.endDate || undefined,
      logs: [], // Initialize with empty logs array
    };

    const updatedMedications = [...medications, newMedication];

    try {
      const { error } = await supabase
        .from("user_medications")
        .upsert(
          {
            user_id: userId,
            medications: updatedMedications,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

      if (error) throw error;

      setMedications(updatedMedications);
    } catch (error: any) {
      console.error("Add medication error:", error);
      alert(`Failed to add medication: ${error.message || "Please try again."}`);
    }
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

    try {
      const { error } = await supabase
        .from("user_medications")
        .upsert(
          {
            user_id: userId,
            medications: updatedMedications,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

      if (error) throw error;

      setMedications(updatedMedications);
    } catch (error: any) {
      console.error("Update medication error:", error);
      alert(`Failed to update medication: ${error.message || "Please try again."}`);
    }
  };

  const deleteMedication = async (id: string) => {
    if (!userId) return;

    const confirmed = confirm("Delete this medication?");
    if (!confirmed) return;

    const updatedMedications = medications.filter((m) => m.id !== id);

    try {
      const { error } = await supabase
        .from("user_medications")
        .upsert(
          {
            user_id: userId,
            medications: updatedMedications,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

      if (error) throw error;

      setMedications(updatedMedications);
    } catch (error: any) {
      console.error("Delete medication error:", error);
      alert(`Failed to delete medication: ${error.message || "Please try again."}`);
    }
  };

  /* =======================
     MEDICATION LOG DOSE
  ======================= */

  const handleLogDose = async (medicationId: string, taken: boolean) => {
    if (!userId) return;

    const newLog = {
      medicationId,
      timestamp: new Date().toISOString(),
      taken,
    };

    // Add log directly to the medication
    const updatedMedications = medications.map((m) => {
      if (m.id === medicationId) {
        return {
          ...m,
          logs: [...(m.logs || []), newLog],
        };
      }
      return m;
    });

    try {
      const { error } = await supabase
        .from("user_medications")
        .upsert(
          {
            user_id: userId,
            medications: updatedMedications,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

      if (error) throw error;

      setMedications(updatedMedications);
    } catch (error: any) {
      console.error("Failed to log dose:", error);
      alert(`Failed to log dose: ${error.message || "Please try again."}`);
    }
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

            <button
              onClick={() => setIsSummaryModalOpen(true)}
              disabled={!userId}
              className={`mt-8 px-10 py-5 text-lg rounded-2xl font-bold shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl ${
                userId
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer'
                  : 'bg-gray-400 cursor-not-allowed text-gray-200'
              }`}
            >
              Get Summary
            </button>
          </div>

          {/* SOS */}
          <div className="hidden lg:flex justify-center">
            <button
              onClick={handleSOS}
              disabled={isSendingSOS}
              className={`relative w-48 h-48 rounded-full ${
                isSendingSOS
                  ? "bg-red-400 cursor-not-allowed"
                  : "bg-red-500 hover:bg-red-600"
              } text-white shadow-2xl flex items-center justify-center transition hover:scale-110 disabled:hover:scale-100 ${
                isSendingSOS ? "" : "animate-sos-pulse"
              }`}
            >
              <span
                className={`absolute -inset-6 rounded-full bg-red-500/50 blur-[52px] animate-sos-glow-slow ${
                  isSendingSOS ? "opacity-0" : "opacity-100"
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
                {careCircleInvites.length > 0 && (
                  <span className="ml-auto rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-700">
                    {careCircleInvites.length} new
                  </span>
                )}
              </div>
              {notificationsLoading ? (
                <div className="flex-1 flex items-center justify-center px-6 py-4 text-sm text-slate-500">
                  Checking for updates...
                </div>
              ) : notificationsError ? (
                <div className="flex-1 flex items-center justify-center px-6 py-4 text-sm text-rose-600">
                  {notificationsError}
                </div>
              ) : careCircleInvites.length === 0 ? (
                <div className="flex-1 flex items-center justify-center px-6 py-4 text-sm text-slate-500">
                  No notifications yet
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                  {careCircleInvites.map((invite) => (
                    <button
                      key={invite.id}
                      type="button"
                      onClick={() => router.push("/app/carecircle?open=incoming-invites")}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-left transition hover:bg-white hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            Care circle invite
                          </p>
                          <p className="text-xs text-slate-500">
                            From {invite.name}
                          </p>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {formatInviteTimestamp(invite.createdAt)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MODALS */}
        {activeSection && (
          <Modal onClose={() => setActiveSection(null)}>
            {activeSection === "calendar" && (
              <AppointmentsModal
                appointments={appointments}
                onClose={() => setActiveSection(null)}
                onAddAppointment={handleAddAppointment}
                onDeleteAppointment={handleDeleteAppointment}
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
              <MedicalTeamModal
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
                onLogDose={handleLogDose}
              />
            )}
          </Modal>
        )}

        {/* MEDICAL SUMMARY MODAL */}
        <MedicalSummaryModal
          isOpen={isSummaryModalOpen}
          onClose={() => setIsSummaryModalOpen(false)}
          folderType="reports"
          userId={userId}
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
   MODAL WRAPPER
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
   CARD COMPONENT
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