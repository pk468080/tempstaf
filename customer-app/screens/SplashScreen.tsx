import { useEffect } from 'react'
import {
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import { COLORS, LOGO } from '../constants/theme'
import { RootStackParamList } from '../types'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Splash'
>

export default function SplashScreen({
  navigation,
}: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Login')
    }, 1800)

    return () => clearTimeout(timer)
  }, [navigation])

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={LOGO}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.brand}>
          Temp<Text style={styles.teal}>Staff</Text>
        </Text>

        <Text style={styles.tagline}>
          STAFF WHEN YOU NEED THEM.
        </Text>

        <View style={styles.bottom}>
          <Text style={styles.loading}>
            Getting things ready...
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.navy,
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  logo: {
    width: 130,
    height: 130,
    marginBottom: 12,
  },

  brand: {
    fontSize: 40,
    fontWeight: '800',
    color: 'white',
  },

  teal: {
    color: COLORS.teal,
  },

  tagline: {
    marginTop: 7,
    color: 'white',
    opacity: 0.75,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },

  bottom: {
    position: 'absolute',
    bottom: 45,
    alignItems: 'center',
  },

  loading: {
    color: 'white',
    opacity: 0.6,
    fontSize: 12,
  },
})