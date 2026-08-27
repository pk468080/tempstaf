import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useCallback, useEffect, useState } from 'react'

import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import { supabase } from '../lib/supabase'
import CustomerBottomNav from '../components/CustomerBottomNav'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Profile'
>

type CustomerProfile = {
  full_name: string | null
  company_name: string | null
  phone: string | null
  email: string | null
}

export default function ProfileScreen({
  navigation,
}: Props) {
  const [profile, setProfile] =
    useState<CustomerProfile | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [loggingOut, setLoggingOut] =
    useState(false)

  const loadProfile = useCallback(
    async () => {
      try {
        setLoading(true)

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          throw userError
        }

        if (!user) {
          throw new Error(
            'Customer is not authenticated.'
          )
        }

        const {
          data,
          error,
        } = await supabase
          .from('profiles')
          .select(
            'full_name, company_name, phone'
          )
          .eq('id', user.id)
          .maybeSingle()

        if (error) {
          throw error
        }

        setProfile({
          full_name:
            data?.full_name ??
            user.user_metadata?.full_name ??
            null,

          company_name:
            data?.company_name ??
            user.user_metadata?.company_name ??
            null,

          phone:
            data?.phone ??
            user.phone ??
            null,

          email:
            user.email ??
            null,
        })
      } catch (error: any) {
        console.error(
          '[TempStaff Customer] Failed to load profile:',
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

  const logout = () => {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: performLogout,
        },
      ]
    )
  }

  const performLogout = async () => {
    try {
      setLoggingOut(true)

      const { error } =
        await supabase.auth.signOut()

      if (error) {
        throw error
      }

      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'Login',
          },
        ],
      })
    } catch (error: any) {
      console.error(
        '[TempStaff Customer] Logout failed:',
        error
      )

      Alert.alert(
        'Logout failed',
        error?.message ||
          'Please try again.'
      )
    } finally {
      setLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
            color={COLORS.teal}
          />

          <Text
            style={styles.loadingText}
          >
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!profile) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View style={styles.loading}>
          <Text
            style={styles.errorTitle}
          >
            Unable to load profile
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadProfile}
          >
            <Text
              style={styles.retryText}
            >
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const initials =
    getInitials(profile.full_name)

  return (
    <SafeAreaView
      style={styles.container}
    >
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={
            styles.content
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          <View style={styles.header}>
            <View>
              <Text
                style={styles.eyebrow}
              >
                ACCOUNT
              </Text>

              <Text
                style={styles.title}
              >
                Profile
              </Text>

              <Text
                style={styles.subtitle}
              >
                Manage your TempStaff account.
              </Text>
            </View>
          </View>

          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text
                style={styles.avatarText}
              >
                {initials}
              </Text>
            </View>

            <View
              style={styles.profileInfo}
            >
              <Text
                style={styles.name}
              >
                {profile.full_name ||
                  'Customer'}
              </Text>

              <Text
                style={styles.company}
              >
                {profile.company_name ||
                  'Business account'}
              </Text>

              {profile.phone ? (
                <Text
                  style={styles.contact}
                >
                  {profile.phone}
                </Text>
              ) : null}

              {profile.email ? (
                <Text
                  style={styles.contact}
                >
                  {profile.email}
                </Text>
              ) : null}
            </View>
          </View>

          <Text
            style={styles.sectionTitle}
          >
            Account
          </Text>

          <ProfileMenu
            title="Edit Profile"
            subtitle="Update your personal and business details"
            icon="✎"
            onPress={() =>
              Alert.alert(
                'Edit Profile',
                'Edit Profile screen will be completed next.'
              )
            }
          />

          <ProfileMenu
            title="Saved Addresses"
            subtitle="Manage your saved booking locations"
            icon="⌖"
            onPress={() =>
              Alert.alert(
                'Saved Addresses',
                'Saved Addresses screen will be completed next.'
              )
            }
          />

          <ProfileMenu
            title="TempStaff Money"
            subtitle="View your TempStaff balance and transactions"
            icon="₹"
            onPress={() =>
              Alert.alert(
                'TempStaff Money',
                'TempStaff Money screen will be completed next.'
              )
            }
          />

          <Text
            style={[
              styles.sectionTitle,
              styles.sectionSpacing,
            ]}
          >
            Support & Information
          </Text>

          <ProfileMenu
            title="Help & Support"
            subtitle="Get help with your account or booking"
            icon="?"
            onPress={() =>
              Alert.alert(
                'Help & Support',
                'Help & Support screen will be completed next.'
              )
            }
          />

          <ProfileMenu
            title="About Us"
            subtitle="Learn more about TempStaff"
            icon="i"
            onPress={() =>
              Alert.alert(
                'About Us',
                'About Us screen will be completed next.'
              )
            }
          />

          <ProfileMenu
            title="Terms of Service"
            subtitle="Read the TempStaff terms"
            icon="§"
            onPress={() =>
              Alert.alert(
                'Terms of Service',
                'Terms of Service screen will be completed next.'
              )
            }
          />

          <ProfileMenu
            title="Privacy Policy"
            subtitle="Read our privacy policy"
            icon="✓"
            onPress={() =>
              Alert.alert(
                'Privacy Policy',
                'Privacy Policy screen will be completed next.'
              )
            }
          />

          <Text
            style={[
              styles.sectionTitle,
              styles.sectionSpacing,
            ]}
          >
            Account Actions
          </Text>

          <TouchableOpacity
            style={styles.deleteButton}
            activeOpacity={0.85}
            onPress={() =>
              Alert.alert(
                'Delete Account',
                'Account deletion will be completed after the remaining account screens are finished.'
              )
            }
          >
            <Text
              style={styles.deleteText}
            >
              Delete Account
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.85}
            onPress={logout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator
                color={COLORS.white}
              />
            ) : (
              <Text
                style={styles.logoutText}
              >
                Log Out
              </Text>
            )}
          </TouchableOpacity>

          <Text
            style={styles.version}
          >
            TempStaff Customer
          </Text>
        </ScrollView>

        <CustomerBottomNav
          navigation={navigation}
          active="Profile"
        />
      </View>
    </SafeAreaView>
  )
}

