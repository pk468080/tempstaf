import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import * as Location from 'expo-location'

import { supabase } from '../lib/supabase'

type ServiceOption = {
  id: string
  name: string
}

type Props = {
  onComplete: () => void
}

type Step = 1 | 2 | 3 | 4

type OnboardingRow = {
  date_of_birth: string | null
  gender: string | null
  current_address: string | null
  permanent_address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  experience_years: number | null
  experience_summary: string | null
  service_latitude: number | null
  service_longitude: number | null
  onboarding_step: number
  consent_at: string | null
}

export default function WorkerOnboardingScreen({
  onComplete,
}: Props) {
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [services, setServices] = useState<ServiceOption[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [applicationStatus, setApplicationStatus] = useState<string>('draft')

  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('')
  const [currentAddress, setCurrentAddress] = useState('')
  const [permanentAddress, setPermanentAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')
  const [experienceYears, setExperienceYears] = useState('')
  const [experienceSummary, setExperienceSummary] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [consent, setConsent] = useState(false)

  const progress = useMemo(() => `${step} / 4`, [step])

  useEffect(() => {
    const load = async () => {
      try {
        const [
          { data: onboardingData, error: onboardingError },
          { data: serviceData, error: serviceError },
          { data: applicationData, error: applicationError },
          { data: workerServices, error: workerServicesError },
        ] = await Promise.all([
          supabase
            .from('worker_onboarding_profiles')
            .select(
              'date_of_birth, gender, current_address, permanent_address, city, state, pincode, experience_years, experience_summary, service_latitude, service_longitude, onboarding_step, consent_at'
            )
            .maybeSingle(),
          supabase
            .from('services')
            .select('id, name')
            .eq('is_active', true)
            .order('name'),
          supabase
            .from('worker_applications')
            .select('status')
            .maybeSingle(),
          supabase
            .from('worker_services')
            .select('service_id'),
        ])

        if (onboardingError) throw onboardingError
        if (serviceError) throw serviceError
        if (applicationError) throw applicationError
        if (workerServicesError) throw workerServicesError

        const profile = onboardingData as OnboardingRow | null

        if (profile) {
          setDateOfBirth(profile.date_of_birth ?? '')
          setGender(profile.gender ?? '')
          setCurrentAddress(profile.current_address ?? '')
          setPermanentAddress(profile.permanent_address ?? '')
          setCity(profile.city ?? '')
          setState(profile.state ?? '')
          setPincode(profile.pincode ?? '')
          setExperienceYears(
            profile.experience_years == null
              ? ''
              : String(profile.experience_years)
          )
          setExperienceSummary(profile.experience_summary ?? '')
          setLatitude(profile.service_latitude ?? null)
          setLongitude(profile.service_longitude ?? null)
          setConsent(Boolean(profile.consent_at))

          const savedStep = Number(profile.onboarding_step || 1)
          if (savedStep >= 1 && savedStep <= 4) {
            setStep(savedStep as Step)
          }
        }

        setServices((serviceData ?? []) as ServiceOption[])
        setSelectedServiceIds(
          (workerServices ?? []).map(row => row.service_id)
        )
        setApplicationStatus(applicationData?.status ?? 'draft')
      } catch (error: any) {
        console.error(
          '[TempStaff Worker] Failed to load onboarding:',
          error
        )
        Alert.alert(
          'Unable to load onboarding',
          error?.message || 'Please try again.'
        )
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds(current =>
      current.includes(serviceId)
        ? current.filter(id => id !== serviceId)
        : [...current, serviceId]
    )
  }

  const captureLocation = async () => {
    try {
      const permission =
        await Location.requestForegroundPermissionsAsync()

      if (
        permission.status !==
        Location.PermissionStatus.GRANTED
      ) {
        Alert.alert(
          'Location permission required',
          'Please allow location access so TempStaff can use your work location.'
        )
        return
      }

      const current =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        })

      setLatitude(current.coords.latitude)
      setLongitude(current.coords.longitude)

      Alert.alert(
        'Location captured',
        `${current.coords.latitude.toFixed(5)}, ${current.coords.longitude.toFixed(5)}`
      )
    } catch (error: any) {
      Alert.alert(
        'Unable to get location',
        error?.message || 'Please try again.'
      )
    }
  }

  const validateStep = () => {
    if (step === 1) {
      if (!dateOfBirth.trim() || !gender) {
        Alert.alert(
          'Missing information',
          'Enter your date of birth and select your gender.'
        )
        return false
      }

      return true
    }

    if (step === 2) {
      if (
        !currentAddress.trim() ||
        !city.trim() ||
        !state.trim() ||
        !/^\d{6}$/.test(pincode)
      ) {
        Alert.alert(
          'Invalid address',
          'Complete your current address, city, state and 6-digit PIN code.'
        )
        return false
      }

      return true
    }

    if (step === 3) {
      const years = Number(experienceYears)

      if (
        !experienceYears.trim() ||
        !Number.isFinite(years) ||
        years < 0
      ) {
        Alert.alert(
          'Experience required',
          'Enter a valid number of years of experience.'
        )
        return false
      }

      if (selectedServiceIds.length === 0) {
        Alert.alert(
          'Select a service',
          'Choose at least one service you can work.'
        )
        return false
      }

      if (latitude == null || longitude == null) {
        Alert.alert(
          'Work location required',
          'Use your current location before continuing.'
        )
        return false
      }

      return true
    }

    if (!consent) {
      Alert.alert(
        'Consent required',
        'Please accept the worker onboarding declaration.'
      )
      return false
    }

    return true
  }

  const saveProgress = async (nextStep: Step) => {
    if (saving || !validateStep()) {
      return
    }

    try {
      setSaving(true)

      const { error } = await supabase.rpc(
        'save_worker_onboarding',
        {
          p_date_of_birth: dateOfBirth.trim() || null,
          p_gender: gender || null,
          p_current_address:
            currentAddress.trim() || null,
          p_permanent_address:
            permanentAddress.trim() || null,
          p_city: city.trim() || null,
          p_state: state.trim() || null,
          p_pincode: pincode || null,
          p_experience_years: experienceYears
            ? Number(experienceYears)
            : null,
          p_experience_summary:
            experienceSummary.trim() || null,
          p_profile_photo_path: null,
          p_service_latitude: latitude,
          p_service_longitude: longitude,
          p_onboarding_step: nextStep,
        }
      )

      if (error) throw error

      const {
        error: servicesError,
      } = await supabase.rpc('set_worker_services', {
        p_service_ids: selectedServiceIds,
      })

      if (servicesError) throw servicesError

      if (nextStep === 4) {
        const {
          error: consentError,
        } = await supabase.rpc(
          'set_worker_onboarding_consent'
        )

        if (consentError) throw consentError

        setConsent(true)
      }

      setStep(nextStep)

      if (nextStep === 4) {
        Alert.alert(
          'Profile saved',
          'Your profile information is complete. The next onboarding stage is document verification.'
        )
      }
    } catch (error: any) {
      console.error(
        '[TempStaff Worker] Failed to save onboarding:',
        error
      )

      Alert.alert(
        'Unable to save',
        error?.message || 'Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.muted}>
            Loading onboarding...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  const statusMessage =
    applicationStatus === 'submitted' ||
    applicationStatus === 'under_review'
      ? 'Your application is under review. You can still update your profile while completing onboarding.'
      : applicationStatus === 'changes_required'
        ? 'TempStaff requested changes. Review your information and continue onboarding.'
        : applicationStatus === 'rejected'
          ? 'Your application was rejected. Please contact TempStaff support before reapplying.'
          : 'Complete your worker profile to continue.'

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>
              TEMPSTAFF WORKER
            </Text>
            <Text style={styles.title}>
              Complete your profile
            </Text>
          </View>

          <Text style={styles.progress}>
            {progress}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${step * 25}%` },
            ]}
          />
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>
            {applicationStatus === 'draft'
              ? 'Onboarding'
              : applicationStatus.replace('_', ' ')}
          </Text>
          <Text style={styles.statusText}>
            {statusMessage}
          </Text>
        </View>

        {step === 1 && (
          <Section
            title="Personal details"
            subtitle="These details are used for worker verification."
          >
            <Field
              label="Date of birth"
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              placeholder="YYYY-MM-DD"
            />

            <Text style={styles.label}>
              Gender
            </Text>

            <View style={styles.choiceRow}>
              {[
                'male',
                'female',
                'other',
                'prefer_not_to_say',
              ].map(option => {
                const selected = gender === option

                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.choice,
                      selected &&
                        styles.choiceSelected,
                    ]}
                    onPress={() =>
                      setGender(option)
                    }
                    disabled={saving}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        selected &&
                          styles.choiceTextSelected,
                      ]}
                    >
                      {option ===
                      'prefer_not_to_say'
                        ? 'Prefer not to say'
                        : option[0].toUpperCase() +
                          option.slice(1)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </Section>
        )}

        {step === 2 && (
          <Section
            title="Address"
            subtitle="Keep this information accurate for verification and support."
          >
            <Field
              label="Current address"
              value={currentAddress}
              onChangeText={setCurrentAddress}
              placeholder="House / street / locality"
              multiline
            />

            <Field
              label="Permanent address"
              value={permanentAddress}
              onChangeText={
                setPermanentAddress
              }
              placeholder="Optional if same as current"
              multiline
            />

            <Field
              label="City"
              value={city}
              onChangeText={setCity}
              placeholder="City"
            />

            <Field
              label="State"
              value={state}
              onChangeText={setState}
              placeholder="State"
            />

            <Field
              label="PIN code"
              value={pincode}
              onChangeText={text =>
                setPincode(
                  text
                    .replace(/\D/g, '')
                    .slice(0, 6)
                )
              }
              placeholder="6-digit PIN"
              keyboardType="number-pad"
            />
          </Section>
        )}

        {step === 3 && (
          <>
            <Section
              title="Experience & services"
              subtitle="Tell us what work you can accept."
            >
              <Field
                label="Experience (years)"
                value={experienceYears}
                onChangeText={text =>
                  setExperienceYears(
                    text.replace(
                      /[^0-9.]/g,
                      ''
                    )
                  )
                }
                placeholder="e.g. 2"
                keyboardType="decimal-pad"
              />

              <Field
                label="Experience summary"
                value={experienceSummary}
                onChangeText={
                  setExperienceSummary
                }
                placeholder="Briefly describe your experience"
                multiline
              />

              <Text style={styles.label}>
                Services you can work
              </Text>

              <View style={styles.serviceGrid}>
                {services.map(service => {
                  const selected =
                    selectedServiceIds.includes(
                      service.id
                    )

                  return (
                    <TouchableOpacity
                      key={service.id}
                      style={[
                        styles.serviceChip,
                        selected &&
                          styles.serviceChipSelected,
                      ]}
                      onPress={() =>
                        toggleService(
                          service.id
                        )
                      }
                      disabled={saving}
                    >
                      <Text
                        style={[
                          styles.serviceChipText,
                          selected &&
                            styles.serviceChipTextSelected,
                        ]}
                      >
                        {service.name}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </Section>

            <Section
              title="Work location"
              subtitle="This location is used to match you with nearby customer bookings."
            >
              <TouchableOpacity
                style={styles.locationButton}
                onPress={captureLocation}
                disabled={saving}
              >
                <Text
                  style={styles.locationButtonText}
                >
                  Use my current location
                </Text>
              </TouchableOpacity>

              {latitude != null &&
                longitude != null && (
                  <View
                    style={styles.locationCard}
                  >
                    <Text
                      style={styles.locationTitle}
                    >
                      Work location captured
                    </Text>

                    <Text
                      style={styles.locationText}
                    >
                      {latitude.toFixed(5)},{' '}
                      {longitude.toFixed(5)}
                    </Text>

                    <Text
                      style={styles.locationHint}
                    >
                      Worker matching uses the booking/service location, not the customer's phone location.
                    </Text>
                  </View>
                )}
            </Section>
          </>
        )}

        {step === 4 && (
          <Section
            title="Declaration"
            subtitle="Review your profile before the document-verification stage."
          >
            <View style={styles.reviewCard}>
              <ReviewRow
                label="Date of birth"
                value={dateOfBirth}
              />
              <ReviewRow
                label="Gender"
                value={gender}
              />
              <ReviewRow
                label="City / State"
                value={`${city}, ${state}`}
              />
              <ReviewRow
                label="PIN code"
                value={pincode}
              />
              <ReviewRow
                label="Experience"
                value={`${experienceYears} years`}
              />
              <ReviewRow
                label="Work location"
                value={
                  latitude != null &&
                  longitude != null
                    ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
                    : 'Not set'
                }
              />
              <ReviewRow
                label="Services"
                value={`${selectedServiceIds.length} selected`}
                last
              />
            </View>

            <TouchableOpacity
              style={styles.consentRow}
              onPress={() =>
                setConsent(current => !current)
              }
              disabled={saving}
            >
              <View
                style={[
                  styles.checkbox,
                  consent &&
                    styles.checkboxSelected,
                ]}
              >
                {consent && (
                  <Text style={styles.checkmark}>
                    ✓
                  </Text>
                )}
              </View>

              <Text style={styles.consentText}>
                I confirm that the information I have provided is accurate and I consent to TempStaff verifying my worker application.
              </Text>
            </TouchableOpacity>
          </Section>
        )}

        <View style={styles.actions}>
          {step > 1 && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() =>
                setStep((step - 1) as Step)
              }
              disabled={saving}
            >
              <Text style={styles.secondaryText}>
                Back
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              saving && styles.disabled,
            ]}
            onPress={() =>
              void saveProgress(
                step < 4
                  ? ((step + 1) as Step)
                  : 4
              )
            }
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryText}>
                {step < 4
                  ? 'Save & Continue'
                  : 'Save Profile'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Your worker account remains restricted until verification is completed.
        </Text>

        {applicationStatus ===
          'approved' && (
          <TouchableOpacity
            style={styles.dashboardButton}
            onPress={onComplete}
          >
            <Text
              style={styles.dashboardButtonText}
            >
              Continue to Worker Dashboard
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      <Text style={styles.sectionSubtitle}>
        {subtitle}
      </Text>

      {children}
    </View>
  )
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  multiline?: boolean
  keyboardType?:
    | 'default'
    | 'number-pad'
    | 'decimal-pad'
}) {
  return (
    <View>
      <Text style={styles.label}>
        {label}
      </Text>

      <TextInput
        style={[
          styles.input,
          multiline && styles.multiline,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#98A2B3"
        multiline={multiline}
        keyboardType={keyboardType}
        textAlignVertical={
          multiline ? 'top' : 'center'
        }
        editable
      />
    </View>
  )
}

function ReviewRow({
  label,
  value,
  last = false,
}: {
  label: string
  value: string
  last?: boolean
}) {
  return (
    <View
      style={[
        styles.reviewRow,
        last && styles.lastRow,
      ]}
    >
      <Text style={styles.reviewLabel}>
        {label}
      </Text>

      <Text style={styles.reviewValue}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FA',
  },
  content: {
    padding: 22,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  muted: {
    color: '#667085',
    fontSize: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
  },
  kicker: {
    color: '#0F766E',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: '#0B1F33',
    fontSize: 27,
    fontWeight: '800',
    marginTop: 5,
  },
  progress: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 5,
    marginLeft: 12,
  },
  progressTrack: {
    height: 7,
    backgroundColor: '#E5E7EB',
    borderRadius: 99,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0F766E',
    borderRadius: 99,
  },
  statusCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  statusTitle: {
    color: '#1E3A8A',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  statusText: {
    color: '#334155',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    color: '#0B1F33',
    fontSize: 19,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    marginBottom: 15,
  },
  label: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 7,
    marginTop: 10,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#D9DEE5',
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    color: '#0B1F33',
    fontSize: 15,
  },
  multiline: {
    height: 92,
    paddingTop: 13,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choice: {
    borderWidth: 1,
    borderColor: '#D9DEE5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  choiceSelected: {
    backgroundColor: '#0B1F33',
    borderColor: '#0B1F33',
  },
  choiceText: {
    color: '#0B1F33',
    fontSize: 12,
    fontWeight: '700',
  },
  choiceTextSelected: {
    color: '#FFFFFF',
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceChip: {
    borderWidth: 1,
    borderColor: '#D9DEE5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  serviceChipSelected: {
    backgroundColor: '#0B1F33',
    borderColor: '#0B1F33',
  },
  serviceChipText: {
    color: '#0B1F33',
    fontSize: 12,
    fontWeight: '700',
  },
  serviceChipTextSelected: {
    color: '#FFFFFF',
  },
  locationButton: {
    height: 52,
    borderRadius: 13,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  locationCard: {
    backgroundColor: '#ECFDF3',
    borderRadius: 13,
    padding: 13,
    marginTop: 12,
  },
  locationTitle: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '800',
  },
  locationText: {
    color: '#14532D',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  locationHint: {
    color: '#166534',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 13,
    overflow: 'hidden',
  },
  reviewRow: {
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 4,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  reviewLabel: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '700',
  },
  reviewValue: {
    color: '#0B1F33',
    fontSize: 14,
    fontWeight: '700',
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    gap: 11,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#98A2B3',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxSelected: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  consentText: {
    flex: 1,
    color: '#344054',
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  secondaryButton: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9DEE5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  secondaryText: {
    color: '#0B1F33',
    fontSize: 15,
    fontWeight: '800',
  },
  primaryButton: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#F28C28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.6,
  },
  footer: {
    color: '#98A2B3',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  dashboardButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  dashboardButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
})
