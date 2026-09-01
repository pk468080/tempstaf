import React from 'react'
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'

type Props = {
  navigation: NativeStackNavigationProp<
    RootStackParamList,
    keyof RootStackParamList
  >
  active: 'Home' | 'Bookings' | 'Profile'
}

export default function CustomerBottomNav({
  navigation,
  active,
}: Props) {
  const goHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    })
  }

  const goBookings = () => {
    navigation.navigate('MyBookings')
  }

  const goProfile = () => {
    navigation.navigate('Profile')
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        <TouchableOpacity
          style={styles.item}
          activeOpacity={0.8}
          onPress={goHome}
        >
          <View
            style={[
              styles.iconBox,
              active === 'Home' &&
                styles.iconBoxActive,
            ]}
          >
            <Text
              style={[
                styles.icon,
                active === 'Home' &&
                  styles.iconActive,
              ]}
            >
              ⌂
            </Text>
          </View>

          <Text
            style={[
              styles.label,
              active === 'Home' &&
                styles.labelActive,
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          activeOpacity={0.8}
          onPress={goBookings}
        >
          <View
            style={[
              styles.iconBox,
              active === 'Bookings' &&
                styles.iconBoxActive,
            ]}
          >
            <Text
              style={[
                styles.icon,
                active === 'Bookings' &&
                  styles.iconActive,
              ]}
            >
              ▣
            </Text>
          </View>

          <Text
            style={[
              styles.label,
              active === 'Bookings' &&
                styles.labelActive,
            ]}
          >
            Bookings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          activeOpacity={0.8}
          onPress={goProfile}
        >
          <View
            style={[
              styles.iconBox,
              active === 'Profile' &&
                styles.iconBoxActive,
            ]}
          >
            <Text
              style={[
                styles.icon,
                active === 'Profile' &&
                  styles.iconActive,
              ]}
            >
              ◉
            </Text>
          </View>

          <Text
            style={[
              styles.label,
              active === 'Profile' &&
                styles.labelActive,
            ]}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.light,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },

  bar: {
    height: 74,
    backgroundColor: COLORS.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },

  item: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },

  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  iconBoxActive: {
    backgroundColor: COLORS.tealSoft,
  },

  icon: {
    color: COLORS.gray,
    fontSize: 18,
  },

  iconActive: {
    color: COLORS.teal,
  },

  label: {
    color: COLORS.gray,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  labelActive: {
    color: COLORS.teal,
  },
})