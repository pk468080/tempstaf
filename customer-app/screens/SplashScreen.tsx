import { useEffect, useRef } from 'react'
import {
  Animated,
  Easing,
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
  const logoOpacity = useRef(
    new Animated.Value(0)
  ).current

  const logoScale = useRef(
    new Animated.Value(0.88)
  ).current

  const brandOpacity = useRef(
    new Animated.Value(0)
  ).current

  const taglineOpacity = useRef(
    new Animated.Value(0)
  ).current

  const loadingOpacity = useRef(
    new Animated.Value(0)
  ).current

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),

        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7,
          tension: 55,
          useNativeDriver: true,
        }),
      ]),

      Animated.timing(brandOpacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),

      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),

      Animated.timing(loadingOpacity, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ])

    animation.start()

    const timer = setTimeout(() => {
      navigation.replace('Login')
    }, 2200)

    return () => {
      animation.stop()
      clearTimeout(timer)
    }
  }, [
    navigation,
    logoOpacity,
    logoScale,
    brandOpacity,
    taglineOpacity,
    loadingOpacity,
  ])

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [
                {
                  scale: logoScale,
                },
              ],
            },
          ]}
        >
          <Image
            source={LOGO}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="TempStaff logo"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.brandContainer,
            {
              opacity: brandOpacity,
            },
          ]}
        >
          <Text style={styles.brand}>
            Temp
            <Text style={styles.teal}>
              Staff
            </Text>
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.taglineContainer,
            {
              opacity: taglineOpacity,
            },
          ]}
        >
          <Text style={styles.tagline}>
            STAFF WHEN YOU NEED THEM.
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.bottom,
            {
              opacity: loadingOpacity,
            },
          ]}
        >
          <View style={styles.loadingRow}>
            <View style={styles.loadingDot} />

            <Text style={styles.loading}>
              Getting things ready...
            </Text>
          </View>
        </Animated.View>
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

  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  logo: {
    width: 138,
    height: 138,
    marginBottom: 14,
  },

  brandContainer: {
    alignItems: 'center',
  },

  brand: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: COLORS.white,
  },

  teal: {
    color: COLORS.teal,
  },

  taglineContainer: {
    marginTop: 8,
    alignItems: 'center',
  },

  tagline: {
    color: COLORS.white,
    opacity: 0.78,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
  },

  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 44,
    alignItems: 'center',
  },

  loadingRow: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingDot: {
    width: 6,
    height: 6,
    marginRight: 8,
    borderRadius: 3,
    backgroundColor: COLORS.teal,
  },

  loading: {
    color: COLORS.white,
    opacity: 0.62,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
})