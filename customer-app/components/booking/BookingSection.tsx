import { StyleSheet, Text, View } from 'react-native'

interface BookingSectionProps {
  title: string
  children: React.ReactNode
}

export default function BookingSection({ title, children }: BookingSectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.content}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },

  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },

  content: {
    gap: 12,
  },
})
