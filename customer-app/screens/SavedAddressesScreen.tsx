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
import Header from '../components/Header'
import PrimaryButton from '../components/PrimaryButton'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'SavedAddresses'
>

type SavedAddress = {
  id: string
  label: string | null
  address_line: string
  latitude: number | null
  longitude: number | null
}

export default function SavedAddressesScreen({
  navigation,
}: Props) {
  const [addresses, setAddresses] =
    useState<SavedAddress[]>([])

  const [loading, setLoading] =
    useState(true)

  const [deletingId, setDeletingId] =
    useState<string | null>(null)

  const loadAddresses = useCallback(
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
          .from('addresses')
          .select(
            'id, label, address_line, latitude, longitude'
          )
          .eq('user_id', user.id)
          .order('id', {
            ascending: false,
          })

        if (error) {
          throw error
        }

        setAddresses(data || [])
      } catch (error: any) {
        console.error(
          '[TempStaff] Failed to load saved addresses:',
          error
        )

        Alert.alert(
          'Unable to load addresses',
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
    loadAddresses()
  }, [loadAddresses])

  const deleteAddress = (
    address: SavedAddress
  ) => {
    Alert.alert(
      'Delete address',
      'Are you sure you want to remove this saved address?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            confirmDelete(address.id),
        },
      ]
    )
  }

  const confirmDelete = async (
    addressId: string
  ) => {
    try {
      setDeletingId(addressId)

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
        error,
      } = await supabase
        .from('addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', user.id)

      if (error) {
        throw error
      }

      setAddresses(current =>
        current.filter(
          address =>
            address.id !== addressId
        )
      )
    } catch (error: any) {
      console.error(
        '[TempStaff] Failed to delete address:',
        error
      )

      Alert.alert(
        'Unable to delete address',
        error?.message ||
          'Please try again.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  const selectAddress = (
    address: SavedAddress
  ) => {
    Alert.alert(
      'Address selected',
      address.address_line,
      [
        {
          text: 'OK',
        },
      ]
    )
  }

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <Header
          onBack={() => navigation.goBack()}
        />

        <View style={styles.header}>
          <Text style={styles.title}>
            Saved Addresses
          </Text>

          <Text style={styles.subtitle}>
            Manage the locations you use for
            TempStaff bookings.
          </Text>
        </View>

        <PrimaryButton
          title="+ Add New Address"
          onPress={() =>
            navigation.navigate('Location')
          }
          style={styles.addButton}
        />

        <Text style={styles.sectionTitle}>
          Your addresses
        </Text>

        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator
              size="large"
              color={COLORS.teal}
            />

            <Text style={styles.stateText}>
              Loading saved addresses...
            </Text>
          </View>
        ) : addresses.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Text
                style={styles.emptyIconText}
              >
                ⌖
              </Text>
            </View>

            <Text style={styles.emptyTitle}>
              No saved addresses
            </Text>

            <Text style={styles.emptyText}>
              Add your first service address so
              you can use it for future bookings.
            </Text>

            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() =>
                navigation.navigate('Location')
              }
              activeOpacity={0.85}
            >
              <Text
                style={styles.emptyButtonText}
              >
                Add Address
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          addresses.map(address => (
            <View
              key={address.id}
              style={styles.addressCard}
            >
              <TouchableOpacity
                style={styles.addressMain}
                onPress={() =>
                  selectAddress(address)
                }
                activeOpacity={0.8}
              >
                <View style={styles.addressIcon}>
                  <Text
                    style={styles.addressIconText}
                  >
                    ⌖
                  </Text>
                </View>

                <View
                  style={styles.addressContent}
                >
                  <View
                    style={styles.addressTop}
                  >
                    <Text
                      style={styles.addressLabel}
                    >
                      {address.label ||
                        'Service Address'}
                    </Text>

                    {address.latitude !==
                      null &&
                    address.longitude !==
                      null ? (
                      <View
                        style={
                          styles.locationBadge
                        }
                      >
                        <Text
                          style={
                            styles.locationBadgeText
                          }
                        >
                          Location ready
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text
                    style={styles.addressText}
                  >
                    {address.address_line}
                  </Text>
                </View>
              </TouchableOpacity>

              <View
                style={styles.cardActions}
              >
                <TouchableOpacity
                  style={styles.useButton}
                  onPress={() =>
                    selectAddress(address)
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={styles.useButtonText}
                  >
                    Use
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() =>
                    deleteAddress(address)
                  }
                  disabled={
                    deletingId === address.id
                  }
                  activeOpacity={0.8}
                >
                  {deletingId ===
                  address.id ? (
                    <ActivityIndicator
                      size="small"
                      color="#C62828"
                    />
                  ) : (
                    <Text
                      style={
                        styles.deleteButtonText
                      }
                    >
                      Delete
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={styles.infoBox}>
          <View style={styles.infoIcon}>
            <Text
              style={styles.infoIconText}
            >
              i
            </Text>
          </View>

          <Text style={styles.infoText}>
            Saved addresses make repeat bookings
            faster. You can add another service
            location whenever you need one.
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

  page: {
    padding: 22,
    paddingBottom: 45,
  },

  header: {
    marginBottom: 22,
  },

  title: {
    color: COLORS.navy,
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '900',
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },

  addButton: {
    marginBottom: 28,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },

  stateBox: {
    minHeight: 180,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
  },

  stateText: {
    color: COLORS.gray,
    fontSize: 13,
    marginTop: 12,
  },

  emptyBox: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#E8F6F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },

  emptyIconText: {
    color: COLORS.teal,
    fontSize: 30,
    fontWeight: '900',
  },

  emptyTitle: {
    color: COLORS.navy,
    fontSize: 18,
    fontWeight: '900',
  },

  emptyText: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 7,
    marginBottom: 17,
  },

  emptyButton: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 22,
  },

  emptyButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },

  addressCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 19,
    padding: 15,
    marginBottom: 12,
  },

  addressMain: {
    flexDirection: 'row',
  },

  addressIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: '#E8F6F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  addressIconText: {
    color: COLORS.teal,
    fontSize: 21,
    fontWeight: '900',
  },

  addressContent: {
    flex: 1,
  },

  addressTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  addressLabel: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '900',
    flex: 1,
  },

  locationBadge: {
    backgroundColor: '#ECFDF3',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginLeft: 7,
  },

  locationBadgeText: {
    color: '#15803D',
    fontSize: 8,
    fontWeight: '800',
  },

  addressText: {
    color: COLORS.gray,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },

  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF0F2',
  },

  useButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 17,
    backgroundColor: COLORS.teal,
    marginLeft: 8,
  },

  useButtonText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },

  deleteButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E4B8B8',
    marginLeft: 8,
    minWidth: 65,
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteButtonText: {
    color: '#C62828',
    fontSize: 11,
    fontWeight: '800',
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F6F6',
    borderRadius: 15,
    padding: 13,
    marginTop: 15,
  },

  infoIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  infoIconText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '900',
  },

  infoText: {
    flex: 1,
    color: COLORS.navy,
    fontSize: 11,
    lineHeight: 16,
  },
})