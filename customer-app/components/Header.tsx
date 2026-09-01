import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { COLORS, LOGO } from '../constants/theme'

export default function Header({ onBack }: { onBack?: () => void }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.button}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
      ) : <View style={styles.button} />}
      <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      <View style={styles.button} />
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  button: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  back: { color: COLORS.navy, fontSize: 30, lineHeight: 32 },
  logo: { width: 52, height: 52 },
})
