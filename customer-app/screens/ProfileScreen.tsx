import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useCallback, useEffect, useState } from 'react'

import { COLORS, LOGO } from '../constants/theme'
import { RootStackParamList } from '../types'
import {
  CustomerProfile,
  deleteCustomerAccount,
  getCustomerProfile,
  signOutCustomer,
} from '../services/customer'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Profile'
>

function MenuItem({
  icon,
  title,
  subtitle,
  onPress,
  danger = false,
}: {
  icon: string
  title: string
  subtitle: string
  onPress: () => void
  danger?: boolean
}) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      activeOpacity={0.82}
      onPress={onPress}
    >
      <View
        style={[
          styles.menuIcon,
          danger && styles.menuIconDanger,
        ]}
      >
        <Text style={styles.menuIconText}>
          {icon}
        </Text>
      </View>

      <View style={styles.menuContent}>
        <Text
          style={[
            styles.menuTitle,
            danger && styles.dangerText,
          ]}
        >
          {title}
        </Text>

        <Text style={styles.menuSubtitle}>
          {subtitle}
        </Text>
      </View>

      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  )
}

export default function ProfileScreen({
  navigation,
}: Props) {
  const [profile, setProfile] =
    useState<CustomerProfile | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [signingOut, setSigningOut] =
    useState(false)

  const [deleting, setDeleting] =
    useState(false)

  const loadProfile = useCallback(
    async () => {
      try {
        setLoading(true)

        const data =
          await getCustomerProfile()

        setProfile(data)
      } catch (error: any) {
        console.error(
          '[TempStaff] Profile load failed:',
          error
        )

        Alert.alert(
          'Unable to load profile',
          error?.message ||
            'Please try again.'
        )
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleLogout = () => {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out of TempStaff?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            try {
              setSigningOut(true)

              await signOutCustomer()

              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              })
            } catch (error: any) {
              console.error(
                '[TempStaff] Logout failed:',
                error
              )

              Alert.alert(
                'Unable to log out',
                error?.message ||
                  'Please try again.'
              )
            } finally {
              setSigningOut(false)
            }
          },
        },
      ]
    )
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This will deactivate your TempStaff account and sign you out. This action should only be used if you no longer want to use the account.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true)

              await deleteCustomerAccount()

              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              })
            } catch (error: any) {
              console.error(
                '[TempStaff] Delete account failed:',
                error
              )

              Alert.alert(
                'Unable to delete account',
                error?.message ||
                  'Please try again.'
              )
            } finally {
              setDeleting(false)
            }
          },
        },
      ]
    )
  }

  const displayName =
    profile?.full_name?.trim() ||
    'TempStaff Customer'

  const company =
    profile?.company_name?.trim() ||
    'Company / Business'

  const initial =
    displayName.charAt(0).toUpperCase() || 'T'

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Profile
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator
              size="large"
              color={COLORS.teal}
            />

            <Text style={styles.loadingText}>
              Loading profile...
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                {profile?.avatar_url ? (
                  <Image
                    source={{
                      uri: profile.avatar_url,
                    }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {initial}
                  </Text>
                )}
              </View>

              <View style={styles.profileInfo}>
                <Text
                  style={styles.name}
                  numberOfLines={1}
                >
                  {displayName}
                </Text>

                <Text
                  style={styles.company}
                  numberOfLines={1}
                >
                  {company}
                </Text>

                {!!profile?.phone && (
                  <Text style={styles.contact}>
                    {profile.phone}
                  </Text>
                )}

                {!!profile?.email && (
                  <Text
                    style={styles.contact}
                    numberOfLines={1}
                  >
                    {profile.email}
                  </Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={styles.editButton}
              activeOpacity={0.85}
              onPress={() => {
                Alert.alert(
                  'Edit Profile',
                  'The Edit Profile screen will be connected next.'
                )
              }}
            >
              <Text style={styles.editButtonText}>
                Edit Profile
              </Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>
              Account
            </Text>

            <View style={styles.menuCard}>
              <MenuItem
                icon="📍"
                title="Saved Addresses"
                subtitle="Manage your booking locations"
                onPress={() => {
                  Alert.alert(
                    'Saved Addresses',
                    'The Saved Addresses screen will be connected next.'
                  )
                }}
              />

              <View style={styles.menuDivider} />

              <MenuItem
                icon="📋"
                title="My Bookings"
                subtitle="View your current and previous bookings"
                onPress={() =>
                  navigation.navigate(
                    'MyBookings'
                  )
                }
              />
            </View>

            <Text style={styles.sectionTitle}>
              Support
            </Text>

            <View style={styles.menuCard}>
              <MenuItem
                icon="?"
                title="Help & Support"
                subtitle="Get help with TempStaff"
                onPress={() => {
                  Alert.alert(
                    'Help & Support',
                    'Support screen will be connected next.'
                  )
                }}
              />

              <View style={styles.menuDivider} />

              <MenuItem
                icon="i"
                title="About Us"
                subtitle="Learn more about TempStaff"
                onPress={() => {
                  Alert.alert(
                    'About Us',
                    'About Us screen will be connected next.'
                  )
                }}
              />
            </View>

            <Text style={styles.sectionTitle}>
              Legal
            </Text>

            <View style={styles.menuCard}>
              <MenuItem
                icon="T"
                title="Terms of Service"
                subtitle="Review our terms"
                onPress={() => {
                  Alert.alert(
                    'Terms of Service',
                    'Terms screen will be connected next.'
                  )
                }}
              />

              <View style={styles.menuDivider} />

              <MenuItem
                icon="P"
                title="Privacy Policy"
                subtitle="Review our privacy policy"
                onPress={() => {
                  Alert.alert(
                    'Privacy Policy',
                    'Privacy screen will be connected next.'
                  )
                }}
              />
            </View>

            <View style={styles.accountActions}>
              <TouchableOpacity
                style={styles.logoutButton}
                activeOpacity={0.85}
                disabled={
                  signingOut || deleting
                }
                onPress={handleLogout}
              >
                {signingOut ? (
                  <ActivityIndicator
                    color={COLORS.navy}
                  />
                ) : (
                  <Text
                    style={styles.logoutText}
                  >
                    Log Out
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                activeOpacity={0.8}
                disabled={
                  signingOut || deleting
                }
                onPress={
                  handleDeleteAccount
                }
              >
                {deleting ? (
                  <ActivityIndicator
                    color="#B42318"
                  />
                ) : (
                  <Text
                    style={styles.deleteText}
                  >
                    Delete Account
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={styles.brand}>
          <Image
            source={LOGO}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.version}>
            TempStaff
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 45,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    color: COLORS.navy,
    fontSize: 30,
    lineHeight: 31,
    marginTop: -3,
  },

  headerTitle: {
    color: COLORS.navy,
    fontSize: 22,
    fontWeight: '900',
  },

  headerSpacer: {
    width: 42,
  },

  loading: {
    alignItems: 'center',
    paddingVertical: 100,
  },

  loadingText: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 12,
  },

  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 15,
  },

  avatarImage: {
    width: '100%',
    height: '100%',
  },

  avatarText: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '900',
  },

  profileInfo: {
    flex: 1,
  },

  name: {
    color: COLORS.navy,
    fontSize: 19,
    fontWeight: '900',
  },

  company: {
    color: COLORS.teal,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },

  contact: {
    color: COLORS.gray,
    fontSize: 10.5,
    marginTop: 3,
  },

  editButton: {
    height: 45,
    borderRadius: 13,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 11,
  },

  editButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '900',
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 24,
    marginBottom: 9,
    marginLeft: 2,
  },

  menuCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },

  menuItem: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 11,
  },

  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E8F6F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  menuIconDanger: {
    backgroundColor: '#FDECEC',
  },

  menuIconText: {
    color: COLORS.navy,
    fontSize: 17,
    fontWeight: '900',
  },

  menuContent: {
    flex: 1,
  },

  menuTitle: {
    color: COLORS.navy,
    fontSize: 12.5,
    fontWeight: '900',
  },

  menuSubtitle: {
    color: COLORS.gray,
    fontSize: 9.5,
    lineHeight: 14,
    marginTop: 3,
  },

  dangerText: {
    color: '#B42318',
  },

  chevron: {
    color: COLORS.gray,
    fontSize: 25,
    marginLeft: 8,
  },

  menuDivider: {
    height: 1,
    backgroundColor: '#EEF1F3',
    marginLeft: 64,
  },

  accountActions: {
    marginTop: 25,
  },

  logoutButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoutText: {
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: '900',
  },

  deleteButton: {
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },

  deleteText: {
    color: '#B42318',
    fontSize: 11,
    fontWeight: '800',
  },

  brand: {
    alignItems: 'center',
    marginTop: 28,
  },

  logo: {
    width: 45,
    height: 45,
    opacity: 0.8,
  },

  version: {
    color: COLORS.gray,
    fontSize: 9,
    marginTop: 4,
  },
})