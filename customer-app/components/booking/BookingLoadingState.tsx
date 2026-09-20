import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

export default function BookingLoadingState() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4F46E5" />
      <Text style={styles.text}>Checking availability...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    gap: 12,
  },

  text: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
})
