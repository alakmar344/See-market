'use client';

import { useEffect, useState, createContext, useContext } from 'react';

import { pingBackend, fetchAiSettings, type AiSettings, type AiTone, type Theme } from '@/lib/api';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  aiSettings: AiSettings | null;
  updateAiSettings: (settings: Partial<AiSettings>) => Promise<void>;
  userId: number;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within Providers');
  }
  return context;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null);
  const [userId] = useState(1); // In a real app, this would come from auth
  const [mounted, setMounted] = useState(false);

  // Load theme and AI settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load AI settings from backend
        const settings = await fetchAiSettings(userId);
        setAiSettings(settings);
        setThemeState(settings.theme);
        
        // Apply theme to document
        document.documentElement.setAttribute('data-theme', settings.theme);
      } catch (error) {
        console.error('[providers][load-settings:error]', { error });
        // Use defaults
        setThemeState('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      }
      setMounted(true);
    };

    loadSettings();
  }, [userId]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const updateAiSettings = async (settings: Partial<AiSettings>) => {
    try {
      const { updateAiSettings: updateApi } = await import('@/lib/api');
      const updated = await updateApi(settings, userId);
      setAiSettings(updated);
      if (settings.theme) {
        setTheme(settings.theme);
      }
    } catch (error) {
      console.error('[providers][update-settings:error]', { error });
      throw error;
    }
  };

  // Heartbeat to check backend health
  useEffect(() => {
    let active = true;

    const heartbeat = () => {
      pingBackend().catch((error) => {
        if (!active) return;
        console.error('[providers][heartbeat:error]', { error });
      });
    };

    heartbeat();
    const intervalId = window.setInterval(heartbeat, 10_000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        aiSettings,
        updateAiSettings,
        userId,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
