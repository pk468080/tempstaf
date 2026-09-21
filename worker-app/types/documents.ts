// worker-app/types/documents.ts

export type WorkerDocumentType =
  | 'aadhaar'
  | 'pan'
  | 'passport_photo'
  | 'address_proof'
  | 'police_verification'
  | 'bank_account'

export type WorkerDocumentStatus =
  | 'pending'
  | 'approved'
  | 'rejected'

export type WorkerDocument = {
  id: string

  applicationId: string
  workerId: string

  documentType: WorkerDocumentType

  filePath: string
  fileName: string | null
  mimeType: string | null
  fileSize: number | null

  status: WorkerDocumentStatus

  rejectionReason: string | null

  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export type WorkerDocumentRequirement = {
  type: WorkerDocumentType
  title: string
  description: string
  required: boolean
  photoOnly?: boolean
}

export type WorkerDocumentUpload = {
  documentType: WorkerDocumentType

  filePath: string
  fileName: string
  mimeType: string
  fileSize: number | null
}

export type WorkerDocumentReview = {
  documentId: string

  status:
    | 'approved'
    | 'rejected'

  rejectionReason?: string | null
}

export const WORKER_DOCUMENT_REQUIREMENTS: WorkerDocumentRequirement[] = [
  {
    type: 'passport_photo',
    title: 'Profile / Passport Photo',
    description:
      'Recent clear photo of your face. JPG or PNG.',
    required: true,
    photoOnly: true,
  },
  {
    type: 'aadhaar',
    title: 'Aadhaar',
    description:
      'Upload a clear Aadhaar document. JPG, PNG or PDF.',
    required: true,
  },
  {
    type: 'pan',
    title: 'PAN',
    description:
      'Upload a clear PAN card. JPG, PNG or PDF.',
    required: true,
  },
  {
    type: 'address_proof',
    title: 'Address Proof',
    description:
      'Upload an accepted address-proof document.',
    required: true,
  },
  {
    type: 'police_verification',
    title: 'Police Verification',
    description:
      'Upload your police verification document.',
    required: true,
  },
  {
    type: 'bank_account',
    title: 'Bank Account / Cancelled Cheque',
    description:
      'Upload a clear bank proof document.',
    required: true,
  },
]

export const WORKER_DOCUMENT_MAX_FILE_SIZE =
  10 * 1024 * 1024

export const WORKER_DOCUMENT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
] as const