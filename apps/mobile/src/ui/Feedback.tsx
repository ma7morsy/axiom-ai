import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from './Button';

export const Spinner = ({ label }: { label?: string }) => {
  const t = useTheme();
  return <View accessibilityRole="progressbar" style={{ padding: 24, alignItems: 'center', gap: 8 }}><ActivityIndicator color={t.colors.primary} />{label ? <Text style={{ color: t.colors.muted }}>{label}</Text> : null}</View>;
};

export function EmptyState({ icon = 'file-tray-outline', title, hint, action }: { icon?: React.ComponentProps<typeof Ionicons>['name']; title: string; hint?: string; action?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ padding: 28, alignItems: 'center', gap: 8 }}>
      <Ionicons name={icon} size={32} color={t.colors.muted} />
      <Text style={{ color: t.colors.text, fontWeight: '700', fontSize: t.font.md }}>{title}</Text>
      {hint ? <Text style={{ color: t.colors.muted, textAlign: 'center', maxWidth: 320 }}>{hint}</Text> : null}
      {action}
    </View>
  );
}

export function ErrorState({ message = 'The assistant is unavailable right now. Try again.', onRetry }: { message?: string; onRetry?: () => void }) {
  const t = useTheme();
  return (
    <View accessibilityRole="alert" style={{ padding: 28, alignItems: 'center', gap: 10 }}>
      <Ionicons name="alert-circle-outline" size={32} color={t.colors.danger} />
      <Text style={{ color: t.colors.text, textAlign: 'center', maxWidth: 340 }}>{message}</Text>
      {onRetry ? <Button title="Try again" onPress={onRetry} small /> : null}
    </View>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'success' | 'danger' | 'neutral' | 'info' }) {
  const t = useTheme();
  const map = { success: [t.colors.successBg, t.colors.success], danger: [t.colors.dangerBg, t.colors.danger], neutral: [t.colors.surfaceAlt, t.colors.muted], info: [t.colors.userBubble, t.colors.primary] } as const;
  const [bg, fg] = map[tone];
  return <View style={{ backgroundColor: bg, paddingHorizontal: 9, paddingVertical: 3, borderRadius: t.radius.pill, alignSelf: 'flex-start' }}><Text style={{ color: fg, fontSize: t.font.xs, fontWeight: '700' }}>{label}</Text></View>;
}

type ToastKind = 'success' | 'error' | 'info';
const ToastCtx = createContext<(msg: string, kind?: ToastKind) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const [toast, setToast] = useState<{ msg: string; kind: ToastKind } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const show = useCallback((msg: string, kind: ToastKind = 'info') => {
    setToast({ msg, kind }); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(null), 3500);
  }, []);
  const color = toast?.kind === 'success' ? t.colors.success : toast?.kind === 'error' ? t.colors.danger : t.colors.primary;
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast ? (
        <View accessibilityLiveRegion="polite" pointerEvents="none" style={{ position: 'absolute', bottom: 24, left: 16, right: 16, alignItems: 'center' }}>
          <View style={{ backgroundColor: t.colors.surface, borderLeftWidth: 4, borderLeftColor: color, paddingVertical: 12, paddingHorizontal: 16, borderRadius: t.radius.md, maxWidth: 460, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 }}>
            <Text style={{ color: t.colors.text, fontSize: t.font.sm }}>{toast.msg}</Text>
          </View>
        </View>
      ) : null}
    </ToastCtx.Provider>
  );
}
