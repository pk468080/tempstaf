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

type WorkerOnboardingProfileWithPhoto =
  WorkerOnboardingProfile & {
    profilePhotoPath: string | null
  }

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
): WorkerOnboardingProfileWithPhoto {
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

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return false
  }

  const [
    year,
    month,
    day,
  ] = value
    .split('-')
    .map(Number)

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  )

  return (
    date.getUTCFullYear() ===
      year &&
    date.getUTCMonth() ===
      month - 1 &&
    date.getUTCDate() ===
      day
  )
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
      input.gender as (typeof ALLOWED_GENDERS)[number],
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

function mergeOnboardingInput(
  existing: WorkerOnboardingProfileWithPhoto | null,
  input: WorkerOnboardingInput,
) {
  return {
    dateOfBirth:
      input.dateOfBirth !== undefined
        ? input.dateOfBirth
        : existing?.dateOfBirth ?? null,

    gender:
      input.gender !== undefined
        ? normalizeOptionalText(input.gender)
        : existing?.gender ?? null,

    currentAddress:
      input.currentAddress !== undefined
        ? normalizeOptionalText(input.currentAddress)
        : existing?.currentAddress ?? null,

    permanentAddress:
      input.permanentAddress !== undefined
        ? normalizeOptionalText(input.permanentAddress)
        : existing?.permanentAddress ?? null,

    city:
      input.city !== undefined
        ? normalizeOptionalText(input.city)
        : existing?.city ?? null,

    state:
      input.state !== undefined
        ? normalizeOptionalText(input.state)
        : existing?.state ?? null,

    pincode:
      input.pincode !== undefined
        ? normalizeOptionalText(input.pincode)
        : existing?.pincode ?? null,

    experienceYears:
      input.experienceYears !== undefined
        ? input.experienceYears
        : existing?.experienceYears ?? null,

    experienceSummary:
      input.experienceSummary !== undefined
        ? normalizeOptionalText(input.experienceSummary)
        : existing?.experienceSummary ?? null,

    profilePhotoPath:
      input.profilePhotoPath !== undefined
        ? normalizeOptionalText(input.profilePhotoPath)
        : existing?.profilePhotoPath ?? null,

    serviceLatitude:
      input.serviceLatitude !== undefined
        ? input.serviceLatitude
        : existing?.serviceLatitude ?? null,

    serviceLongitude:
      input.serviceLongitude !== undefined
        ? input.serviceLongitude
        : existing?.serviceLongitude ?? null,

    onboardingStep:
      input.onboardingStep !== undefined
        ? input.onboardingStep
        : existing?.onboardingStep ?? 1,
  }
}

export async function getWorkerOnboardingProfile(): Promise<
  WorkerOnboardingProfileWithPhoto | null
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
): Promise<WorkerOnboardingProfileWithPhoto> {
  validateInput(input)

  const existing =
    await getWorkerOnboardingProfile()

  const merged =
    mergeOnboardingInput(existing, input)

  const {
    data,
    error,
  } = await supabase.rpc(
    'save_worker_onboarding',
    {
      p_date_of_birth:
        merged.dateOfBirth,

      p_gender:
        merged.gender,

      p_current_address:
        merged.currentAddress,

      p_permanent_address:
        merged.permanentAddress,

      p_city:
        merged.city,

      p_state:
        merged.state,

      p_pincode:
        merged.pincode,

      p_experience_years:
        merged.experienceYears,

      p_experience_summary:
        merged.experienceSummary,

      p_profile_photo_path:
        merged.profilePhotoPath,

      p_service_latitude:
        merged.serviceLatitude,

      p_service_longitude:
        merged.serviceLongitude,

      p_onboarding_step:
        merged.onboardingStep,
    },
  )

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Worker onboarding profile could not be saved.',
    )
  }

  return getWorkerOnboardingProfile().then(
    (profile) => {
      if (!profile) {
        throw new Error(
          'Worker onboarding profile could not be loaded after saving.',
        )
      }

      return profile
    },
  )
}

export async function updateWorkerOnboardingStep(
  onboardingStep: number,
): Promise<WorkerOnboardingProfileWithPhoto> {
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