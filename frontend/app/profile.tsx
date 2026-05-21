import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PageShell from '../components/PageShell';
import { colors, radii, spacing, typography } from '../components/sharedStyles';

export default function ProfileScreen() {
  const user = {
    name: '張三',
    username: 'smartfarmer',
    email: 'user@example.com',
    role: '種植管理員',
  };

  return (
    <PageShell>
      <View style={styles.page}>
        <View style={styles.profileCard}>
          <Text style={styles.title}>個人資料</Text>
          <View style={styles.row}>
            <Text style={styles.label}>暱稱</Text>
            <Text style={styles.value}>{user.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>使用者帳號</Text>
            <Text style={styles.value}>{user.username}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>電子郵件</Text>
            <Text style={styles.value}>{user.email}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>角色</Text>
            <Text style={styles.value}>{user.role}</Text>
          </View>

          <TouchableOpacity style={styles.signOutButton}>
            <Text style={styles.signOutText}>登出</Text>
          </TouchableOpacity>
        </View>
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  page: {
    width: '100%',
    padding: spacing.xl,
  },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 760,
  },
  title: {
    color: colors.text,
    fontSize: typography.h1 + 2,
    fontWeight: 'bold',
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  label: {
    color: colors.muted,
    fontSize: typography.body,
  },
  value: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
  },
  signOutButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.alert,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  signOutText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
});