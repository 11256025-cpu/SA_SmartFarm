import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import TopNav from '../components/TopNav';
import { colors, radii, spacing } from './sharedStyles';

type Props = {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode; // fallback
  active?: string;
  showNav?: boolean;
  onBellPress?: () => void;
  hasUnreadAlerts?: boolean;
};

export default function PageShell({ left, center, right, children, active, showNav, onBellPress, hasUnreadAlerts }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      {showNav !== false ? <TopNav active={active || ''} onBellPress={onBellPress} hasUnreadAlerts={hasUnreadAlerts} /> : null}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.mainLayout}>
          {left ? <View style={styles.leftPanel}>{left}</View> : null}
          {center ? <View style={styles.centerPanel}>{center}</View> : null}
          {right ? <View style={styles.rightPanel}>{right}</View> : null}
          {!left && !right && <View style={styles.full}>{children}</View>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  mainLayout: { flex: 1, flexDirection: 'row', padding: spacing.xl, gap: 25, width: '100%', maxWidth: 1400 },
  leftPanel: { flex: 3.8, backgroundColor: colors.leftPanel, borderRadius: radii.lg, padding: spacing.xl },
  centerPanel: { width: 260, alignItems: 'center' },
  rightPanel: { flex: 6.2 },
  full: { width: '100%' },
});
