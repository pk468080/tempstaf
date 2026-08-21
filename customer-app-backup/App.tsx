import { useState } from 'react'
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import * as Location from 'expo-location'

const ORANGE = '#FF9F2F'
const NAVY = '#082B4C'
const TEAL = '#08A6A6'
const LIGHT = '#F7F9FB'
const GRAY = '#6B7280'
const BORDER = '#E1E5EA'
const GREEN = '#16A34A'
const logo = require('./assets/tempstaff-logo.png')

type Screen =
  | 'login' | 'otp' | 'home' | 'services' | 'location'
  | 'workers' | 'summary' | 'payment' | 'booking' | 'tracking'

type Worker = {
  id: string
  name: string
  service: string
  rating: number
  jobs: number
  distance: string
}

const services = ['Housekeeping', 'Office Boy', 'Pantry Staff', 'Helper']
const durations = ['1 Day', '2 Days', '1 Week', '1 Month']
const modes = ['Instant', 'Scheduled', 'Recurring']

const workers: Worker[] = [
  { id: 'w1', name: 'Amit Kumar', service: 'Housekeeping', rating: 4.8, jobs: 126, distance: '1.2 km' },
  { id: 'w2', name: 'Rahul Singh', service: 'Housekeeping', rating: 4.7, jobs: 98, distance: '2.1 km' },
  { id: 'w3', name: 'Vikas Sharma', service: 'Office Boy', rating: 4.9, jobs: 151, distance: '1.8 km' },
  { id: 'w4', name: 'Sandeep Yadav', service: 'Pantry Staff', rating: 4.6, jobs: 73, distance: '2.7 km' },
  { id: 'w5', name: 'Rohit Verma', service: 'Helper', rating: 4.8, jobs: 112, distance: '3.0 km' },
]

const priceFor = (service: string, duration: string) => {
  const base: Record<string, number> = {
    Housekeeping: 799,
    'Office Boy': 899,
    'Pantry Staff': 999,
    Helper: 849,
  }
  const multiplier: Record<string, number> = {
    '1 Day': 1,
    '2 Days': 1.9,
    '1 Week': 6.2,
    '1 Month': 24,
  }
  return Math.round((base[service] || 799) * (multiplier[duration] || 1))
}

const iconFor = (service: string) =>
  service === 'Housekeeping' ? '🧹'
  : service === 'Office Boy' ? '💼'
  : service === 'Pantry Staff' ? '🍽️'
  : '👷'

