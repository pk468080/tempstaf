import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react'

import {
  BookingMode,
  Worker,
} from '../types'

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

type HourlyServiceVariant = {
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
}

type ScheduleOccurrence = {
  occurrence_date: string
  scheduled_start: string
  scheduled_end: string
}

type BookingPricing = {
  grossAmount: number
  discountPercent: number
  discountAmount: number
  finalAmount: number
  hourlyPrice: number
  currency: string
  pricingVersion: number | null
}

type BookingState = {
  /*
   * Service selection
   */
  selectedService: string
  selectedServiceId: string

  /*
   * New hourly booking model.
   *
   * selectedVariantId is the backend service_variants.id
   * for the active Hourly variant belonging to the selected service.
   */
  selectedVariantId: string
  selectedVariant: HourlyServiceVariant | null

  /*
   * Legacy package fields are temporarily retained because
   * the existing screens still reference them. They will be
   * removed when the remaining booking screens are migrated.
   */
  selectedDuration: string
  selectedPackageId: string
  selectedPackage: CatalogPackage | null

  services: CatalogService[]
  hourlyVariants: HourlyServiceVariant[]

  /*
   * Legacy alias retained for the transition period.
   */
  packages: CatalogPackage[]

  catalogueLoading: boolean
  catalogueError: string

  /*
   * Booking method
   */
  bookingMode: BookingMode

  /*
   * Single scheduled booking
   */
  scheduledDate: string

  /*
   * Multi-occurrence / recurring booking
   */
  scheduleStartDate: string
  scheduleEndDate: string
  scheduleDailyStartTime: string
  scheduleDailyEndTime: string
  scheduleSelectedWeekdays: number[]
  scheduleOffDates: string[]
  scheduleTotalWorkingHours: number
  scheduleOccurrences: ScheduleOccurrence[]

  /*
   * Customer address
   */
  address: string
  addressId: string
  coordinates: string

  /*
   * Worker
   *
   * The backend remains authoritative for worker assignment.
   * This state is therefore only a UI/display preference and
   * must never be treated as an availability guarantee.
   */
  selectedWorker: Worker | null

  /*
   * Booking/payment/journey state
   */
  bookingId: string
  paymentDone: boolean

  startOtp: string
  endOtp: string

  shiftStarted: boolean
  shiftEnded: boolean

  /*
   * Hourly duration / pricing
   */
  hourlyStartTime: string
  hourlyEndTime: string
  hourlyTotalHours: number

  bookingPricing: BookingPricing | null
  pricingLoading: boolean
  pricingError: string

  /*
   * Setters
   */
  setSelectedService: (value: string) => void
  setSelectedDuration: (value: string) => void

  setSelectedVariantId: (value: string) => void

  setBookingMode: (value: BookingMode) => void

  setScheduledDate: (value: string) => void

  setScheduleStartDate: (value: string) => void
  setScheduleEndDate: (value: string) => void
  setScheduleDailyStartTime: (value: string) => void
  setScheduleDailyEndTime: (value: string) => void
  setScheduleSelectedWeekdays: (value: number[]) => void
  setScheduleOffDates: (value: string[]) => void
  setScheduleTotalWorkingHours: (value: number) => void
  setScheduleOccurrences: (
    value: ScheduleOccurrence[]
  ) => void

  setHourlyStartTime: (value: string) => void
  setHourlyEndTime: (value: string) => void
  setHourlyTotalHours: (value: number) => void

  setBookingPricing: (
    value: BookingPricing | null
  ) => void

  setPricingLoading: (value: boolean) => void
  setPricingError: (value: string) => void

  setAddress: (value: string) => void
  setAddressId: (value: string) => void
  setCoordinates: (value: string) => void

  setSelectedWorker: (value: Worker | null) => void

  setBookingId: (value: string) => void
  setPaymentDone: (value: boolean) => void

  setStartOtp: (value: string) => void
  setEndOtp: (value: string) => void

  setShiftStarted: (value: boolean) => void
  setShiftEnded: (value: boolean) => void

  refreshCatalogue: () => Promise<void>

  /*
   * Legacy total is retained temporarily.
   *
   * During migration, new screens should use bookingPricing.finalAmount.
   */
  total: number

  resetBooking: () => void
}

const BookingContext =
  createContext<BookingState | null>(null)