function ProfileMenu({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string
  subtitle: string
  icon: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={styles.menu}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.menuIcon}>
        <Text
          style={styles.menuIconText}
        >
          {icon}
        </Text>
      </View>

      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>
          {title}
        </Text>

        <Text
          style={styles.menuSubtitle}
        >
          {subtitle}
        </Text>
      </View>

      <Text style={styles.chevron}>
        ›
      </Text>
    </TouchableOpacity>
  )
}

function getInitials(
  name: string | null
) {
  if (!name) {
    return 'TS'
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase()
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase()
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },

  screen: {
    flex: 1,
  },

  content: {
    padding: 22,
    paddingBottom: 30,
  },

  header: {
    marginBottom: 20,
  },

  eyebrow: {
    color: COLORS.teal,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 5,
  },

  title: {
    color: COLORS.navy,
    fontSize: 29,
    fontWeight: '900',
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 13,
    marginTop: 5,
  },

  profileCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 22,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },

  avatarText: {
    color: COLORS.white,
    fontSize: 21,
    fontWeight: '900',
  },

  profileInfo: {
    flex: 1,
  },

  name: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: '900',
  },

  company: {
    color: '#B9CBD8',
    fontSize: 13,
    marginTop: 4,
  },

  contact: {
    color: '#DCE7EE',
    fontSize: 11,
    marginTop: 3,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },

  sectionSpacing: {
    marginTop: 23,
  },

  menu: {
    backgroundColor: COLORS.white,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  menuIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#E8F6F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  menuIconText: {
    color: COLORS.teal,
    fontSize: 19,
    fontWeight: '900',
  },

  menuContent: {
    flex: 1,
  },

  menuTitle: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '800',
  },

  menuSubtitle: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  chevron: {
    color: COLORS.gray,
    fontSize: 27,
    marginLeft: 8,
  },

  deleteButton: {
    height: 49,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E4B8B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  deleteText: {
    color: '#C62828',
    fontSize: 13,
    fontWeight: '800',
  },

  logoutButton: {
    height: 49,
    borderRadius: 15,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoutText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '900',
  },

  version: {
    color: COLORS.gray,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 16,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  loadingText: {
    color: COLORS.gray,
    fontSize: 14,
    marginTop: 12,
  },

  errorTitle: {
    color: COLORS.navy,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 15,
  },

  retryButton: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 22,
  },

  retryText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },
})