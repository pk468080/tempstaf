import { createContext, useContext, useMemo, useState, ReactNode } from 'react'
import { BookingMode, Worker } from '../types'
import { priceFor } from '../data/catalog'

type BookingState = {
  selectedService: string
  selectedDuration: string
  bookingMode: BookingMode
  scheduledDate: string
  address: string
  coordinates: string
  selectedWorker: Worker | null
  bookingId: string
  paymentDone: boolean
  startOtp: string
  endOtp: string
  shiftStarted: boolean
  shiftEnded: boolean
  setSelectedService: (value: string) => void
  setSelectedDuration: (value: string) => void
  setBookingMode: (value: BookingMode) => void
  setScheduledDate: (value: string) => void
  setAddress: (value: string) => void
  setCoordinates: (value: string) => void
  setSelectedWorker: (value: Worker | null) => void
  setBookingId: (value: string) => void
  setPaymentDone: (value: boolean) => void
  setStartOtp: (value: string) => void
  setEndOtp: (value: string) => void
  setShiftStarted: (value: boolean) => void
  setShiftEnded: (value: boolean) => void
  total: number
  resetBooking: () => void
}

const BookingContext = createContext<BookingState | null>(null)

export function BookingProvider({ children }: { children: ReactNode }) {
  const [selectedService, setSelectedService] = useState('')
  const [selectedDuration, setSelectedDuration] = useState('')
  const [bookingMode, setBookingMode] = useState<BookingMode>('Instant')
  const [scheduledDate, setScheduledDate] = useState('')
  const [address, setAddress] = useState('')
  const [coordinates, setCoordinates] = useState('')
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null)
  const [bookingId, setBookingId] = useState('')
  const [paymentDone, setPaymentDone] = useState(false)
  const [startOtp, setStartOtp] = useState('')
  const [endOtp, setEndOtp] = useState('')
  const [shiftStarted, setShiftStarted] = useState(false)
  const [shiftEnded, setShiftEnded] = useState(false)

  const total = useMemo(
    () => priceFor(selectedService, selectedDuration),
    [selectedService, selectedDuration]
  )

  const resetBooking = () => {
    setSelectedService('')
    setSelectedDuration('')
    setBookingMode('Instant')
    setScheduledDate('')
    setAddress('')
    setCoordinates('')
    setSelectedWorker(null)
    setBookingId('')
    setPaymentDone(false)
    setStartOtp('')
    setEndOtp('')
    setShiftStarted(false)
    setShiftEnded(false)
  }

  return (
    <BookingContext.Provider value={{
      selectedService, selectedDuration, bookingMode, scheduledDate,
      address, coordinates, selectedWorker, bookingId, paymentDone,
      startOtp, endOtp, shiftStarted, shiftEnded,
      setSelectedService, setSelectedDuration, setBookingMode,
      setScheduledDate, setAddress, setCoordinates, setSelectedWorker,
      setBookingId, setPaymentDone, setStartOtp, setEndOtp,
      setShiftStarted, setShiftEnded, total, resetBooking,
    }}>
      {children}
    </BookingContext.Provider>
  )
}

export function useBooking() {
  const value = useContext(BookingContext)
  if (!value) throw new Error('useBooking must be used inside BookingProvider')
  return value
}
