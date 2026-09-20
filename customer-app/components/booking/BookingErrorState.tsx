import { StyleSheet, Text, View } from 'react-native'

interface BookingErrorStateProps {
  message: string
}

export default function BookingErrorState({ message }: BookingErrorStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠</Text>
      <Text style={styles.title}>Error</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    gap: 8,
  },

  icon: {
    fontSize: 24,
  },

  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
  },

  message: {
    fontSize: 13,
    color: '#7F1D1D',
    textAlign: 'center',
    lineHeight: 18,
  },
})
