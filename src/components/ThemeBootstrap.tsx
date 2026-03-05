'use client';

import { useEffect } from 'react';
import { useAppProfile } from '@/components/AppProfileProvider';
import { applyTheme, getCurrentTheme, isThemeStorageKey, seedThemeForUserFromLegacy } from '@/lib/themeUtils';

const resolveAndApplyTheme = (userId?: string) => {
  const nextTheme = getCurrentTheme(userId);
  applyTheme(nextTheme, userId);
};

export default function ThemeBootstrap() {
  const { userId } = useAppProfile();

  useEffect(() => {
    if (userId) {
      seedThemeForUserFromLegacy(userId);
      resolveAndApplyTheme(userId);
      return;
    }

    resolveAndApplyTheme();
  }, [userId]);

  useEffect(() => {
    const handleThemeSignal = () => resolveAndApplyTheme(userId || undefined);
    const handleStorage = (event: StorageEvent) => {
      if (isThemeStorageKey(event.key)) {
        resolveAndApplyTheme(userId || undefined);
      }
    };

    window.addEventListener('themeChange', handleThemeSignal as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('themeChange', handleThemeSignal as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, [userId]);

  return null;
}