export function BookingProvider({
  children,
}: {
  children: ReactNode
}) {
  /*
   * Service
   */
  const [
    selectedService,
    setSelectedServiceState,
  ] = useState('')

  const [
    selectedServiceId,
    setSelectedServiceId,
  ] = useState('')

  /*
   * New hourly variant
   */
  const [
    selectedVariantId,
    setSelectedVariantIdState,
  ] = useState('')

  /*
   * Legacy fixed-duration/package state.
   *
   * Kept only until the remaining screens are migrated.
   */
  const [
    selectedDuration,
    setSelectedDurationState,
  ] = useState('')

  const [
    selectedPackageId,
    setSelectedPackageId,
  ] = useState('')

  /*
   * Catalogue
   */
  const [
    services,
    setServices,
  ] = useState<CatalogService[]>([])

  const [
    hourlyVariants,
    setHourlyVariants,
  ] = useState<HourlyServiceVariant[]>([])

  /*
   * Legacy package array.
   *
   * It is intentionally empty in the new catalogue flow.
   * The backend's active Hourly variant is represented by
   * hourlyVariants instead.
   */
  const [
    packages,
    setPackages,
  ] = useState<CatalogPackage[]>([])

  const [
    catalogueLoading,
    setCatalogueLoading,
  ] = useState(true)

  const [
    catalogueError,
    setCatalogueError,
  ] = useState('')

  /*
   * Booking method
   */
  const [
    bookingMode,
    setBookingMode,
  ] = useState<BookingMode>('Scheduled')

  /*
   * Single scheduled booking
   */
  const [
    scheduledDate,
    setScheduledDate,
  ] = useState('')

  /*
   * Multi-occurrence / recurring booking
   */
  const [
    scheduleStartDate,
    setScheduleStartDate,
  ] = useState('')

  const [
    scheduleEndDate,
    setScheduleEndDate,
  ] = useState('')

  const [
    scheduleDailyStartTime,
    setScheduleDailyStartTime,
  ] = useState('')

  const [
    scheduleDailyEndTime,
    setScheduleDailyEndTime,
  ] = useState('')

  const [
    scheduleSelectedWeekdays,
    setScheduleSelectedWeekdays,
  ] = useState<number[]>([])

  const [
    scheduleOffDates,
    setScheduleOffDates,
  ] = useState<string[]>([])

  const [
    scheduleTotalWorkingHours,
    setScheduleTotalWorkingHours,
  ] = useState(0)

  const [
    scheduleOccurrences,
    setScheduleOccurrences,
  ] = useState<ScheduleOccurrence[]>([])

  /*
   * Address
   */
  const [
    address,
    setAddress,
  ] = useState('')

  const [
    addressId,
    setAddressId,
  ] = useState('')

  const [
    coordinates,
    setCoordinates,
  ] = useState('')

  /*
   * Worker
   */
  const [
    selectedWorker,
    setSelectedWorker,
  ] = useState<Worker | null>(null)

  /*
   * Booking/payment
   */
  const [
    bookingId,
    setBookingId,
  ] = useState('')

  const [
    paymentDone,
    setPaymentDone,
  ] = useState(false)

  /*
   * Journey OTP
   */
  const [
    startOtp,
    setStartOtp,
  ] = useState('')

  const [
    endOtp,
    setEndOtp,
  ] = useState('')

  const [
    shiftStarted,
    setShiftStarted,
  ] = useState(false)

  const [
    shiftEnded,
    setShiftEnded,
  ] = useState(false)

  /*
   * Hourly booking duration
   */
  const [
    hourlyStartTime,
    setHourlyStartTime,
  ] = useState('')

  const [
    hourlyEndTime,
    setHourlyEndTime,
  ] = useState('')

  const [
    hourlyTotalHours,
    setHourlyTotalHours,
  ] = useState(0)

  /*
   * Server-calculated pricing
   */
  const [
    bookingPricing,
    setBookingPricing,
  ] = useState<BookingPricing | null>(null)

  const [
    pricingLoading,
    setPricingLoading,
  ] = useState(false)

  const [
    pricingError,
    setPricingError,
  ] = useState('')

  /*
   * Load only the customer-facing active services and
   * active Hourly variants.
   *
   * Pricing is deliberately NOT loaded from service_variant_prices.
   *
   * The backend pricing RPCs are the authority for:
   * - hourly price
   * - dynamic hour discount
   * - recurring commitment discount
   * - final payable amount
   */
  const refreshCatalogue =
    async () => {
      setCatalogueLoading(true)
      setCatalogueError('')

      try {
        const {
          data: serviceData,
          error: serviceError,
        } = await supabase
          .from('services')
          .select(
            'id, name, description, is_active'
          )
          .eq('is_active', true)
          .order('name')

        if (serviceError) {
          throw serviceError
        }

        const activeServices =
          (serviceData ?? []) as CatalogService[]

        setServices(activeServices)

        const {
          data: variantData,
          error: variantError,
        } = await supabase
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
            sort_order
          `)
          .eq('is_active', true)
          .eq('billing_type', 'Hourly')
          .order('sort_order')

        if (variantError) {
          throw variantError
        }

        const activeHourlyVariants =
          (variantData ?? []).map(item => ({
            id: item.id,
            service_id: item.service_id,
            name: item.name,
            description: item.description,
            billing_type: item.billing_type,
            duration_value:
              item.duration_value,
            duration_unit:
              item.duration_unit,
            min_quantity:
              item.min_quantity,
            max_quantity:
              item.max_quantity,
            is_active:
              item.is_active,
            sort_order:
              item.sort_order,
          })) as HourlyServiceVariant[]

        /*
         * Keep only variants whose parent service is active.
         *
         * This mirrors the backend's service/catalogue
         * consistency requirement.
         */
        const activeServiceIds =
          new Set(
            activeServices.map(
              service => service.id
            )
          )

        const customerHourlyVariants =
          activeHourlyVariants.filter(
            variant =>
              activeServiceIds.has(
                variant.service_id
              )
          )

        setHourlyVariants(
          customerHourlyVariants
        )

        /*
         * Legacy package state is intentionally cleared.
         *
         * New booking screens should consume hourlyVariants.
         */
        setPackages([])
      } catch (error) {
        console.error(
          '[TempStaff] CATALOGUE LOAD ERROR:',
          JSON.stringify(
            error,
            null,
            2
          )
        )

        if (
          error &&
          typeof error === 'object'
        ) {
          console.error(
            '[TempStaff] Catalogue error details:',
            {
              message:
                'message' in error
                  ? error.message
                  : undefined,
              details:
                'details' in error
                  ? error.details
                  : undefined,
              hint:
                'hint' in error
                  ? error.hint
                  : undefined,
              code:
                'code' in error
                  ? error.code
                  : undefined,
            }
          )
        }

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

  /*
   * Selected hourly variant
   */
  const selectedVariant =
    useMemo(() => {
      return (
        hourlyVariants.find(
          variant =>
            variant.id ===
            selectedVariantId
        ) ?? null
      )
    }, [
      hourlyVariants,
      selectedVariantId,
    ])

  /*
   * Service selection
   */
  const setSelectedService = (
    value: string
  ) => {
    setSelectedServiceState(value)

    const service =
      services.find(
        item =>
          item.name === value
      )

    const serviceId =
      service?.id ?? ''

    setSelectedServiceId(
      serviceId
    )

    /*
     * Reset dependent selection.
     */
    setSelectedVariantIdState('')

    /*
     * Legacy state reset.
     */
    setSelectedDurationState('')
    setSelectedPackageId('')

    /*
     * Pricing belongs to the selected service variant,
     * so changing service invalidates the previous quote.
     */
    setBookingPricing(null)
    setPricingError('')
  }

  /*
   * New variant selection
   */
  const setSelectedVariantId = (
    value: string
  ) => {
    const variant =
      hourlyVariants.find(
        item =>
          item.id === value
      )

    if (!variant) {
      setSelectedVariantIdState('')
      setBookingPricing(null)
      setPricingError('')
      return
    }

    /*
     * Do not allow a variant from another service to
     * become the active booking selection.
     */
    if (
      selectedServiceId &&
      variant.service_id !==
        selectedServiceId
    ) {
      setSelectedVariantIdState('')
      setBookingPricing(null)
      setPricingError('')
      return
    }

    setSelectedVariantIdState(value)

    /*
     * Changing the service variant invalidates a previous
     * server pricing result.
     */
    setBookingPricing(null)
    setPricingError('')
  }

  /*
   * Legacy duration setter.
   *
   * Kept temporarily so existing screens continue to
   * compile while they are migrated to selectedVariantId.
   *
   * No fixed package price is selected here.
   */
  const setSelectedDuration = (
    value: string
  ) => {
    setSelectedDurationState(value)

    /*
     * The old fixed package lookup is deliberately removed.
     */
    setSelectedPackageId('')
  }

  /*
   * Legacy selected package.
   *
   * New catalogue no longer exposes fixed-duration packages.
   */
  const selectedPackage =
    useMemo(() => {
      return (
        packages.find(
          item =>
            item.id ===
            selectedPackageId
        ) ?? null
      )
    }, [
      packages,
      selectedPackageId,
    ])

  /*
   * Legacy total.
   *
   * Prefer bookingPricing.finalAmount for all new screens.
   */
  const total =
    bookingPricing?.finalAmount ??
    selectedPackage?.price ??
    0

  /*
   * Reset all booking-specific state.
   */
  const resetBooking = () => {
    setSelectedServiceState('')
    setSelectedServiceId('')

    setSelectedVariantIdState('')

    /*
     * Legacy fields
     */
    setSelectedDurationState('')
    setSelectedPackageId('')

    /*
     * Booking method
     */
    setBookingMode('Scheduled')

    /*
     * Single scheduled booking
     */
    setScheduledDate('')

    /*
     * Multi-occurrence / recurring
     */
    setScheduleStartDate('')
    setScheduleEndDate('')
    setScheduleDailyStartTime('')
    setScheduleDailyEndTime('')
    setScheduleSelectedWeekdays([])
    setScheduleOffDates([])
    setScheduleTotalWorkingHours(0)
    setScheduleOccurrences([])

    /*
     * Address
     */
    setAddress('')
    setAddressId('')
    setCoordinates('')

    /*
     * Worker
     */
    setSelectedWorker(null)

    /*
     * Booking/payment
     */
    setBookingId('')
    setPaymentDone(false)

    /*
     * Journey
     */
    setStartOtp('')
    setEndOtp('')
    setShiftStarted(false)
    setShiftEnded(false)

    /*
     * Hourly duration
     */
    setHourlyStartTime('')
    setHourlyEndTime('')
    setHourlyTotalHours(0)

    /*
     * Pricing
     */
    setBookingPricing(null)
    setPricingLoading(false)
    setPricingError('')
  }

  return (
    <BookingContext.Provider
      value={{
        /*
         * Service
         */
        selectedService,
        selectedServiceId,

        /*
         * New hourly model
         */
        selectedVariantId,
        selectedVariant,

        /*
         * Legacy compatibility
         */
        selectedDuration,
        selectedPackageId,
        selectedPackage,

        /*
         * Catalogue
         */
        services,
        hourlyVariants,
        packages,

        catalogueLoading,
        catalogueError,

        /*
         * Booking method
         */
        bookingMode,

        /*
         * Single scheduled booking
         */
        scheduledDate,

        /*
         * Multi-occurrence / recurring
         */
        scheduleStartDate,
        scheduleEndDate,
        scheduleDailyStartTime,
        scheduleDailyEndTime,
        scheduleSelectedWeekdays,
        scheduleOffDates,
        scheduleTotalWorkingHours,
        scheduleOccurrences,

        /*
         * Address
         */
        address,
        addressId,
        coordinates,

        /*
         * Worker
         */
        selectedWorker,

        /*
         * Booking/payment
         */
        bookingId,
        paymentDone,

        /*
         * Journey
         */
        startOtp,
        endOtp,
        shiftStarted,
        shiftEnded,

        /*
         * Hourly duration
         */
        hourlyStartTime,
        hourlyEndTime,
        hourlyTotalHours,

        /*
         * Pricing
         */
        bookingPricing,
        pricingLoading,
        pricingError,

        /*
         * Setters
         */
        setSelectedService,
        setSelectedDuration,
        setSelectedVariantId,

        setBookingMode,

        setScheduledDate,

        setScheduleStartDate,
        setScheduleEndDate,
        setScheduleDailyStartTime,
        setScheduleDailyEndTime,
        setScheduleSelectedWeekdays,
        setScheduleOffDates,
        setScheduleTotalWorkingHours,
        setScheduleOccurrences,

        setHourlyStartTime,
        setHourlyEndTime,
        setHourlyTotalHours,

        setBookingPricing,
        setPricingLoading,
        setPricingError,

        setAddress,
        setAddressId,
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
  const value =
    useContext(BookingContext)

  if (!value) {
    throw new Error(
      'useBooking must be used inside BookingProvider'
    )
  }

  return value
}