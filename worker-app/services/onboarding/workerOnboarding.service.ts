import { supabase } from '../../lib/supabase'

import type {
  WorkerOnboardingProfile,
} from '../../types/application'

export type WorkerOnboardingInput = {
  dateOfBirth?: string | null
  gender?: string | null

  currentAddress?: string | null
  permanentAddress?: string | null

  city?: string | null
  state?: string | null
  pincode?: string | null

  experienceYears?: number | null
  experienceSummary?: string | null

  profilePhotoPath?: string | null

  serviceLatitude?: number | null
  serviceLongitude?: number | null

  onboardingStep?: number
}

export type WorkerOnboardingRequiredField =
  | 'dateOfBirth'
  | 'gender'
  | 'currentAddress'
  | 'city'
  | 'state'
  | 'pincode'
  | 'experienceYears'
  | 'serviceLatitude'
  | 'serviceLongitude'

const REQUIRED_FIELDS: WorkerOnboardingRequiredField[] = [
  'dateOfBirth',
  'gender',
  'currentAddress',
  'city',
  'state',
  'pincode',
  'experienceYears',
  'serviceLatitude',
  'serviceLongitude',
]

const ALLOWED_GENDERS = [
  'male',
  'female',
  'other',
  'prefer_not_to_say',
] as const

type OnboardingProfileRow = {
  date_of_birth: string | null
  gender: string | null
  current_address: string | null
  permanent_address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  experience_years: number | null
  experience_summary: string | null
  profile_photo_path: string | null
  service_latitude: number | null
  service_longitude: number | null
  onboarding_step: number
  consent_at: string | null
}

function mapOnboardingProfile(
  row: OnboardingProfileRow,
): WorkerOnboardingProfile & {
  profilePhotoPath: string | null
} {
  return {
    dateOfBirth: row.date_of_birth,
    gender: row.gender,

    currentAddress: row.current_address,
    permanentAddress: row.permanent_address,

    city: row.city,
    state: row.state,
    pincode: row.pincode,

    experienceYears:
      row.experience_years === null
        ? null
        : Number(row.experience_years),

    experienceSummary: row.experience_summary,

    profilePhotoPath: row.profile_photo_path,

    serviceLatitude:
      row.service_latitude === null
        ? null
        : Number(row.service_latitude),

    serviceLongitude:
      row.service_longitude === null
        ? null
        : Number(row.service_longitude),

    onboardingStep: Number(row.onboarding_step),

    consentAt: row.consent_at,
  }
}

async function getCurrentWorkerId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  if (!user) {
    throw new Error(
      'A worker authentication session is required.',
    )
  }

  return user.id
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined) {
    return null
  }

  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
}

function validateDateOfBirth(
  value: string | null | undefined,
): boolean {
  if (!value) {
    return true
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function validatePincode(
  value: string | null | undefined,
): boolean {
  if (!value) {
    return true
  }

  return /^\d{6}$/.test(value)
}

function validateCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): boolean {
  if (
    latitude === null ||
    latitude === undefined ||
    longitude === null ||
    longitude === undefined
  ) {
    return true
  }

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  )
}

function validateInput(
  input: WorkerOnboardingInput,
): void {
  if (!validateDateOfBirth(input.dateOfBirth)) {
    throw new Error(
      'Date of birth must use YYYY-MM-DD format.',
    )
  }

  if (
    input.gender &&
    !ALLOWED_GENDERS.includes(
      input.gender as (
        typeof ALLOWED_GENDERS
      )[number],
    )
  ) {
    throw new Error(
      'Please select a valid gender.',
    )
  }

  if (!validatePincode(input.pincode)) {
    throw new Error(
      'Pincode must contain 6 digits.',
    )
  }

  if (
    input.experienceYears !== null &&
    input.experienceYears !== undefined &&
    (
      !Number.isFinite(input.experienceYears) ||
      input.experienceYears < 0
    )
  ) {
    throw new Error(
      'Experience years must be a valid non-negative number.',
    )
  }

  if (
    input.onboardingStep !== undefined &&
    (
      !Number.isInteger(input.onboardingStep) ||
      input.onboardingStep < 1 ||
      input.onboardingStep > 8
    )
  ) {
    throw new Error(
      'Onboarding step must be between 1 and 8.',
    )
  }

  if (
    !validateCoordinates(
      input.serviceLatitude,
      input.serviceLongitude,
    )
  ) {
    throw new Error(
      'Service location coordinates are invalid.',
    )
  }
}

