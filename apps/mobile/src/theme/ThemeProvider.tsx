import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, darkColors, lightColors, radius, spacing, font, gradient } from '@axiom/shared';
import { storage } from '../lib/storage';

interface Theme { colors: Colors; spacing: typeof spacing; radius: typeof radius; font: typeof font; gradient: typeof gradient; dark: boolean }
interface Ctx extends Theme { mode: 'light' | 'dark'; setMode: (m: 'light' | 'dark') => void }
const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [mode, setModeState] = useState<'light' | 'dark'>(system);
  useEffect(() => { storage.get('theme').then(v => (v === 'light' || v === 'dark') && setModeState(v)); }, []);
  const value = useMemo<Ctx>(() => ({
    mode, dark: mode === 'dark', colors: mode === 'dark' ? darkColors : lightColors, spacing, radius, font, gradient,
    setMode: m => { setModeState(m); storage.set('theme', m); }
  }), [mode]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
export const useTheme = () => { const c = useContext(ThemeCtx); if (!c) throw new Error('ThemeProvider missing'); return c; };
