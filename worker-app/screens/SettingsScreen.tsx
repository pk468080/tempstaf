import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

type SettingsScreenProps = {
  onBack: () => void
  onLogout: () => void
}

export default function SettingsScreen({
  onBack,
  onLogout,
}: SettingsScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        {/* BACK */}

        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>
            ← Back
          </Text>
        </TouchableOpacity>

        {/* HEADER */}

        <Text style={styles.title}>
          Settings
        </Text>

        <Text style={styles.subtitle}>
          Manage your TempStaff worker preferences.
        </Text>

        {/* NOTIFICATIONS */}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Notifications
          </Text>

          <SettingRow
            title="Booking notifications"
            description="Receive notifications about new booking requests."
            value={true}
            onValueChange={() => {}}
          />

          <View style={styles.divider} />

          <SettingRow
            title="Booking updates"
            description="Receive updates when your bookings change."
            value={true}
            onValueChange={() => {}}
          />
        </View>

        {/* ACCOUNT */}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Account
          </Text>

          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>
                👤
              </Text>
            </View>

            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>
                Account information
              </Text>

              <Text style={styles.actionDescription}>
                Manage your worker account details.
              </Text>
            </View>

            <Text style={styles.chevron}>
              ›
            </Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>
                🔒
              </Text>
            </View>

            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>
                Security
              </Text>

              <Text style={styles.actionDescription}>
                Manage your account security.
              </Text>
            </View>

            <Text style={styles.chevron}>
              ›
            </Text>
          </TouchableOpacity>
        </View>

        {/* WORKER PREFERENCES */}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Worker preferences
          </Text>

          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>
                📍
              </Text>
            </View>

            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>
                Service area
              </Text>

              <Text style={styles.actionDescription}>
                Manage the area where you accept jobs.
              </Text>
            </View>

            <Text style={styles.chevron}>
              ›
            </Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>
                💼
              </Text>
            </View>

            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>
                Services
              </Text>

              <Text style={styles.actionDescription}>
                View the services you can provide.
              </Text>
            </View>

            <Text style={styles.chevron}>
              ›
            </Text>
          </TouchableOpacity>
        </View>

        {/* SUPPORT */}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Support
          </Text>

          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>
                ?
              </Text>
            </View>

            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>
                Help & Support
              </Text>

              <Text style={styles.actionDescription}>
                Get help with your TempStaff account.
              </Text>
            </View>

            <Text style={styles.chevron}>
              ›
            </Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>
                ℹ
              </Text>
            </View>

            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>
                About TempStaff
              </Text>

              <Text style={styles.actionDescription}>
                App information and version.
              </Text>
            </View>

            <Text style={styles.version}>
              1.0.0
            </Text>
          </TouchableOpacity>
        </View>

        {/* LOGOUT */}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={onLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>
            Logout
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          TempStaff Worker
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function SettingRow({
  title,
  description,
  value,
  onValueChange,
}: {
  title: string
  description: string
  value: boolean
  onValueChange: (value: boolean) => void
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>
          {title}
        </Text>

        <Text style={styles.settingDescription}>
          {description}
        </Text>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: '#d1d5db',
          true: '#99d5c9',
        }}
        thumbColor={
          value
            ? '#0f766e'
            : '#f4f4f5'
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },

  page: {
    padding: 22,
    paddingBottom: 45,
  },

  backButton: {
    marginBottom: 18,
  },

  backText: {
    color: '#0f766e',
    fontSize: 16,
    fontWeight: '700',
  },

  title: {
    color: '#0b1f3a',
    fontSize: 31,
    fontWeight: '800',
    marginBottom: 7,
  },

  subtitle: {
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
  },

  card: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  sectionTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 16,
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  settingContent: {
    flex: 1,
    paddingRight: 15,
  },

  settingTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },

  settingDescription: {
    color: '#6b7280',
    fontSize: 12,
    lineHeight: 18,
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 58,
  },

  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#e8f7f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  actionIconText: {
    color: '#0f766e',
    fontSize: 18,
    fontWeight: '800',
  },

  actionContent: {
    flex: 1,
    paddingRight: 8,
  },

  actionTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },

  actionDescription: {
    color: '#6b7280',
    fontSize: 12,
    lineHeight: 17,
  },

  chevron: {
    color: '#9ca3af',
    fontSize: 28,
    fontWeight: '400',
  },

  version: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },

  divider: {
    height: 1,
    backgroundColor: '#eef0f2',
    marginVertical: 13,
  },

  logoutButton: {
    backgroundColor: '#dc2626',
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },

  logoutText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
  },

  footerText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 18,
  },
})