export async function getWorkerOnboardingProfile(): Promise<
  (WorkerOnboardingProfile & {
    profilePhotoPath: string | null
  }) | null
> {
  const workerId = await getCurrentWorkerId()

  const {
    data,
    error,
  } = await supabase
    .from('worker_onboarding_profiles')
    .select(
      'date_of_birth, gender, current_address, permanent_address, city, state, pincode, experience_years, experience_summary, profile_photo_path, service_latitude, service_longitude, onboarding_step, consent_at',
    )
    .eq('worker_id', workerId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
    ? mapOnboardingProfile(data)
    : null
}

export async function saveWorkerOnboarding(
  input: WorkerOnboardingInput,
): Promise<
  WorkerOnboardingProfile & {
    profilePhotoPath: string | null
  }
> {
  validateInput(input)

  const params = {
    p_date_of_birth:
      input.dateOfBirth ?? null,

    p_gender:
      normalizeOptionalText(input.gender),

    p_current_address:
      normalizeOptionalText(input.currentAddress),

    p_permanent_address:
      normalizeOptionalText(input.permanentAddress),

    p_city:
      normalizeOptionalText(input.city),

    p_state:
      normalizeOptionalText(input.state),

    p_pincode:
      normalizeOptionalText(input.pincode),

    p_experience_years:
      input.experienceYears ?? null,

    p_experience_summary:
      normalizeOptionalText(input.experienceSummary),

    p_profile_photo_path:
      normalizeOptionalText(input.profilePhotoPath),

    p_service_latitude:
      input.serviceLatitude ?? null,

    p_service_longitude:
      input.serviceLongitude ?? null,

    p_onboarding_step:
      input.onboardingStep ?? 1,
  }

  const { error } = await supabase.rpc(
    'save_worker_onboarding',
    params,
  )

  if (error) {
    throw error
  }

  const profile =
    await getWorkerOnboardingProfile()

  if (!profile) {
    throw new Error(
      'Worker onboarding profile could not be loaded after saving.',
    )
  }

  return profile
}

export async function updateWorkerOnboardingStep(
  onboardingStep: number,
): Promise<
  WorkerOnboardingProfile & {
    profilePhotoPath: string | null
  }
> {
  return saveWorkerOnboarding({
    onboardingStep,
  })
}

export function getMissingRequiredFields(
  profile: WorkerOnboardingProfile | null,
): WorkerOnboardingRequiredField[] {
  if (!profile) {
    return [...REQUIRED_FIELDS]
  }

  const missing: WorkerOnboardingRequiredField[] = []

  if (!profile.dateOfBirth) {
    missing.push('dateOfBirth')
  }

  if (!profile.gender) {
    missing.push('gender')
  }

  if (!profile.currentAddress) {
    missing.push('currentAddress')
  }

  if (!profile.city) {
    missing.push('city')
  }

  if (!profile.state) {
    missing.push('state')
  }

  if (!profile.pincode) {
    missing.push('pincode')
  }

  if (
    profile.experienceYears === null ||
    profile.experienceYears === undefined
  ) {
    missing.push('experienceYears')
  }

  if (
    profile.serviceLatitude === null ||
    profile.serviceLatitude === undefined
  ) {
    missing.push('serviceLatitude')
  }

  if (
    profile.serviceLongitude === null ||
    profile.serviceLongitude === undefined
  ) {
    missing.push('serviceLongitude')
  }

  return missing
}

export function isWorkerOnboardingComplete(
  profile: WorkerOnboardingProfile | null,
): boolean {
  return getMissingRequiredFields(profile).length === 0
}

export function getOnboardingProgress(
  profile: WorkerOnboardingProfile | null,
): number {
  if (!profile) {
    return 0
  }

  const missingCount =
    getMissingRequiredFields(profile).length

  const completedCount =
    REQUIRED_FIELDS.length - missingCount

  return completedCount / REQUIRED_FIELDS.length
}