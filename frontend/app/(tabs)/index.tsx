import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import PageShell from '../../components/PageShell';
import { colors, radii, spacing, typography } from '../../components/sharedStyles';

export default function TabHomeScreen() {
  const [humidity, setHumidity] = useState(25);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    setShowWarning(humidity < 30);
  }, [humidity]);

  return (
    <PageShell>
      <View style={styles.content}>
        {showWarning && (
          <View style={styles.warningToast}>
            <Text style={styles.warningText}>⚠️ 濕度異常，請盡速進行灌溉作業</Text>
          </View>
        )}

        <View style={styles.gridContainer}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>溫度</Text>
            <Text style={styles.cardValue}>25 <Text style={styles.cardUnit}>°C</Text></Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>☀ 光照強度</Text>
            <Text style={styles.cardValue}>100,000 <Text style={styles.cardUnit}>lux</Text></Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>土壤濕度</Text>
            <Text style={styles.cardValue}>{humidity} <Text style={styles.cardUnit}>%</Text></Text>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setHumidity(50)}
            >
              <Text style={styles.actionButtonText}>手動灌溉</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>二氧化碳濃度</Text>
            <Text style={styles.cardValue}>80 <Text style={styles.cardUnit}>%</Text></Text>
          </View>
        </View>

        <View style={styles.scheduleCard}>
          <Text style={styles.scheduleTitle}>自動灌溉排程</Text>
          <View style={styles.scheduleRow}>
            <Text style={styles.scheduleLabel}>灌溉頻率　每隔</Text>
            <TextInput style={styles.inputBox} placeholder="2" placeholderTextColor={colors.muted} />
            <Text style={styles.scheduleLabel}> 小時 灌溉一次</Text>
          </View>

          <View style={styles.scheduleRow}>
            <Text style={styles.scheduleLabel}>單次時長　一次灌溉</Text>
            <TextInput style={styles.inputBox} placeholder="10" placeholderTextColor={colors.muted} />
            <Text style={styles.scheduleLabel}> 分鐘</Text>
            <TouchableOpacity style={styles.saveButton}>
              <Text style={styles.saveButtonText}>儲存設定</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    padding: spacing.xl,
    flex: 1,
  },
  warningToast: {
    backgroundColor: colors.alert,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
  },
  warningText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: colors.text,
    fontSize: typography.body,
    marginBottom: spacing.sm,
  },
  cardValue: {
    color: colors.text,
    fontSize: typography.large,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cardUnit: {
    fontSize: typography.body,
  },
  actionButton: {
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: radii.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  actionButtonText: {
    color: colors.text,
    fontWeight: 'bold',
  },
  scheduleCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  scheduleTitle: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  scheduleLabel: {
    color: colors.text,
    fontSize: typography.body,
  },
  inputBox: {
    backgroundColor: colors.leftPanel,
    color: colors.text,
    width: 50,
    height: 36,
    borderRadius: radii.sm,
    textAlign: 'center',
    marginHorizontal: spacing.md,
    padding: 0,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: radii.md,
    marginLeft: 'auto',
  },
  saveButtonText: {
    color: colors.text,
    fontWeight: 'bold',
  },
});