import { Redirect } from 'expo-router';
import { useAuth } from '../src/auth/AuthProvider';
import { Spinner } from '../src/ui';

export default function Index() {
  const { user, ready } = useAuth();
  if (!ready) return <Spinner />;
  return <Redirect href={user ? '/chat/new' : '/login'} />;
}
