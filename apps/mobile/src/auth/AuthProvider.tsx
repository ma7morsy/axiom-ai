import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthResponse } from '@axiom/shared';
import { api, setToken, setUnauthorizedHandler } from '../api/client';
import { storage } from '../lib/storage';

interface Ctx {
  user: AuthResponse | null; ready: boolean; isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
}
const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();

  const apply = useCallback(async (r: AuthResponse | null) => {
    setToken(r?.token ?? null); setUser(r);
    if (r) await storage.set('session', JSON.stringify(r)); else await storage.remove('session');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => { apply(null); qc.clear(); });
    storage.get('session').then(s => {
      if (s) { try { const r = JSON.parse(s) as AuthResponse; setToken(r.token); setUser(r); } catch { /* bad session */ } }
      setReady(true);
    });
  }, [apply, qc]);

  const value: Ctx = {
    user, ready, isAdmin: user?.role === 'admin',
    signIn: async (email, password) => apply(await api<AuthResponse>('/auth/login', { body: { email, password }, auth: false })),
    register: async (email, password, displayName) => apply(await api<AuthResponse>('/auth/register', { body: { email, password, displayName }, auth: false })),
    signOut: async () => { await apply(null); qc.clear(); }
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => { const c = useContext(AuthCtx); if (!c) throw new Error('AuthProvider missing'); return c; };
