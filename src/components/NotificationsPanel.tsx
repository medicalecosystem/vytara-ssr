//NotificationPanel.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";

type CareCircleInvite = {
  id: string;
  name: string;
  createdAt: string;
};

type Appointment = {
  id: string;
  date: string;
  time: string;
  title: string;
  type: string;
};

type NotificationsPanelProps = {
  userId: string;
  appointments: Appointment[];
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const dismissedInvitesKey = (userId: string) => `vytara:dismissed-invites:${userId}`;
const dismissedAppointmentsKey = (userId: string) => `vytara:dismissed-appointments:${userId}`;

export function NotificationsPanel({ userId, appointments }: NotificationsPanelProps) {
  const router = useRouter();
  const [careCircleInvites, setCareCircleInvites] = useState<CareCircleInvite[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [dismissedInviteIds, setDismissedInviteIds] = useState<Set<string>>(() => new Set());
  const [dismissedAppointmentIds, setDismissedAppointmentIds] = useState<Set<string>>(() => new Set());
  const [showMobileNotifications, setShowMobileNotifications] = useState(false);

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    try {
      const storedInvites = window.localStorage.getItem(dismissedInvitesKey(userId));
      const storedAppointments = window.localStorage.getItem(dismissedAppointmentsKey(userId));
      if (storedInvites) {
        const parsed = JSON.parse(storedInvites) as string[];
        setDismissedInviteIds(new Set(parsed));
      } else {
        setDismissedInviteIds(new Set());
      }
      if (storedAppointments) {
        const parsed = JSON.parse(storedAppointments) as string[];
        setDismissedAppointmentIds(new Set(parsed));
      } else {
        setDismissedAppointmentIds(new Set());
      }
    } catch {
      setDismissedInviteIds(new Set());
      setDismissedAppointmentIds(new Set());
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    window.localStorage.setItem(
      dismissedInvitesKey(userId),
      JSON.stringify(Array.from(dismissedInviteIds))
    );
  }, [dismissedInviteIds, userId]);

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    window.localStorage.setItem(
      dismissedAppointmentsKey(userId),
      JSON.stringify(Array.from(dismissedAppointmentIds))
    );
  }, [dismissedAppointmentIds, userId]);

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

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const formatInviteTimestamp = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Just now";

    const now = new Date();
    const diffMs = now.getTime() - parsed.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const parseAppointmentDateTime = (appointment: Appointment) => {
    const parsed = new Date(`${appointment.date}T${appointment.time}`);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const formatTimeUntil = (target: Date) => {
    const diffMs = target.getTime() - now.getTime();
    if (diffMs <= 0) return "Starting now";
    const diffMinutes = Math.floor(diffMs / 60_000);
    if (diffMinutes < 60) return `In ${diffMinutes}m`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `In ${diffHours}h`;
  };

  const dismissInvite = (id: string) => {
    setDismissedInviteIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const dismissAppointment = (id: string) => {
    setDismissedAppointmentIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const upcomingAppointments = appointments
    .map((appointment) => {
      const dateTime = parseAppointmentDateTime(appointment);
      if (!dateTime) return null;
      const diffMs = dateTime.getTime() - now.getTime();
      if (diffMs <= 0 || diffMs > ONE_DAY_MS) return null;
      return { appointment, dateTime, diffMs };
    })
    .filter((item): item is { appointment: Appointment; dateTime: Date; diffMs: number } => Boolean(item))
    .filter(({ appointment }) => !dismissedAppointmentIds.has(appointment.id))
    .sort((a, b) => a.diffMs - b.diffMs);

  const visibleCareCircleInvites = careCircleInvites.filter((invite) => !dismissedInviteIds.has(invite.id));
  const totalNotifications = visibleCareCircleInvites.length + upcomingAppointments.length;

  const NotificationContent = () => (
    <>
      {notificationsLoading && totalNotifications === 0 ? (
        <div className="flex-1 flex items-center justify-center px-6 py-4 text-sm text-slate-500">
          Checking for updates...
        </div>
      ) : notificationsError && totalNotifications === 0 ? (
        <div className="flex-1 flex items-center justify-center px-6 py-4 text-sm text-rose-600">
          {notificationsError}
        </div>
      ) : totalNotifications === 0 ? (
        <div className="flex-1 flex items-center justify-center px-6 py-4 text-sm text-slate-500">
          No notifications yet
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {upcomingAppointments.map(({ appointment, dateTime }) => (
            <button
              key={`appointment-${appointment.id}`}
              type="button"
              onClick={() => {
                setShowMobileNotifications(false);
                router.push("/app/homepage");
              }}
              className="group relative w-full rounded-2xl border border-slate-100 bg-amber-50/80 p-3 text-left transition hover:bg-white hover:shadow-sm"
            >
              <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-transparent transition group-hover:ring-amber-100" />
              <span className="absolute right-2 top-2">
                <span className="inline-flex rounded-full">
                  <span
                    role="button"
                    aria-label="Dismiss appointment notification"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      dismissAppointment(appointment.id);
                    }}
                    className="pointer-events-auto inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 opacity-0 transition hover:bg-white hover:text-slate-600 group-hover:opacity-100"
                  >
                    <X size={14} />
                  </span>
                </span>
              </span>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Upcoming appointment</p>
                  <p className="text-xs text-slate-600">
                    {appointment.title || appointment.type} · {dateTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <span className="text-[11px] text-slate-500">{formatTimeUntil(dateTime)}</span>
              </div>
            </button>
          ))}
          {visibleCareCircleInvites.map((invite) => (
            <button
              key={invite.id}
              type="button"
              onClick={() => {
                setShowMobileNotifications(false);
                router.push("/app/carecircle?open=incoming-invites");
              }}
              className="group relative w-full rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-left transition hover:bg-white hover:shadow-sm"
            >
              <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-transparent transition group-hover:ring-slate-100" />
              <span className="absolute right-2 top-2">
                <span className="inline-flex rounded-full">
                  <span
                    role="button"
                    aria-label="Dismiss care circle invite notification"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      dismissInvite(invite.id);
                    }}
                    className="pointer-events-auto inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 opacity-0 transition hover:bg-white hover:text-slate-600 group-hover:opacity-100"
                  >
                    <X size={14} />
                  </span>
                </span>
              </span>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Care circle invite</p>
                  <p className="text-xs text-slate-500">From {invite.name}</p>
                </div>
                <span className="text-[11px] text-slate-400">{formatInviteTimestamp(invite.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile Notification Button - First in button row */}
      <button
        type="button"
        onClick={() => setShowMobileNotifications(true)}
        className="lg:hidden relative flex items-center justify-center gap-2 px-8 py-4 rounded-3xl bg-teal-100 hover:bg-teal-200 transition shadow-sm"
        aria-label="Open notifications"
      >
        <Bell size={22} className="text-teal-700" />
        <span className="text-base font-semibold text-teal-700">Notifications</span>
        {totalNotifications > 0 && (
          <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-[11px] font-bold text-white">
            {totalNotifications > 9 ? "9+" : totalNotifications}
          </span>
        )}
      </button>

      {/* Mobile Notifications Modal */}
      {showMobileNotifications && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowMobileNotifications(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-4 top-4 bottom-4 bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                  <Bell size={18} className="text-teal-600" />
                </div>
                <h3 className="font-bold text-lg">Notifications</h3>
                {totalNotifications > 0 && (
                  <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-700">
                    {totalNotifications} new
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowMobileNotifications(false)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                aria-label="Close notifications"
              >
                <X size={20} />
              </button>
            </div>
            <NotificationContent />
          </div>
        </div>
      )}

      {/* Desktop Notification Panel */}
      <div className="hidden lg:flex justify-end">
        <div className="bg-white rounded-3xl shadow-lg transition border w-full max-w-sm h-[420px] flex flex-col">
          <div className="flex items-center gap-3 px-6 py-5 border-b">
            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
              <Bell size={18} className="text-teal-600" />
            </div>
            <h3 className="font-bold text-lg">Notifications</h3>
            {totalNotifications > 0 && (
              <span className="ml-auto rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-700">
                {totalNotifications} new
              </span>
            )}
          </div>
          <NotificationContent />
        </div>
      </div>
    </>
  );
}