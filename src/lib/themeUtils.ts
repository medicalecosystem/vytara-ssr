export const applyTheme = (theme: string) => {
  const root = document.documentElement;

  // Remove existing theme classes
  root.classList.remove('theme-charcoal', 'theme-clay', 'theme-olive', 'theme-coffee', 'theme-ocean', 'theme-sunset', 'theme-lemon', 'theme-lavender', 'theme-cherryblue');

  // Apply new theme
  if (theme !== 'default') {
    root.classList.add(`theme-${theme}`);
  }

  // Store theme preference
  localStorage.setItem('vytara_theme', theme);
};

export const getCurrentTheme = (): string => {
  if (typeof window === 'undefined') return 'default';
  return localStorage.getItem('vytara_theme') || 'default';
};

export const themes = [
  { name: 'Default', value: 'default' },
  { name: 'Charcoal', value: 'charcoal' },
  { name: 'Clay', value: 'clay' },
  { name: 'Olive', value: 'olive' },
  { name: 'Coffee', value: 'coffee' },
  { name: 'Ocean', value: 'ocean' },
  { name: 'Sunset', value: 'sunset' },
  { name: 'Lemon', value: 'lemon' },
  { name: 'Lavender', value: 'lavender' },
  { name: 'Cherryblue', value: 'cherryblue' }
];
