import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface WeekdaySelectorProps {
  selectedWeekdays: string[]
  onToggleWeekday: (weekday: string) => void
  disabled?: boolean
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function WeekdaySelector({
  selectedWeekdays,
  onToggleWeekday,
  disabled = false,
}: WeekdaySelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Recurring days</Text>

      <View style={styles.weekdayGrid}>
        {WEEKDAYS.map((weekday, index) => {
          const isSelected = selectedWeekdays.includes(weekday)

          return (
            <TouchableOpacity
              key={weekday}
              style={[
                styles.weekdayButton,
                isSelected && styles.weekdayButtonSelected,
                disabled && styles.weekdayButtonDisabled,
              ]}
              onPress={() => onToggleWeekday(weekday)}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.weekdayText,
                  isSelected && styles.weekdayTextSelected,
                  disabled && styles.weekdayTextDisabled,
                ]}
              >
                {WEEKDAY_SHORT[index]}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {selectedWeekdays.length > 0 && (
        <Text style={styles.selectedCount}>
          {selectedWeekdays.length} {selectedWeekdays.length === 1 ? 'day' : 'days'} selected
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  weekdayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  weekdayButton: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },

  weekdayButtonSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },

  weekdayButtonDisabled: {
    opacity: 0.5,
  },

  weekdayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  weekdayTextSelected: {
    color: '#FFFFFF',
  },

  weekdayTextDisabled: {
    color: '#9CA3AF',
  },

  selectedCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 4,
  },
})
