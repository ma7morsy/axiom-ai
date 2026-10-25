import React from 'react';
import { Modal as RNModal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Button, IconButton } from './Button';

export function Modal({ visible, onClose, title, children, footer }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  const t = useTheme();
  const { height } = useWindowDimensions();
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} accessibilityLabel="Close dialog" style={{ flex: 1, backgroundColor: t.colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 520, maxHeight: height * 0.88, backgroundColor: t.colors.surface, borderRadius: t.radius.lg, padding: 18, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text accessibilityRole="header" style={{ color: t.colors.text, fontSize: t.font.lg, fontWeight: '700' }}>{title}</Text>
            <IconButton icon="close" label="Close" onPress={onClose} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>{children}</ScrollView>
          {footer}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

/** Slide-over panel used for the sidebar on phones and the artifact panel on small screens. */
export function Drawer({ visible, onClose, side = 'left', width = 300, children, background }: { visible: boolean; onClose: () => void; side?: 'left' | 'right'; width?: number; children: React.ReactNode; background?: string }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, flexDirection: side === 'left' ? 'row' : 'row-reverse' }}>
        <View style={{ width: Math.min(width, 420), maxWidth: '92%', backgroundColor: background ?? t.colors.surface, paddingTop: insets.top, paddingBottom: insets.bottom }}>{children}</View>
        <Pressable onPress={onClose} accessibilityLabel="Close panel" style={{ flex: 1, backgroundColor: t.colors.overlay }} />
      </View>
    </RNModal>
  );
}

export function ConfirmDialog({ visible, title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel }: {
  visible: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const t = useTheme();
  return (
    <Modal visible={visible} onClose={onCancel} title={title} footer={
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
        <Button title="Cancel" variant="secondary" onPress={onCancel} />
        <Button title={confirmLabel} variant={danger ? 'danger' : 'primary'} onPress={onConfirm} />
      </View>}>
      <Text style={{ color: t.colors.muted, fontSize: t.font.md }}>{message}</Text>
    </Modal>
  );
}
