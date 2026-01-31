'use client';

import { LogOut, Home, User, Folder, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/createClient';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const navItems = [
    { label: 'Home', href: '/app/homepage', icon: Home },
    { label: 'Profile', href: '/app/profilepage', icon: User },
    { label: 'Vault', href: '/app/vaultpage', icon: Folder },
    { label: 'Care Circle', href: '/app/carecircle', icon: Users },
    { label: 'Family', href: '/app/family', icon: Users},
  ];

  useEffect(() => {
    const stored = window.localStorage.getItem('vytara_nav_collapsed');
    if (stored) setCollapsed(stored === '1');
  }, []);

  useEffect(() => {
    window.localStorage.setItem('vytara_nav_collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  return (
    <aside
      className={`sticky top-0 h-screen shrink-0 border-r border-teal-900/20 bg-gradient-to-b from-teal-950 via-slate-950 to-slate-950 text-white transition-[width] duration-200 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex h-full flex-col px-3 py-6">
        <div className="flex items-center justify-between px-1">
          <button
            className="flex items-center gap-3 text-left"
            onClick={() => router.push('/app/homepage')}
          >
            <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-md p-2">
              <div className="w-full h-full bg-teal-600 rounded-full"></div>
            </div>
            {!collapsed && (
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-teal-200/70">
                  Vytara
                </p>
                <p className="text-lg font-semibold leading-tight">Patient Hub</p>
              </div>
            )}
          </button>
          <button
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? 'Open navbar' : 'Close navbar'}
            className="ml-auto rounded-lg p-2 text-teal-100/70 hover:bg-white/10 hover:text-white transition"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        <nav className="mt-8 flex-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-teal-500/20 text-white shadow-sm'
                    : 'text-teal-100/80 hover:bg-white/10 hover:text-white'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4" />
                {!collapsed && item.label}
              </button>
            );
          })}
        </nav>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push('/auth/login');
          }}
          title={collapsed ? 'Logout' : undefined}
          className="mt-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-200/90 hover:bg-white/10 hover:text-red-100 transition"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && 'Logout'}
        </button>
      </div>
    </aside>
  );
}
