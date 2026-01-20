'use client';

import { useEffect, useMemo, useState, type ReactElement } from 'react';
import {
  Crown,
  Shield,
  User,
  Eye,
  UserPlus,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '@/lib/createClient';

type CareCircleRole = 'owner' | 'admin' | 'member' | 'viewer';
type CareCircleStatus = 'pending' | 'active' | 'revoked';

type CareCircleMember = {
  id: string;
  name: string;
  role: CareCircleRole;
  status: CareCircleStatus;
  email?: string;
};

type CareCircleData = {
  circleName: string;
  ownerName: string;
  myCircleMembers: CareCircleMember[];
  circlesImIn: CareCircleMember[];
  currentUserRole: CareCircleRole;
};

const roleIcons: Record<CareCircleRole, ReactElement> = {
  owner: <Crown className="h-4 w-4 text-amber-500" />,
  admin: <Shield className="h-4 w-4 text-teal-600" />,
  member: <User className="h-4 w-4 text-slate-500" />,
  viewer: <Eye className="h-4 w-4 text-slate-400" />,
};

const roleLabels: Record<CareCircleRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

const statusStyles: Record<CareCircleStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  revoked: 'bg-rose-50 text-rose-700 border-rose-200',
};

const roleOptions: CareCircleRole[] = ['admin', 'member', 'viewer'];

export default function CareCirclePage() {
  const [circleData, setCircleData] = useState<CareCircleData>({
    circleName: 'Loading…',
    ownerName: '',
    myCircleMembers: [],
    circlesImIn: [],
    currentUserRole: 'viewer',
  });

  useEffect(() => {
    async function loadCareCircle() {
      const { data } = await supabase.auth.getUser();

      // TODO: Replace placeholder data with Supabase queries once care circle tables exist.
      // Example: fetch care_circle, care_circle_members, and join with profiles for display names.
      const placeholderMembers: CareCircleMember[] = [
        {
          id: data.user?.id ?? 'owner-1',
          name: 'Maya Patel',
          role: 'owner',
          status: 'active',
          email: 'maya@example.com',
        },
        {
          id: 'admin-1',
          name: 'Alex Johnson',
          role: 'admin',
          status: 'active',
          email: 'alex@example.com',
        },
        {
          id: 'member-1',
          name: 'Priya Singh',
          role: 'member',
          status: 'pending',
          email: 'priya@example.com',
        },
        {
          id: 'viewer-1',
          name: 'Jordan Lee',
          role: 'viewer',
          status: 'revoked',
          email: 'jordan@example.com',
        },
      ];

      const placeholderCirclesImIn: CareCircleMember[] = [
        {
          id: 'circle-admin-1',
          name: 'Ravi Sharma',
          role: 'admin',
          status: 'active',
          email: 'ravi@example.com',
        },
        {
          id: 'circle-member-1',
          name: 'Elena Torres',
          role: 'member',
          status: 'active',
          email: 'elena@example.com',
        },
        {
          id: 'circle-viewer-1',
          name: 'Samira Ali',
          role: 'viewer',
          status: 'pending',
          email: 'samira@example.com',
        },
      ];

      setCircleData({
        circleName: "Maya's Care Circle",
        ownerName: 'Maya Patel',
        myCircleMembers: placeholderMembers,
        circlesImIn: placeholderCirclesImIn,
        currentUserRole: 'owner',
      });
    }

    loadCareCircle();
  }, []);

  const isAdmin = useMemo(
    () => ['owner', 'admin'].includes(circleData.currentUserRole),
    [circleData.currentUserRole]
  );

  const handleRoleChange = (memberId: string, role: CareCircleRole) => {
    setCircleData((prev) => ({
      ...prev,
      myCircleMembers: prev.myCircleMembers.map((member) =>
        member.id === memberId ? { ...member, role } : member
      ),
    }));
  };

  const handleRemove = (memberId: string) => {
    setCircleData((prev) => ({
      ...prev,
      myCircleMembers: prev.myCircleMembers.map((member) =>
        member.id === memberId ? { ...member, status: 'revoked' } : member
      ),
    }));
  };

  return (
    <div className="min-h-screen bg-[#f4f7f8]">
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <section className="bg-white rounded-3xl border border-white/20 shadow-xl shadow-teal-900/10 p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-teal-600 font-semibold">
                Care Circle
              </p>
              <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-2">
                {circleData.circleName}
              </h1>
              <p className="text-slate-500 mt-2">
                Owned by <span className="font-semibold text-slate-700">{circleData.ownerName}</span>
              </p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-teal-600 text-white font-semibold shadow-md shadow-teal-900/20 hover:bg-teal-700 transition">
              <UserPlus className="h-5 w-5" />
              Invite member
            </button>
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-white/20 shadow-xl shadow-teal-900/10 p-6 md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Members</h2>
              <p className="text-slate-500 text-sm">
                Manage roles, invitations, and access for your care team.
              </p>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2 text-sm text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-4 py-2">
                <Shield className="h-4 w-4" />
                Admin controls enabled
              </div>
            )}
          </div>

          <div className="mt-6 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Members in my Care Circle
                  </h3>
                  <p className="text-sm text-slate-500">
                    People you&apos;ve invited to support your care journey.
                  </p>
                </div>
              </div>
              {circleData.myCircleMembers.map((member) => {
                const isOwner = member.role === 'owner';

                return (
                  <div
                    key={member.id}
                    className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-11 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                        {roleIcons[member.role]}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-slate-900">
                          {member.name}
                        </p>
                        <p className="text-sm text-slate-500">{member.email ?? '—'}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600">
                        {roleIcons[member.role]}
                        {roleLabels[member.role]}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusStyles[member.status]}`}
                      >
                        {member.status}
                      </span>

                      {isAdmin && !isOwner && (
                        <div className="flex items-center gap-2">
                          <label className="relative">
                            <span className="sr-only">Change role</span>
                            <select
                              className="appearance-none rounded-full border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
                              value={member.role}
                              onChange={(event) =>
                                handleRoleChange(member.id, event.target.value as CareCircleRole)
                              }
                            >
                              {roleOptions.map((role) => (
                                <option key={role} value={role}>
                                  {roleLabels[role]}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemove(member.id)}
                            className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </button>
                        </div>
                      )}

                      {!isAdmin && (
                        <span className="text-xs text-slate-400">View-only</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Care Circles I&apos;m part of
                  </h3>
                  <p className="text-sm text-slate-500">
                    Circles where you have access to help someone else.
                  </p>
                </div>
              </div>

              {circleData.circlesImIn.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center">
                      {roleIcons[member.role]}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        {member.name}
                      </p>
                      <p className="text-sm text-slate-500">{member.email ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600">
                      {roleIcons[member.role]}
                      {roleLabels[member.role]}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusStyles[member.status]}`}
                    >
                      {member.status}
                    </span>
                    <span className="text-xs text-slate-400">View-only</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            <p>
              TODO: Hook this page up to Care Circle tables, member invitations, and role updates once the
              Supabase schema is finalized.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
