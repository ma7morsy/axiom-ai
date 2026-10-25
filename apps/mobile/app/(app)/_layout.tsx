import React from 'react';
import { Redirect, Slot } from 'expo-router';
import { useAuth } from '../../src/auth/AuthProvider';
import { Shell } from '../../src/features/Shell';
import { Spinner } from '../../src/ui';

export default function AppLayout() {
  const { user, ready } = useAuth();
  if (!ready) return <Spinner />;
  if (!user) return <Redirect href="/login" />;
  return <Shell><Slot /></Shell>;
}
