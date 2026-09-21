import { supabase } from '../../lib/supabase'

import type {
  WorkerDocument,
  WorkerDocumentType,
  WorkerDocumentUpload,
} from '../../types/documents'

import {
  WORKER_DOCUMENT_ALLOWED_MIME_TYPES,
  WORKER_DOCUMENT_MAX_FILE_SIZE,
} from '../../types/documents'

const STORAGE_BUCKET = 'worker-documents'

type WorkerDocumentRow = {
  id: string
  application_id: string
  worker_id: string
  document_type: WorkerDocumentType
  file_path: string
  file_name: string | null
  mime_type: string | null
  file_size: number | null
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

function mapWorkerDocument(
  row: WorkerDocumentRow,
): WorkerDocument {
  return {
    id: row.id,
    applicationId: row.application_id,
    workerId: row.worker_id,
    documentType: row.document_type,
    filePath: row.file_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize:
      row.file_size === null
        ? null
        : Number(row.file_size),
    status: row.status,
    rejectionReason: row.rejection_reason,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

function sanitizeFileName(
  fileName: string,
): string {
  const sanitized = fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')

  return sanitized || 'document'
}

function getFileExtension(
  fileName: string,
): string {
  const lastDot = fileName.lastIndexOf('.')

  if (lastDot === -1) {
    return ''
  }

  return fileName
    .slice(lastDot)
    .toLowerCase()
}

function validateDocumentType(
  documentType: WorkerDocumentType,
): void {
  const allowedTypes: WorkerDocumentType[] = [
    'aadhaar',
    'pan',
    'passport_photo',
    'address_proof',
    'police_verification',
    'bank_account',
  ]

  if (!allowedTypes.includes(documentType)) {
    throw new Error(
      'Unsupported worker document type.',
    )
  }
}

function validateMimeType(
  mimeType: string,
): void {
  if (
    !WORKER_DOCUMENT_ALLOWED_MIME_TYPES.includes(
      mimeType as (
        typeof WORKER_DOCUMENT_ALLOWED_MIME_TYPES
      )[number],
    )
  ) {
    throw new Error(
      'Only JPG, PNG and PDF files are supported.',
    )
  }
}

function validateFileSize(
  fileSize: number | null,
): void {
  if (fileSize === null) {
    return
  }

  if (
    !Number.isFinite(fileSize) ||
    fileSize <= 0
  ) {
    throw new Error(
      'File size must be greater than zero.',
    )
  }

  if (fileSize > WORKER_DOCUMENT_MAX_FILE_SIZE) {
    throw new Error(
      'Document size cannot exceed 10 MB.',
    )
  }
}

function buildStoragePath(
  workerId: string,
  documentType: WorkerDocumentType,
  fileName: string,
): string {
  const safeFileName =
    sanitizeFileName(fileName)

  const extension =
    getFileExtension(safeFileName)

  const baseName =
    safeFileName
      .replace(/\.[^/.]+$/, '')
      .slice(0, 80) || 'document'

  return [
    workerId,
    documentType,
    `${baseName}-${Date.now()}${extension}`,
  ].join('/')
}

export async function getWorkerDocuments(): Promise<
  WorkerDocument[]
> {
  const workerId = await getCurrentWorkerId()

  const {
    data,
    error,
  } = await supabase
    .from('worker_documents')
    .select(
      'id, application_id, worker_id, document_type, file_path, file_name, mime_type, file_size, status, rejection_reason, reviewed_at, created_at, updated_at',
    )
    .eq('worker_id', workerId)
    .order('created_at', {
      ascending: true,
    })

  if (error) {
    throw error
  }

  return (data ?? []).map(
    mapWorkerDocument,
  )
}

export async function getWorkerDocument(
  documentType: WorkerDocumentType,
): Promise<WorkerDocument | null> {
  validateDocumentType(documentType)

  const workerId = await getCurrentWorkerId()

  const {
    data,
    error,
  } = await supabase
    .from('worker_documents')
    .select(
      'id, application_id, worker_id, document_type, file_path, file_name, mime_type, file_size, status, rejection_reason, reviewed_at, created_at, updated_at',
    )
    .eq('worker_id', workerId)
    .eq('document_type', documentType)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
    ? mapWorkerDocument(data)
    : null
}

export async function uploadWorkerDocument(
  upload: WorkerDocumentUpload,
): Promise<WorkerDocument> {
  validateDocumentType(
    upload.documentType,
  )

  validateMimeType(
    upload.mimeType,
  )

  validateFileSize(
    upload.fileSize,
  )

  if (!upload.filePath) {
    throw new Error(
      'A document file is required.',
    )
  }

  if (!upload.fileName) {
    throw new Error(
      'A document file name is required.',
    )
  }

  const workerId = await getCurrentWorkerId()

  const existingDocument =
    await getWorkerDocument(
      upload.documentType,
    )

  const storagePath =
    buildStoragePath(
      workerId,
      upload.documentType,
      upload.fileName,
    )

  const response = await fetch(
    upload.filePath,
  )

  if (!response.ok) {
    throw new Error(
      'The selected document could not be read.',
    )
  }

  const fileData =
    await response.arrayBuffer()

  const actualFileSize =
    fileData.byteLength

  validateFileSize(
    actualFileSize,
  )

  const {
    error: uploadError,
  } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(
      storagePath,
      fileData,
      {
        contentType:
          upload.mimeType,
        upsert: false,
      },
    )

  if (uploadError) {
    throw uploadError
  }

  const {
    data: savedDocument,
    error: saveError,
  } = await supabase.rpc(
    'save_worker_document',
    {
      p_document_type:
        upload.documentType,

      p_file_path:
        storagePath,

      p_file_name:
        upload.fileName,

      p_mime_type:
        upload.mimeType,

      p_file_size:
        actualFileSize,
    },
  )

  if (saveError || !savedDocument) {
    await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath])

    if (saveError) {
      throw saveError
    }

    throw new Error(
      'The document was uploaded but could not be registered.',
    )
  }

  if (
    existingDocument &&
    existingDocument.filePath !== storagePath
  ) {
    const {
      error: cleanupError,
    } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([
        existingDocument.filePath,
      ])

    if (cleanupError) {
      console.warn(
        'Previous worker document could not be removed from storage:',
        cleanupError,
      )
    }
  }

  const document =
    await getWorkerDocument(
      upload.documentType,
    )

  if (!document) {
    throw new Error(
      'The document was saved but could not be loaded.',
    )
  }

  return document
}

export async function removeWorkerDocument(
  _documentType: WorkerDocumentType,
): Promise<void> {
  throw new Error(
    'Worker document deletion is not supported. Upload a replacement document instead.',
  )
}

export function isDocumentApproved(
  document: WorkerDocument | null,
): boolean {
  return document?.status === 'approved'
}

export function isDocumentPending(
  document: WorkerDocument | null,
): boolean {
  return document?.status === 'pending'
}

export function isDocumentRejected(
  document: WorkerDocument | null,
): boolean {
  return document?.status === 'rejected'
}