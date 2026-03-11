import { useEffect, useState } from 'react';

import { useThemeStore } from '@/store/themeStore';

function getSystemScheme() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light' as const;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useColorScheme() {
  const preference = useThemeStore((state) => state.preference);
  const [systemScheme, setSystemScheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyScheme = () => setSystemScheme(mediaQuery.matches ? 'dark' : 'light');

    applyScheme();

    const listener = (event: MediaQueryListEvent) => {
      setSystemScheme(event.matches ? 'dark' : 'light');
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }

    mediaQuery.addListener(listener);
    return () => mediaQuery.removeListener(listener);
  }, []);

  return preference === 'system' ? systemScheme : preference;
}
