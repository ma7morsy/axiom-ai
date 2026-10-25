import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { groupByDay } from '@axiom/shared';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../auth/AuthProvider';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useAgents, useConversations } from '../api/hooks';
import { Avatar, Drawer, IconButton, Input } from '../ui';

type Icon = React.ComponentProps<typeof Ionicons>['name'];

function NavItem({ icon, label, active, onPress, dot }: { icon: Icon; label: string; active?: boolean; onPress: () => void; dot?: boolean }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityState={{ selected: !!active }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 10, borderRadius: t.radius.md, backgroundColor: active ? t.colors.sidebarActive : 'transparent' }}>
      <Ionicons name={icon} size={17} color={active ? '#fff' : t.colors.sidebarMuted} />
      <Text numberOfLines={1} style={{ flex: 1, color: active ? '#fff' : t.colors.sidebarText, fontSize: t.font.sm }}>{label}</Text>
      {dot ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: t.colors.highlight }} /> : null}
    </Pressable>
  );
}
const Section = ({ children }: { children: string }) => { const t = useTheme(); return <Text style={{ color: t.colors.sidebarMuted, fontSize: t.font.xs, fontWeight: '700', marginTop: 14, marginBottom: 4, paddingHorizontal: 10 }}>{children}</Text>; };

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTheme();
  const router = useRouter();
  const path = usePathname();
  const { user, isAdmin, signOut } = useAuth();
  const agents = useAgents();
  const convos = useConversations();
  const [q, setQ] = useState('');
  const go = (p: string) => { router.push(p as never); onNavigate?.(); };
  const groups = useMemo(() => groupByDay((convos.data ?? []).filter(c => c.title.toLowerCase().includes(q.toLowerCase()))), [convos.data, q]);
  const firstAgent = agents.data?.find(a => a.isLive)?.id;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.sidebar }}>
      <ScrollView contentContainerStyle={{ padding: 14 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <LinearGradient colors={[...t.gradient]} style={{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="sparkles" size={18} color="#fff" /></LinearGradient>
          <View><Text style={{ color: '#fff', fontWeight: '800', fontSize: t.font.lg }}>Axiom AI</Text><Text style={{ color: t.colors.sidebarMuted, fontSize: t.font.xs }}>Your AI companion</Text></View>
        </View>
        <Pressable onPress={() => go(`/chat/new${firstAgent ? `?agent=${firstAgent}` : ''}`)} accessibilityRole="button" accessibilityLabel="New chat">
          <LinearGradient colors={[...t.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: t.radius.md, paddingVertical: 11, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            <Ionicons name="add" size={18} color="#fff" /><Text style={{ color: '#fff', fontWeight: '700' }}>New chat</Text>
          </LinearGradient>
        </Pressable>
        <View style={{ marginTop: 12 }}><Input value={q} onChangeText={setQ} placeholder="Search chats…" style={{ backgroundColor: t.colors.sidebarActive, borderColor: t.colors.sidebarActive, color: '#fff' }} /></View>

        {groups.map(g => (
          <View key={g.label}>
            <Section>{g.label}</Section>
            {g.items.slice(0, 12).map(c => <NavItem key={c.id} icon="chatbubble-outline" label={c.title || 'New chat'} active={path === `/chat/${c.id}`} onPress={() => go(`/chat/${c.id}`)} />)}
          </View>
        ))}

        <Section>Agents</Section>
        {(agents.data ?? []).filter(a => a.isLive).map(a => <NavItem key={a.id} icon="hardware-chip-outline" label={a.name} onPress={() => go(`/chat/new?agent=${a.id}`)} />)}

        <Section>Create</Section>
        <NavItem icon="film-outline" label="Media studio" active={path === '/media'} onPress={() => go('/media')} />
        <NavItem icon="mic-circle-outline" label="Voice mode" active={path === '/voice-mode'} onPress={() => go('/voice-mode')} />
        <NavItem icon="musical-notes-outline" label="Voices & settings" active={path === '/voice'} onPress={() => go('/voice')} />

        {isAdmin ? (<>
          <Section>Admin</Section>
          {([['cube-outline', 'Models', '/admin/models'], ['people-outline', 'Agents', '/admin/agents'], ['library-outline', 'Knowledge', '/admin/knowledge'], ['chatbubbles-outline', 'Conversations', '/admin/conversations'], ['stats-chart-outline', 'Usage', '/admin/usage']] as const)
            .map(([i, l, p]) => <NavItem key={p} icon={i} label={l} active={path === p} onPress={() => go(p)} />)}
        </>) : null}
      </ScrollView>
      <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: t.colors.sidebarActive, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Avatar name={user?.displayName ?? '?'} color={t.colors.highlight} />
        <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: '#fff', fontSize: t.font.sm, fontWeight: '600' }}>{user?.displayName}</Text><Text style={{ color: t.colors.sidebarMuted, fontSize: t.font.xs }}>{user?.role}</Text></View>
        <IconButton icon={t.dark ? 'sunny-outline' : 'moon-outline'} label="Toggle theme" color={t.colors.sidebarMuted} onPress={() => t.setMode(t.dark ? 'light' : 'dark')} />
        <IconButton icon="log-out-outline" label="Sign out" color={t.colors.sidebarMuted} onPress={signOut} />
      </View>
    </View>
  );
}

/** Responsive shell: fixed sidebar on tablet/desktop, slide-over drawer on phones. */
export function Shell({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const { isMobile } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  if (!isMobile) return <View style={{ flex: 1, flexDirection: 'row', backgroundColor: t.colors.bg }}><View style={{ width: 280 }}><SidebarContent /></View><View style={{ flex: 1 }}>{children}</View></View>;
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: t.colors.surface, borderBottomWidth: 1, borderBottomColor: t.colors.border }}>
        <IconButton icon="menu" label="Open menu" size={24} color={t.colors.text} onPress={() => setOpen(true)} />
        <Text style={{ color: t.colors.text, fontWeight: '800', fontSize: t.font.lg }}>Axiom AI</Text>
      </View>
      <View style={{ flex: 1 }}>{children}</View>
      <Drawer visible={open} onClose={() => setOpen(false)} background={t.colors.sidebar} width={320}><SidebarContent onNavigate={() => setOpen(false)} /></Drawer>
    </View>
  );
}
