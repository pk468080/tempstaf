import { supabase } from '../../lib/supabase'

import type {
  WorkerOnboardingProfile,
} from '../../types/application'

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
  service_latitude: number | null
  service_longitude: number | null
  onboarding_step: number
  consent_at: string | null
}

type WorkerOnboardingProfileWithConsent =
  WorkerOnboardingProfile & {
    consentAt: string | null
  }

function mapOnboardingProfile(
  row: OnboardingProfileRow,
): WorkerOnboardingProfileWithConsent {
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

async function getWorkerOnboardingProfileRow(
  workerId: string,
): Promise<OnboardingProfileRow | null> {
  const {
    data,
    error,
  } = await supabase
    .from('worker_onboarding_profiles')
    .select(
      'date_of_birth, gender, current_address, permanent_address, city, state, pincode, experience_years, experience_summary, service_latitude, service_longitude, onboarding_step, consent_at',
    )
    .eq('worker_id', workerId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function getWorkerConsentStatus(): Promise<{
  hasConsent: boolean
  consentAt: string | null
}> {
  const workerId = await getCurrentWorkerId()

  const profile =
    await getWorkerOnboardingProfileRow(workerId)

  if (!profile) {
    return {
      hasConsent: false,
      consentAt: null,
    }
  }

  return {
    hasConsent: profile.consent_at !== null,
    consentAt: profile.consent_at,
  }
}

export async function setWorkerConsent(): Promise<
  WorkerOnboardingProfileWithConsent
> {
  const workerId = await getCurrentWorkerId()

  const existingProfile =
    await getWorkerOnboardingProfileRow(workerId)

  if (!existingProfile) {
    throw new Error(
      'Complete worker onboarding details before giving consent.',
    )
  }

  const { error } = await supabase.rpc(
    'set_worker_onboarding_consent',
    {},
  )

  if (error) {
    throw error
  }

  const updatedProfile =
    await getWorkerOnboardingProfileRow(workerId)

  if (!updatedProfile) {
    throw new Error(
      'Worker consent was recorded but the onboarding profile could not be loaded.',
    )
  }

  return mapOnboardingProfile(updatedProfile)
}

export async function clearLocalConsentState(): Promise<void> {
  // Consent is server-controlled and cannot be removed
  // through the worker app. This function intentionally
  // performs no database mutation.
  return Promise.resolve()
}