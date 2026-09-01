import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native'
import { COLORS } from '../constants/theme'

export default function PrimaryButton({
  title,
  onPress,
  disabled = false,
  style,
}: {
  title: string
  onPress: () => void
  disabled?: boolean
  style?: ViewStyle
}) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled, style]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 58,
    borderRadius: 18,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  disabled: { opacity: 0.45 },
  text: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
})
