import { supabase } from '../../lib/supabase'

export type WorkerSupportCategory =
  | 'booking'
  | 'payment'
  | 'worker'
  | 'refund'
  | 'technical'

export type WorkerSupportTicketStatus =
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | string

export type WorkerSupportTicket = {
  id: string

  userId: string

  category: WorkerSupportCategory
  subject: string
  description: string

  bookingId: string | null

  paymentId: string | null

  workerId: string | null

  refundRequestId: string | null

  paymentRefundId: string | null

  status: WorkerSupportTicketStatus

  adminNotes: string | null

  resolvedAt: string | null

  createdAt: string
  updatedAt: string
}

export type CreateWorkerSupportTicketInput = {
  category: WorkerSupportCategory
  subject: string
  description: string
  bookingId?: string | null
}

type WorkerSupportTicketRow = {
  id: string
  user_id: string
  category: string
  subject: string
  description: string
  booking_id: string | null
  payment_id: string | null
  worker_id: string | null
  refund_request_id: string | null
  payment_refund_id: string | null
  status: string
  admin_notes: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

const SUPPORT_TICKET_SELECT = `
  id,
  user_id,
  category,
  subject,
  description,
  booking_id,
  payment_id,
  worker_id,
  refund_request_id,
  payment_refund_id,
  status,
  admin_notes,
  resolved_at,
  created_at,
  updated_at
`

const SUPPORT_CATEGORIES: WorkerSupportCategory[] = [
  'booking',
  'payment',
  'worker',
  'refund',
  'technical',
]

function mapSupportTicket(
  row: WorkerSupportTicketRow,
): WorkerSupportTicket {
  return {
    id:
      row.id,

    userId:
      row.user_id,

    category:
      row.category as WorkerSupportCategory,

    subject:
      row.subject,

    description:
      row.description,

    bookingId:
      row.booking_id,

    paymentId:
      row.payment_id,

    workerId:
      row.worker_id,

    refundRequestId:
      row.refund_request_id,

    paymentRefundId:
      row.payment_refund_id,

    status:
      row.status,

    adminNotes:
      row.admin_notes,

    resolvedAt:
      row.resolved_at,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
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

function validateCategory(
  category: WorkerSupportCategory,
): void {
  if (
    !SUPPORT_CATEGORIES.includes(
      category,
    )
  ) {
    throw new Error(
      'Invalid support ticket category.',
    )
  }
}

function normalizeRequiredText(
  value: string,
  fieldName: string,
): string {
  const normalized =
    value.trim()

  if (!normalized) {
    throw new Error(
      `${fieldName} is required.`,
    )
  }

  return normalized
}

function normalizeOptionalId(
  value: string | null | undefined,
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null
  }

  const normalized =
    value.trim()

  return normalized || null
}

function validateCreateInput(
  input: CreateWorkerSupportTicketInput,
): {
  category: WorkerSupportCategory
  subject: string
  description: string
  bookingId: string | null
} {
  validateCategory(
    input.category,
  )

  const subject =
    normalizeRequiredText(
      input.subject,
      'Ticket subject',
    )

  const description =
    normalizeRequiredText(
      input.description,
      'Ticket description',
    )

  const bookingId =
    normalizeOptionalId(
      input.bookingId,
    )

  if (
    input.category === 'booking' &&
    !bookingId
  ) {
    throw new Error(
      'Booking reference is required for a booking ticket.',
    )
  }

  return {
    category:
      input.category,

    subject,
    description,
    bookingId,
  }
}

export async function createWorkerSupportTicket(
  input: CreateWorkerSupportTicketInput,
): Promise<WorkerSupportTicket> {
  const normalized =
    validateCreateInput(
      input,
    )

  const workerId =
    await getCurrentWorkerId()

  const {
    data,
    error,
  } = await supabase.rpc(
    'create_worker_support_ticket',
    {
      p_category:
        normalized.category,

      p_subject:
        normalized.subject,

      p_description:
        normalized.description,

      p_booking_id:
        normalized.bookingId,
    },
  )

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Support ticket could not be created.',
    )
  }

  const ticket =
    mapSupportTicket(
      data as unknown as WorkerSupportTicketRow,
    )

  if (
    ticket.userId !==
    workerId
  ) {
    throw new Error(
      'Support ticket belongs to a different worker account.',
    )
  }

  return ticket
}

export async function getWorkerSupportTickets(
  limit = 50,
): Promise<WorkerSupportTicket[]> {
  const workerId =
    await getCurrentWorkerId()

  if (
    !Number.isFinite(limit) ||
    !Number.isInteger(limit)
  ) {
    throw new Error(
      'Support ticket limit must be a whole number.',
    )
  }

  const safeLimit =
    Math.max(
      1,
      Math.min(
        limit,
        200,
      ),
    )

  const {
    data,
    error,
  } = await supabase
    .from('support_tickets')
    .select(
      SUPPORT_TICKET_SELECT,
    )
    .eq(
      'user_id',
      workerId,
    )
    .order('created_at', {
      ascending: false,
    })
    .limit(
      safeLimit,
    )

  if (error) {
    throw error
  }

  return (
    data ?? []
  ).map(
    (row) =>
      mapSupportTicket(
        row as WorkerSupportTicketRow,
      ),
  )
}

export async function getWorkerSupportTicket(
  ticketId: string,
): Promise<WorkerSupportTicket | null> {
  const normalizedId =
    normalizeRequiredText(
      ticketId,
      'Support ticket id',
    )

  const workerId =
    await getCurrentWorkerId()

  const {
    data,
    error,
  } = await supabase
    .from('support_tickets')
    .select(
      SUPPORT_TICKET_SELECT,
    )
    .eq(
      'id',
      normalizedId,
    )
    .eq(
      'user_id',
      workerId,
    )
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
    ? mapSupportTicket(
        data as WorkerSupportTicketRow,
      )
    : null
}

export async function getWorkerSupportTicketsForBooking(
  bookingId: string,
): Promise<WorkerSupportTicket[]> {
  const normalizedBookingId =
    normalizeRequiredText(
      bookingId,
      'Booking id',
    )

  const workerId =
    await getCurrentWorkerId()

  const {
    data,
    error,
  } = await supabase
    .from('support_tickets')
    .select(
      SUPPORT_TICKET_SELECT,
    )
    .eq(
      'user_id',
      workerId,
    )
    .eq(
      'booking_id',
      normalizedBookingId,
    )
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    throw error
  }

  return (
    data ?? []
  ).map(
    (row) =>
      mapSupportTicket(
        row as WorkerSupportTicketRow,
      ),
  )
}

export function isOpenWorkerSupportTicket(
  ticket: WorkerSupportTicket,
): boolean {
  return (
    ticket.status ===
      'open' ||
    ticket.status ===
      'in_progress'
  )
}

export function getWorkerSupportCategoryLabel(
  category: WorkerSupportCategory,
): string {
  switch (category) {
    case 'booking':
      return 'Booking'

    case 'payment':
      return 'Payment'

    case 'worker':
      return 'Worker Account'

    case 'refund':
      return 'Refund'

    case 'technical':
      return 'Technical Issue'
  }
}