export default function App() {
  const [screen, setScreen] = useState<Screen>('login')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [selectedService, setSelectedService] = useState('')
  const [selectedDuration, setSelectedDuration] = useState('')
  const [bookingMode, setBookingMode] = useState('Instant')
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

  const total = priceFor(selectedService, selectedDuration)

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

  const sendOtp = () => {
    if (!/^\d{10}$/.test(phone)) {
      Alert.alert('Invalid number', 'Enter a valid 10-digit mobile number.')
      return
    }
    setOtp('')
    setScreen('otp')
  }

  const verifyOtp = () => {
    if (otp !== '123456') {
      Alert.alert('Invalid OTP', 'Development OTP is 123456.')
      return
    }
    setScreen('home')
  }

  const useCurrentLocation = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync()
      if (permission.status !== 'granted') {
        Alert.alert('Permission needed', 'Allow location access or enter the address manually.')
        return
      }
      const current = await Location.getCurrentPositionAsync({})
      const text = `${current.coords.latitude.toFixed(5)}, ${current.coords.longitude.toFixed(5)}`
      setCoordinates(text)
      setAddress('Current location')
    } catch {
      Alert.alert('Location unavailable', 'Enter the service address manually.')
    }
  }

  const findWorkers = () => {
    if (!address.trim()) {
      Alert.alert('Location required', 'Select your location or enter an address.')
      return
    }
    setScreen('workers')
  }

  const chooseWorker = (worker: Worker) => {
    setSelectedWorker(worker)
    setScreen('summary')
  }

  const createBooking = () => {
    if (!selectedWorker) return
    setBookingId(`TS-${Date.now().toString().slice(-8)}`)
    setScreen('payment')
  }

  const payNow = () => {
    setPaymentDone(true)
    setScreen('booking')
  }

  const startShift = () => {
    if (startOtp !== '246810') {
      Alert.alert('Invalid start OTP', 'Development start OTP is 246810.')
      return
    }
    setShiftStarted(true)
  }

  const endShift = () => {
    if (endOtp !== '864201') {
      Alert.alert('Invalid end OTP', 'Development end OTP is 864201.')
      return
    }
    setShiftEnded(true)
  }

  const Header = ({ back }: { back?: () => void }) => (
    <View style={styles.header}>
      {back ? (
        <TouchableOpacity onPress={back} style={styles.headerButton}>
          <Text style={styles.headerBack}>‹</Text>
        </TouchableOpacity>
      ) : <View style={styles.headerButton} />}
      <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
      <View style={styles.headerButton} />
    </View>
  )

  if (screen === 'login') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.authContainer}>
          <Image source={logo} style={styles.authLogo} resizeMode="contain" />
          <Text style={styles.brand}>Temp<Text style={styles.brandTeal}>Staff</Text></Text>
          <Text style={styles.tagline}>STAFF WHEN YOU NEED THEM.</Text>
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtitle}>Get reliable temporary staff for your home or business.</Text>

          <View style={styles.phoneRow}>
            <View style={styles.countryBox}><Text style={styles.countryText}>🇮🇳 +91</Text></View>
            <TextInput
              style={styles.phoneInput}
              placeholder="Mobile number"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={sendOtp}>
            <Text style={styles.primaryText}>Continue</Text>
          </TouchableOpacity>
          <Text style={styles.devNote}>Development authentication only. Real OTP will be connected later.</Text>
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (screen === 'otp') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.authContainer}>
          <Image source={logo} style={styles.authLogoSmall} resizeMode="contain" />
          <Text style={styles.title}>Verify your number</Text>
          <Text style={styles.subtitle}>We sent a 6-digit OTP to</Text>
          <Text style={styles.phoneText}>+91 {phone}</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter OTP"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
          />
          <TouchableOpacity style={styles.primaryButton} onPress={verifyOtp}>
            <Text style={styles.primaryText}>Verify & Continue</Text>
          </TouchableOpacity>
          <Text style={styles.devOtp}>Development OTP: 123456</Text>
          <TouchableOpacity onPress={() => setScreen('login')}>
            <Text style={styles.backText}>Change number</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (screen === 'home') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.homeContainer}>
          <View style={styles.homeTop}>
            <Image source={logo} style={styles.homeLogo} resizeMode="contain" />
            <View>
              <Text style={styles.smallText}>Hello 👋</Text>
              <Text style={styles.homeName}>Need staff today?</Text>
            </View>
          </View>

          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Reliable staff, when you need them.</Text>
            <Text style={styles.heroText}>Book temporary staff for home or office work.</Text>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => { resetBooking(); setScreen('services') }}
            >
              <Text style={styles.primaryText}>Find Staff</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Popular services</Text>
          <View style={styles.grid}>
            {services.map(service => (
              <TouchableOpacity
                key={service}
                style={styles.quickCard}
                onPress={() => {
                  resetBooking()
                  setSelectedService(service)
                  setScreen('services')
                }}
              >
                <Text style={styles.serviceIcon}>{iconFor(service)}</Text>
                <Text style={styles.quickText}>{service}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => {
              if (bookingId && paymentDone) setScreen('booking')
              else Alert.alert('No bookings', 'You do not have a booking yet.')
            }}
          >
            <Text style={styles.outlineText}>My Bookings</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (screen === 'services') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.page}>
          <Header back={() => setScreen('home')} />
          <Text style={styles.pageTitle}>Find Staff</Text>
          <Text style={styles.pageSubtitle}>What type of staff do you need?</Text>

          <View style={styles.grid}>
            {services.map(service => (
              <TouchableOpacity
                key={service}
                style={[styles.serviceCard, selectedService === service && styles.selected]}
                onPress={() => setSelectedService(service)}
              >
                <Text style={styles.serviceIcon}>{iconFor(service)}</Text>
                <Text style={[styles.cardText, selectedService === service && styles.selectedText]}>
                  {service}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>How long do you need them?</Text>
          <View style={styles.grid}>
            {durations.map(duration => (
              <TouchableOpacity
                key={duration}
                style={[styles.durationCard, selectedDuration === duration && styles.selected]}
                onPress={() => setSelectedDuration(duration)}
              >
                <Text style={[styles.cardText, selectedDuration === duration && styles.selectedText]}>
                  {duration}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>When do you need them?</Text>
          <View style={styles.modeRow}>
            {modes.map(mode => (
              <TouchableOpacity
                key={mode}
                style={[styles.modeChip, bookingMode === mode && styles.selected]}
                onPress={() => setBookingMode(mode)}
              >
                <Text style={[styles.modeText, bookingMode === mode && styles.selectedText]}>{mode}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {bookingMode === 'Scheduled' && (
            <TextInput
              style={styles.fullInput}
              placeholder="Date & time (e.g. 25 Aug, 10:00 AM)"
              placeholderTextColor="#9CA3AF"
              value={scheduledDate}
              onChangeText={setScheduledDate}
            />
          )}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!selectedService || !selectedDuration ||
                (bookingMode === 'Scheduled' && !scheduledDate)) && styles.disabled
            ]}
            disabled={!selectedService || !selectedDuration ||
              (bookingMode === 'Scheduled' && !scheduledDate)}
            onPress={() => setScreen('location')}
          >
            <Text style={styles.primaryText}>Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (screen === 'location') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.page}>
          <Header back={() => setScreen('services')} />
          <Text style={styles.pageTitle}>Where do you need staff?</Text>
          <Text style={styles.pageSubtitle}>Choose your location so we can find nearby workers.</Text>

          <TouchableOpacity style={styles.locationCard} onPress={useCurrentLocation}>
            <View style={styles.locationIcon}><Text style={styles.serviceIcon}>📍</Text></View>
            <View style={styles.locationContent}>
              <Text style={styles.locationTitle}>Use my current location</Text>
              <Text style={styles.locationDescription}>Allow location access on this device.</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.or}>OR</Text>

          <TextInput
            style={styles.addressInput}
            placeholder="Enter full service address"
            placeholderTextColor="#9CA3AF"
            multiline
            value={address === 'Current location' ? '' : address}
            onChangeText={value => { setAddress(value); setCoordinates('') }}
          />

          {address === 'Current location' && (
            <View style={styles.successLocation}>
              <Text style={styles.successGreen}>✓ Current location selected</Text>
              <Text style={styles.smallText}>{coordinates}</Text>
            </View>
          )}

          <View style={styles.summary}>
            <Text style={styles.label}>Service</Text><Text style={styles.value}>{selectedService}</Text>
            <Text style={styles.label}>Duration</Text><Text style={styles.value}>{selectedDuration}</Text>
            <Text style={styles.label}>Booking type</Text><Text style={styles.value}>{bookingMode}</Text>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={findWorkers}>
            <Text style={styles.primaryText}>Find Nearby Staff</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (screen === 'workers') {
    const matching = workers.filter(w => w.service === selectedService)

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.page}
          showsVerticalScrollIndicator={false}
        >
          <Header back={() => setScreen('location')} />

          <Text style={styles.pageTitle}>Available Staff</Text>

          <Text style={styles.pageSubtitle}>
            Verified {selectedService} workers near your location.
          </Text>

          <View style={styles.searchInfo}>
            <View style={styles.searchInfoIcon}>
              <Text style={{ fontSize: 20 }}>📍</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.searchInfoTitle}>
                Staff near you
              </Text>

              <Text style={styles.searchInfoText}>
                {address === 'Current location'
                  ? 'Using your current location'
                  : address}
              </Text>
            </View>
          </View>

          <View style={styles.resultHeader}>
            <Text style={styles.resultCount}>
              {matching.length} staff available
            </Text>

            <Text style={styles.sortText}>
              Recommended
            </Text>
          </View>

          {matching.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👷</Text>

              <Text style={styles.emptyTitle}>
                No staff available
              </Text>

              <Text style={styles.emptyText}>
                We couldn't find available {selectedService.toLowerCase()}
                {' '}staff nearby.
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setScreen('location')}
              >
                <Text style={styles.primaryText}>
                  Change Location
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            matching.map(worker => (
              <TouchableOpacity
                key={worker.id}
                style={styles.workerCard}
                activeOpacity={0.85}
                onPress={() => chooseWorker(worker)}
              >
                <View style={styles.workerTop}>
                  <View style={styles.avatarLarge}>
                    <Text style={styles.avatarLargeText}>
                      {worker.name.charAt(0)}
                    </Text>
                  </View>

                  <View style={styles.workerInfo}>
                    <View style={styles.workerNameRow}>
                      <Text style={styles.workerName}>
                        {worker.name}
                      </Text>

                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedBadgeText}>
                          ✓ Verified
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.workerService}>
                      {iconFor(worker.service)} {worker.service}
                    </Text>

                    <View style={styles.ratingRow}>
                      <Text style={styles.rating}>
                        ★ {worker.rating}
                      </Text>

                      <Text style={styles.workerMeta}>
                        {worker.jobs} jobs
                      </Text>

                      <Text style={styles.workerMeta}>
                        {worker.distance}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.workerDivider} />

                <View style={styles.workerBottom}>
                  <View>
                    <Text style={styles.availableText}>
                      ● Available now
                    </Text>

                    <Text style={styles.workerSmallText}>
                      Ready for your booking
                    </Text>
                  </View>

                  <View style={styles.selectButton}>
                    <Text style={styles.selectButtonText}>
                      Select
                    </Text>

                    <Text style={styles.selectArrow}>
                      ›
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (screen === 'summary') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.page}>
          <Header back={() => setScreen('workers')} />
          <Text style={styles.pageTitle}>Review your booking</Text>

          {selectedWorker && (
            <View style={styles.workerSelected}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{selectedWorker.name[0]}</Text></View>
              <View style={styles.workerInfo}>
                <Text style={styles.workerName}>{selectedWorker.name}</Text>
                <Text style={styles.workerService}>{selectedWorker.service}</Text>
                <Text style={styles.workerMeta}>⭐ {selectedWorker.rating} · {selectedWorker.jobs} jobs</Text>
              </View>
            </View>
          )}

          <View style={styles.summary}>
            <Text style={styles.label}>Service</Text><Text style={styles.value}>{selectedService}</Text>
            <Text style={styles.label}>Duration</Text><Text style={styles.value}>{selectedDuration}</Text>
            <Text style={styles.label}>Booking type</Text><Text style={styles.value}>{bookingMode}</Text>
            {scheduledDate ? <><Text style={styles.label}>Schedule</Text><Text style={styles.value}>{scheduledDate}</Text></> : null}
            <Text style={styles.label}>Location</Text>
            <Text style={styles.value}>{address === 'Current location' ? coordinates : address}</Text>
          </View>

          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Total payable</Text>
            <Text style={styles.price}>₹{total.toLocaleString('en-IN')}</Text>
            <Text style={styles.priceNote}>Payment is required before the booking is confirmed.</Text>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={createBooking}>
            <Text style={styles.primaryText}>Continue to Payment</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (screen === 'payment') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.page}>
          <Header back={() => setScreen('summary')} />
          <Text style={styles.pageTitle}>Pay before booking</Text>
          <Text style={styles.pageSubtitle}>Your worker is confirmed only after successful payment.</Text>

          <View style={styles.paymentCard}>
            <Text style={styles.price}>₹{total.toLocaleString('en-IN')}</Text>
            <Text style={styles.paymentText}>{selectedService} · {selectedDuration}</Text>
            <Text style={styles.paymentText}>Booking ID: {bookingId}</Text>
          </View>

          <TouchableOpacity
            style={styles.payButton}
            onPress={() => Alert.alert(
              'Demo payment',
              'No real money will be charged in development mode.',
              [{ text: 'Pay Now', onPress: payNow }, { text: 'Cancel', style: 'cancel' }]
            )}
          >
            <Text style={styles.primaryText}>Pay Now</Text>
          </TouchableOpacity>
          <Text style={styles.devNote}>Real UPI/card payment will be connected with Razorpay next.</Text>
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (screen === 'booking') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.page}>
          <Header back={() => setScreen('home')} />
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>Booking confirmed</Text>
            <Text style={styles.successText}>Payment received and your worker has been assigned.</Text>
            <Text style={styles.bookingId}>{bookingId}</Text>
          </View>

          {selectedWorker && (
            <View style={styles.workerSelected}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{selectedWorker.name[0]}</Text></View>
              <View style={styles.workerInfo}>
                <Text style={styles.workerName}>{selectedWorker.name}</Text>
                <Text style={styles.workerService}>{selectedWorker.service}</Text>
                <Text style={styles.workerMeta}>⭐ {selectedWorker.rating} · {selectedWorker.distance}</Text>
              </View>
            </View>
          )}

          <View style={styles.statusCard}>
            <View style={styles.statusDot} />
            <View style={styles.workerInfo}>
              <Text style={styles.workerName}>
                {shiftEnded ? 'Shift completed' : shiftStarted ? 'Shift in progress' : 'Worker is on the way'}
              </Text>
              <Text style={styles.workerMeta}>
                {shiftEnded ? 'The shift has been completed.' : 'Track the worker and verify the start OTP when they arrive.'}
              </Text>
            </View>
          </View>

          {!shiftEnded && (
            <TouchableOpacity style={styles.primaryButton} onPress={() => setScreen('tracking')}>
              <Text style={styles.primaryText}>{shiftStarted ? 'Manage Shift' : 'Track Worker'}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.secondaryButton} onPress={() => { resetBooking(); setScreen('home') }}>
            <Text style={styles.primaryText}>Back to Home</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (screen === 'tracking') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.page}>
          <Header back={() => setScreen('booking')} />
          <Text style={styles.pageTitle}>Track your worker</Text>
          <Text style={styles.pageSubtitle}>Realtime worker tracking will use Supabase Realtime when the worker app is connected.</Text>

          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPin}>📍</Text>
            <Text style={styles.mapTitle}>Live tracking area</Text>
            <Text style={styles.mapText}>Worker: {selectedWorker?.name}</Text>
            <Text style={styles.mapText}>Distance: {selectedWorker?.distance}</Text>
            <Text style={styles.mapText}>Service: {selectedService}</Text>
          </View>

          {!shiftStarted && !shiftEnded && (
            <View style={styles.otpCard}>
              <Text style={styles.sectionTitle}>Worker has arrived?</Text>
              <Text style={styles.workerMeta}>Enter the start OTP to begin the shift.</Text>
              <TextInput
                style={styles.input}
                placeholder="Start OTP"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={6}
                value={startOtp}
                onChangeText={setStartOtp}
              />
              <TouchableOpacity style={styles.primaryButton} onPress={startShift}>
                <Text style={styles.primaryText}>Start Shift</Text>
              </TouchableOpacity>
              <Text style={styles.devOtp}>Development start OTP: 246810</Text>
            </View>
          )}

          {shiftStarted && !shiftEnded && (
            <View style={styles.otpCard}>
              <Text style={styles.sectionTitle}>Shift started</Text>
              <Text style={styles.workerMeta}>The worker is now marked as working.</Text>
              <TextInput
                style={styles.input}
                placeholder="End OTP"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={6}
                value={endOtp}
                onChangeText={setEndOtp}
              />
              <TouchableOpacity style={styles.primaryButton} onPress={endShift}>
                <Text style={styles.primaryText}>End Shift</Text>
              </TouchableOpacity>
              <Text style={styles.devOtp}>Development end OTP: 864201</Text>
            </View>
          )}

          {shiftEnded && (
            <View style={styles.successBox}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successTitle}>Shift completed</Text>
              <Text style={styles.successText}>End OTP verified successfully.</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => { resetBooking(); setScreen('home') }}>
                <Text style={styles.primaryText}>Finish & Go Home</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    )
  }

  return null
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LIGHT },
  authContainer: { flexGrow: 1, padding: 28, paddingTop: 40, paddingBottom: 30, alignItems: 'center' },
  authLogo: { width: 120, height: 120, marginBottom: 8 },
  authLogoSmall: { width: 90, height: 90, marginBottom: 25 },
  brand: { fontSize: 38, fontWeight: '800', color: NAVY },
  brandTeal: { color: TEAL },
  tagline: { marginTop: 4, color: GRAY, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 55 },
  title: { width: '100%', fontSize: 28, fontWeight: '800', color: NAVY, marginBottom: 10 },
  subtitle: { width: '100%', color: GRAY, fontSize: 15, lineHeight: 22, marginBottom: 28 },
  phoneRow: { width: '100%', flexDirection: 'row', marginBottom: 18 },
  countryBox: { height: 56, paddingHorizontal: 14, borderWidth: 1, borderColor: '#D9DEE5', borderRadius: 14, backgroundColor: 'white', justifyContent: 'center', marginRight: 8 },
  countryText: { color: NAVY, fontSize: 15, fontWeight: '600' },
  phoneInput: { flex: 1, height: 56, borderWidth: 1, borderColor: '#D9DEE5', borderRadius: 14, backgroundColor: 'white', paddingHorizontal: 16, fontSize: 16, color: NAVY },
  input: { width: '100%', height: 56, borderWidth: 1, borderColor: '#D9DEE5', borderRadius: 14, backgroundColor: 'white', paddingHorizontal: 16, fontSize: 20, letterSpacing: 6, textAlign: 'center', color: NAVY, marginBottom: 18 },
  fullInput: { width: '100%', height: 56, borderWidth: 1, borderColor: BORDER, borderRadius: 14, backgroundColor: 'white', paddingHorizontal: 16, fontSize: 15, color: NAVY, marginBottom: 14 },
  addressInput: { width: '100%', minHeight: 100, borderWidth: 1, borderColor: BORDER, borderRadius: 16, backgroundColor: 'white', padding: 14, fontSize: 15, color: NAVY, textAlignVertical: 'top' },
  primaryButton: { width: '100%', height: 56, borderRadius: 28, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  primaryText: { color: 'white', fontSize: 17, fontWeight: '800' },
  secondaryButton: { width: '100%', height: 56, borderRadius: 28, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  devNote: { color: GRAY, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 16 },
  devOtp: { color: ORANGE, fontWeight: '700', marginTop: 14, marginBottom: 20 },
  phoneText: { width: '100%', color: NAVY, fontWeight: '700', marginBottom: 18 },
  backText: { color: TEAL, fontSize: 15, fontWeight: '700' },

  homeContainer: { padding: 22, paddingBottom: 45 },
  homeTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  homeLogo: { width: 64, height: 64, marginRight: 14 },
  smallText: { color: GRAY, fontSize: 13 },
  homeName: { color: NAVY, fontSize: 22, fontWeight: '800' },
  hero: { backgroundColor: NAVY, borderRadius: 24, padding: 22, marginBottom: 28 },
  heroTitle: { color: 'white', fontSize: 25, lineHeight: 31, fontWeight: '800' },
  heroText: { color: '#D8E4EF', fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 18 },
  heroButton: { backgroundColor: ORANGE, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: NAVY, fontSize: 20, fontWeight: '800', marginTop: 18, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  quickCard: { width: '48%', backgroundColor: 'white', borderWidth: 1, borderColor: BORDER, borderRadius: 18, padding: 16, marginBottom: 12 },
  quickText: { color: NAVY, fontSize: 14, fontWeight: '800' },
  outlineButton: { width: '100%', height: 54, borderRadius: 27, borderWidth: 2, borderColor: NAVY, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  outlineText: { color: NAVY, fontSize: 16, fontWeight: '800' },

  page: { padding: 22, paddingBottom: 45 },
  header: { width: '100%', height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  headerButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  headerBack: { color: NAVY, fontSize: 30, lineHeight: 32 },
  headerLogo: { width: 48, height: 48 },
  pageTitle: { color: NAVY, fontSize: 31, fontWeight: '800', marginBottom: 7 },
  pageSubtitle: { color: GRAY, fontSize: 15, lineHeight: 22, marginBottom: 22 },
  serviceCard: { width: '48%', minHeight: 108, borderRadius: 18, backgroundColor: 'white', borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', marginBottom: 12, padding: 10 },
  durationCard: { width: '48%', height: 58, borderRadius: 16, backgroundColor: 'white', borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  serviceIcon: { fontSize: 27, marginBottom: 7 },
  cardText: { color: NAVY, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  selected: { backgroundColor: ORANGE, borderColor: ORANGE },
  selectedText: { color: 'white' },
  modeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  modeChip: { width: '31%', height: 48, borderRadius: 24, backgroundColor: 'white', borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  modeText: { color: NAVY, fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.45 },

  locationCard: { width: '100%', flexDirection: 'row', backgroundColor: 'white', borderWidth: 1, borderColor: BORDER, borderRadius: 18, padding: 18, marginBottom: 12 },
  locationIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF1DF', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  locationContent: { flex: 1, justifyContent: 'center' },
  locationTitle: { color: NAVY, fontSize: 16, fontWeight: '800', marginBottom: 5 },
  locationDescription: { color: GRAY, fontSize: 13, lineHeight: 19 },
  or: { color: GRAY, textAlign: 'center', fontSize: 12, fontWeight: '800', marginBottom: 12 },
  successLocation: { backgroundColor: '#ECFDF3', borderRadius: 15, padding: 14, marginTop: 12 },
  successGreen: { color: GREEN, fontWeight: '800', marginBottom: 4 },

  summary: { width: '100%', backgroundColor: 'white', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: BORDER, marginTop: 18, marginBottom: 16 },
  label: { color: GRAY, fontSize: 12, marginBottom: 3 },
  value: { color: NAVY, fontSize: 16, fontWeight: '800', marginBottom: 12 },
  workerCard: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 15, marginBottom: 12 },
  workerSelected: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 18, borderWidth: 2, borderColor: ORANGE, padding: 16, marginBottom: 16 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { color: 'white', fontSize: 21, fontWeight: '800' },
  workerInfo: { flex: 1 },
  workerName: { color: NAVY, fontSize: 16, fontWeight: '800', marginBottom: 3 },
  workerService: { color: TEAL, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  workerMeta: { color: GRAY, fontSize: 12 },
  verified: { color: GREEN, fontSize: 12, fontWeight: '700', marginTop: 5 },
  chevron: { color: NAVY, fontSize: 28, marginLeft: 8 },
  empty: { backgroundColor: 'white', borderRadius: 18, padding: 25, alignItems: 'center' },
  emptyTitle: { color: NAVY, fontSize: 18, fontWeight: '800' },

  priceCard: { width: '100%', backgroundColor: NAVY, borderRadius: 20, padding: 20, marginBottom: 14 },
  priceLabel: { color: '#D8E4EF', fontSize: 13 },
  price: { color: 'white', fontSize: 31, fontWeight: '900', marginVertical: 5 },
  priceNote: { color: '#D8E4EF', fontSize: 12, lineHeight: 18 },
  paymentCard: { width: '100%', backgroundColor: 'white', borderRadius: 20, padding: 22, borderWidth: 1, borderColor: BORDER, marginBottom: 18 },
  paymentText: { color: GRAY, fontSize: 14, marginBottom: 5 },
  payButton: { width: '100%', height: 58, borderRadius: 29, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },

  successBox: { width: '100%', backgroundColor: '#ECFDF3', borderRadius: 20, padding: 22, alignItems: 'center', marginBottom: 16 },
  successIcon: { color: GREEN, fontSize: 42, fontWeight: '900', marginBottom: 8 },
  successTitle: { color: NAVY, fontSize: 21, fontWeight: '900', marginBottom: 6 },
  successText: { color: GRAY, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  bookingId: { color: TEAL, fontSize: 14, fontWeight: '900', marginTop: 10 },
  statusCard: { width: '100%', flexDirection: 'row', backgroundColor: 'white', borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 18, marginBottom: 14 },
  statusDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: GREEN, marginTop: 5, marginRight: 12 },

  mapPlaceholder: { width: '100%', minHeight: 270, borderRadius: 22, backgroundColor: '#DCEBF1', alignItems: 'center', justifyContent: 'center', padding: 20, marginBottom: 18 },
  mapPin: { fontSize: 46, marginBottom: 8 },
  mapTitle: { color: NAVY, fontSize: 20, fontWeight: '900', marginBottom: 8 },
  mapText: { color: GRAY, fontSize: 13, textAlign: 'center', marginBottom: 3 },
  otpCard: { width: '100%', backgroundColor: 'white', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER, marginBottom: 16 },

  searchInfo: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 16,
    marginBottom: 22,
  },

  searchInfoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF1DE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  searchInfoTitle: {
    color: NAVY,
    fontSize: 16,
    fontWeight: '800',
  },

  searchInfoText: {
    color: GRAY,
    fontSize: 13,
    marginTop: 4,
  },

  resultHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  resultCount: {
    color: NAVY,
    fontSize: 17,
    fontWeight: '800',
  },

  sortText: {
    color: TEAL,
    fontSize: 13,
    fontWeight: '700',
  },

  workerCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    padding: 17,
    marginBottom: 14,
  },

  workerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  avatarLarge: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  avatarLargeText: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
  },

  workerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  verifiedBadge: {
    backgroundColor: '#EAF8EF',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginLeft: 7,
  },

  verifiedBadgeText: {
    color: GREEN,
    fontSize: 10,
    fontWeight: '800',
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
  },

  rating: {
    color: '#D97706',
    fontSize: 13,
    fontWeight: '800',
    marginRight: 12,
  },

  workerDivider: {
    height: 1,
    backgroundColor: '#EEF1F4',
    marginVertical: 15,
  },

  workerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  availableText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '800',
  },

  workerSmallText: {
    color: GRAY,
    fontSize: 11,
    marginTop: 3,
  },

  selectButton: {
    height: 42,
    paddingHorizontal: 17,
    borderRadius: 21,
    backgroundColor: ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  selectArrow: {
    color: '#FFFFFF',
    fontSize: 20,
    marginLeft: 5,
  },

  emptyIcon: {
    fontSize: 50,
    marginBottom: 15,
  },

  emptyText: {
    color: GRAY,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 22,
  },
})