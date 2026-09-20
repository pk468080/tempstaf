import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'

import { formatTimeDisplay } from '../../lib/bookingUtils'

interface TimeRangePickerProps {
  startTime: Date
  endTime: Date
  onStartTimeChange: (time: Date) => void
  onEndTimeChange: (time: Date) => void
  disabled?: boolean
}

export default function TimeRangePicker({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  disabled = false,
}: TimeRangePickerProps) {
  const [pickerMode, setPickerMode] = useState<'start' | 'end' | null>(null)
  const [pickerTime, setPickerTime] = useState(new Date())

  function handleTimePicked(time: Date) {
    if (pickerMode === 'start') {
      onStartTimeChange(time)

      // Auto-adjust end time if needed
      if (time >= endTime) {
        const nextEnd = new Date(time)
        nextEnd.setHours(nextEnd.getHours() + 1)
        onEndTimeChange(nextEnd)
      }
    } else if (pickerMode === 'end') {
      onEndTimeChange(time)
    }

    setPickerMode(null)
  }

  function handlePickerChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (event.type === 'dismissed' || !selectedDate) {
      if (Platform.OS === 'android') {
        setPickerMode(null)
      }
      return
    }

    if (Platform.OS === 'android') {
      handleTimePicked(selectedDate)
    } else {
      setPickerTime(selectedDate)
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.timeButton, disabled && styles.timeButtonDisabled]}
        onPress={() => {
          if (!disabled) {
            setPickerTime(startTime)
            setPickerMode('start')
          }
        }}
        disabled={disabled}
      >
        <Text style={styles.timeButtonLabel}>Start time</Text>
        <Text style={styles.timeButtonValue}>{formatTimeDisplay(startTime)}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.timeButton, disabled && styles.timeButtonDisabled]}
        onPress={() => {
          if (!disabled) {
            setPickerTime(endTime)
            setPickerMode('end')
          }
        }}
        disabled={disabled}
      >
        <Text style={styles.timeButtonLabel}>End time</Text>
        <Text style={styles.timeButtonValue}>{formatTimeDisplay(endTime)}</Text>
      </TouchableOpacity>

      {pickerMode && Platform.OS !== 'android' && (
        <Modal transparent visible={pickerMode !== null} animationType="slide">
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setPickerMode(null)}>
                <Text style={styles.pickerHeaderButton}>Cancel</Text>
              </TouchableOpacity>

              <Text style={styles.pickerHeaderTitle}>{pickerMode === 'start' ? 'Start time' : 'End time'}</Text>

              <TouchableOpacity onPress={() => handleTimePicked(pickerTime)}>
                <Text style={styles.pickerHeaderButtonDone}>Done</Text>
              </TouchableOpacity>
            </View>

            <DateTimePicker
              value={pickerTime}
              mode="time"
              display="spinner"
              onChange={handlePickerChange}
            />
          </View>
        </Modal>
      )}

      {pickerMode && Platform.OS === 'android' && (
        <DateTimePicker
          value={pickerTime}
          mode="time"
          display="default"
          onChange={handlePickerChange}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
  },

  timeButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  timeButtonDisabled: {
    opacity: 0.5,
  },

  timeButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },

  timeButtonValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },

  pickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  pickerHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },

  pickerHeaderButton: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  pickerHeaderButtonDone: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
})
