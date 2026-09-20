import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { ScreenContainer } from '../../components/layout/ScreenContainer'
import { getLatestCustomerAddress } from '../../services/addresses/customerAddress.service'
import { getCurrentCustomerProfile, signOut, type CustomerProfile } from '../../services/auth/auth.service'

type MyProfileScreenProps = {
  onSignOut: () => void
}

export default function MyProfileScreen({ onSignOut }: MyProfileScreenProps) {
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  const loadProfile = useCallback(async () => {
    try {
      const [nextProfile, nextAddress] = await Promise.all([
        getCurrentCustomerProfile(),
        getLatestCustomerAddress(),
      ])
      setProfile(nextProfile)
      setAddress(nextAddress?.addressLine ?? null)
      setError(null)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to load your profile.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  async function handleSignOut() {
    if (signingOut) return

    setSigningOut(true)
    setError(null)

    try {
      await signOut()
      onSignOut()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to log out.')
      setSigningOut(false)
    }
  }

  if (loading) {
    return <ScreenContainer><View style={styles.center}><ActivityIndicator size="large" /></View></ScreenContainer>
  }

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <Text style={styles.title}>My profile</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.card}>
          <ProfileRow label="Name" value={profile?.full_name ?? 'Not set'} />
          <ProfileRow label="Company" value={profile?.company_name ?? 'Not set'} />
          <ProfileRow label="Mobile" value={profile?.phone ?? 'Not set'} />
          <ProfileRow label="Saved address" value={address ?? 'No saved address'} />
        </View>
        <Pressable style={styles.signOut} onPress={() => void handleSignOut()} disabled={signingOut}>
          <Text style={styles.signOutText}>{signingOut ? 'Logging out...' : 'Log out'}</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  )
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 24 },
  card: { padding: 16, borderRadius: 16, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  label: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  value: { marginTop: 4, fontSize: 15, fontWeight: '600', color: '#111827' },
  signOut: { marginTop: 24, padding: 14, borderRadius: 12, backgroundColor: '#111827', alignItems: 'center' },
  signOutText: { color: '#FFFFFF', fontWeight: '700' },
  error: { color: '#B91C1C', marginBottom: 12 },
})