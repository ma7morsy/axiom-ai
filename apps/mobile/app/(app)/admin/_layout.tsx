import React from 'react';
import { Redirect, Slot } from 'expo-router';
import { useAuth } from '../../../src/auth/AuthProvider';

export default function AdminLayout() {
  const { isAdmin } = useAuth();
  return isAdmin ? <Slot /> : <Redirect href="/chat/new" />;
}
