// worker-app/types/application.ts

export type WorkerApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'changes_required'
  | 'approved'
  | 'rejected'

export type WorkerOnboardingType =
  | 'self_registered'
  | 'admin_created'

export type WorkerApplication = {
  id: string
  workerId: string

  onboardingType: WorkerOnboardingType

  status: WorkerApplicationStatus

  submittedAt: string | null
  reviewedAt: string | null

  reviewNotes: string | null
  reapplyAfter: string | null

  createdAt: string
  updatedAt: string
}

export type WorkerOnboardingProfile = {
  dateOfBirth: string | null
  gender: string | null

  currentAddress: string | null
  permanentAddress: string | null

  city: string | null
  state: string | null
  pincode: string | null

  experienceYears: number | null
  experienceSummary: string | null

  serviceLatitude: number | null
  serviceLongitude: number | null

  onboardingStep: number

  consentAt: string | null
}

export type WorkerApplicationWithProfile =
  WorkerApplication & {
    onboardingProfile: WorkerOnboardingProfile | null
  }

export type WorkerApplicationReview = {
  applicationId: string

  status:
    | 'approved'
    | 'rejected'
    | 'changes_required'

  notes: string | null

  reviewedAt: string | null
}