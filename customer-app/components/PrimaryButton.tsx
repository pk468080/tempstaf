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
  button: { width: '100%', height: 56, borderRadius: 28, backgroundColor: COLORS.orange, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  disabled: { opacity: 0.45 },
  text: { color: COLORS.white, fontSize: 17, fontWeight: '800' },
})
