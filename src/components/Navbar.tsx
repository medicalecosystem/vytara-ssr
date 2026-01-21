'use client';

import { Menu, X, LogOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/createClient';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 border-b border-white/20 shadow-sm"
      style={{
        background:
          'linear-gradient(90deg, #006770 0%, #00838B 40%, #00A3A9 100%)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">

          {/* Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => router.push('/app/homepage')}
          >
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md p-2">
              <div className="w-full h-full bg-teal-600 rounded-full"></div>
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide">
              Vytara
            </h1>
          </div>

          {/* Hamburger Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-white hover:bg-white/20 rounded-lg flex items-center justify-center transition border border-white/30 bg-white/10 backdrop-blur-sm"
            >
              {menuOpen ? (
                <X className="w-7 h-7" />
              ) : (
                <Menu className="w-7 h-7" />
              )}
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-white/20 bg-black/70 backdrop-blur-md shadow-lg overflow-hidden z-50">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push('/app/homepage');
                  }}
                  className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition"
                >
                  Home
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push('/app/profilepage');
                  }}
                  className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition"
                >
                  Profile
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push('/app/vaultpage');
                  }}
                  className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition"
                >
                  Vault
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push('/app/carecircle');
                  }}
                  className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition"
                >
                  Care Circle
                </button>

                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setMenuOpen(false);
                    router.push('/auth/login');
                  }}
                  className="w-full px-4 py-3 text-left text-red-400 hover:bg-white/10 transition flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
