import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react'
import { BookingMode, Worker } from '../types'
import { supabase } from '../lib/supabase'

type CatalogService = {
  id: string
  name: string
  description: string | null
  is_active: boolean
}

type CatalogPackage = {
  id: string
  service_id: string
  name: string
  description: string | null
  billing_type: string
  duration_value: number | null
  duration_unit: string | null
  min_quantity: number
  max_quantity: number | null
  is_active: boolean
  sort_order: number
  price: number
}

type BookingState = {
  selectedService: string
  selectedServiceId: string
  selectedDuration: string
  selectedPackageId: string
  selectedPackage: CatalogPackage | null

  services: CatalogService[]
  packages: CatalogPackage[]

  catalogueLoading: boolean
  catalogueError: string

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

  refreshCatalogue: () => Promise<void>

  total: number
  resetBooking: () => void
}

const BookingContext = createContext<BookingState | null>(null)

export function BookingProvider({
  children,
}: {
  children: ReactNode
}) {
  const [selectedService, setSelectedServiceState] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState('')

  const [selectedDuration, setSelectedDurationState] = useState('')
  const [selectedPackageId, setSelectedPackageId] = useState('')

  const [services, setServices] = useState<CatalogService[]>([])
  const [packages, setPackages] = useState<CatalogPackage[]>([])

  const [catalogueLoading, setCatalogueLoading] = useState(true)
  const [catalogueError, setCatalogueError] = useState('')

  const [bookingMode, setBookingMode] =
    useState<BookingMode>('Scheduled')

  const [scheduledDate, setScheduledDate] = useState('')
  const [address, setAddress] = useState('')
  const [coordinates, setCoordinates] = useState('')

  const [selectedWorker, setSelectedWorker] =
    useState<Worker | null>(null)

  const [bookingId, setBookingId] = useState('')
  const [paymentDone, setPaymentDone] = useState(false)

  const [startOtp, setStartOtp] = useState('')
  const [endOtp, setEndOtp] = useState('')

  const [shiftStarted, setShiftStarted] = useState(false)
  const [shiftEnded, setShiftEnded] = useState(false)

  /**
   * Load the complete active catalogue from Supabase.
   *
   * Services and packages are controlled from the database.
   * The customer app does not contain business pricing.
   */
  const refreshCatalogue = async () => {
    setCatalogueLoading(true)
    setCatalogueError('')

    try {
      const { data: serviceData, error: serviceError } =
        await supabase
          .from('services')
          .select('id, name, description, is_active')
          .eq('is_active', true)
          .order('name')

      if (serviceError) {
        throw serviceError
      }

      const activeServices =
        (serviceData ?? []) as CatalogService[]

      setServices(activeServices)

      const { data: packageData, error: packageError } =
        await supabase
          .from('service_variants')
          .select(`
            id,
            service_id,
            name,
            description,
            billing_type,
            duration_value,
            duration_unit,
            min_quantity,
            max_quantity,
            is_active,
            sort_order,
            service_variant_prices (
              id,
              price,
              is_active,
              effective_from,
              effective_to
            )
          `)
          .eq('is_active', true)
          .order('sort_order')

      if (packageError) {
        throw packageError
      }

      const now = new Date()

      const formattedPackages: CatalogPackage[] = []

      for (const item of packageData ?? []) {
        const prices = Array.isArray(item.service_variant_prices)
          ? item.service_variant_prices
          : []

        const activePrice = prices
          .filter(price => {
            if (!price.is_active) return false

            const effectiveFrom = new Date(
              price.effective_from
            )

            const effectiveTo = price.effective_to
              ? new Date(price.effective_to)
              : null

            return (
              effectiveFrom <= now &&
              (!effectiveTo || effectiveTo > now)
            )
          })
          .sort(
            (a, b) =>
              new Date(b.effective_from).getTime() -
              new Date(a.effective_from).getTime()
          )[0]

        if (!activePrice) continue

        formattedPackages.push({
          id: item.id,
          service_id: item.service_id,
          name: item.name,
          description: item.description,
          billing_type: item.billing_type,
          duration_value: item.duration_value,
          duration_unit: item.duration_unit,
          min_quantity: item.min_quantity,
          max_quantity: item.max_quantity,
          is_active: item.is_active,
          sort_order: item.sort_order,
          price: Number(activePrice.price),
        })
      }

      setPackages(formattedPackages)
    } catch (error) {
      console.error('Failed to load TempStaff catalogue:', error)

      setCatalogueError(
        'Unable to load services right now. Please try again.'
      )
    } finally {
      setCatalogueLoading(false)
    }
  }

  useEffect(() => {
    refreshCatalogue()
  }, [])

  /**
   * Select a service by name.
   *
   * The corresponding database ID is also stored so future
   * booking requests can use the real service record.
   */
  const setSelectedService = (value: string) => {
    setSelectedServiceState(value)

    const service = services.find(
      item => item.name === value
    )

    setSelectedServiceId(service?.id ?? '')

    // Clear the previous package when staff type changes.
    setSelectedDurationState('')
    setSelectedPackageId('')
  }

  /**
   * Select a package/duration.
   *
   * The price comes from Supabase.
   */
  const setSelectedDuration = (value: string) => {
    setSelectedDurationState(value)

    const servicePackage = packages.find(
      item =>
        item.service_id === selectedServiceId &&
        item.name === value
    )

    setSelectedPackageId(servicePackage?.id ?? '')
  }

  /**
   * Current selected package.
   *
   * Price is always read from the live Supabase catalogue.
   */
  const selectedPackage = useMemo(() => {
    return (
      packages.find(
        item => item.id === selectedPackageId
      ) ?? null
    )
  }, [packages, selectedPackageId])

  const total = selectedPackage?.price ?? 0

  const resetBooking = () => {
    setSelectedServiceState('')
    setSelectedServiceId('')

    setSelectedDurationState('')
    setSelectedPackageId('')

    setBookingMode('Scheduled')
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
    <BookingContext.Provider
      value={{
        selectedService,
        selectedServiceId,

        selectedDuration,
        selectedPackageId,
        selectedPackage,

        services,
        packages,

        catalogueLoading,
        catalogueError,

        bookingMode,
        scheduledDate,
        address,
        coordinates,

        selectedWorker,
        bookingId,
        paymentDone,

        startOtp,
        endOtp,

        shiftStarted,
        shiftEnded,

        setSelectedService,
        setSelectedDuration,

        setBookingMode,
        setScheduledDate,
        setAddress,
        setCoordinates,

        setSelectedWorker,
        setBookingId,
        setPaymentDone,

        setStartOtp,
        setEndOtp,

        setShiftStarted,
        setShiftEnded,

        refreshCatalogue,

        total,
        resetBooking,
      }}
    >
      {children}
    </BookingContext.Provider>
  )
}

export function useBooking() {
  const value = useContext(BookingContext)

  if (!value) {
    throw new Error(
      'useBooking must be used inside BookingProvider'
    )
  }

  return value
}