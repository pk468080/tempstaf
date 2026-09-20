import { StyleSheet, Text, TouchableOpacity } from 'react-native'

import { formatDateDisplay } from '../../lib/bookingUtils'

interface SelectedDateChipProps {
  date: Date
  onRemove?: () => void
}

export default function SelectedDateChip({ date, onRemove }: SelectedDateChipProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onRemove}
      disabled={!onRemove}
    >
      <Text style={styles.text}>{formatDateDisplay(date)}</Text>
      {onRemove && <Text style={styles.removeIcon}>✕</Text>}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E0E7FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    gap: 8,
  },

  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },

  removeIcon: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '700',
  },
})
