import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { adminAction } from '../lib/adminAction'

type Booking = {
  id: string
  customer_id: string
  worker_id: string | null
  service_id: string
  address_id: string
  service_variant_id: string
  status: string
  duration_value: number
  duration_unit: string
  scheduled_start: string
  scheduled_end: string
  base_amount: number | string
  platform_fee: number | string
  tax_amount: number | string
  total_amount: number | string
  notes: string | null
  created_at: string
  updated_at: string
  fulfillment_type: string
  worker_accepted_at: string | null
  schedule_start_date: string | null
  schedule_end_date: string | null
  daily_start_time: string | null
  daily_end_time: string | null
  selected_weekdays: string[] | null
  off_dates: string[] | null
  total_working_hours: number | string | null
  journey_started_at: string | null
  journey_started_by: string | null
  arrived_at: string | null
  started_at: string | null
  start_otp_verified_at: string | null
  completed_at: string | null
  end_otp_verified_at: string | null
}

type Customer = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
}

type Worker = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  worker_status: string | null
  is_verified: boolean | null
  rating: number | null
  total_completed_jobs: number | null
  service_radius_km: number | null
}

type Service = {
  id: string
  name: string
  description: string | null
  is_active: boolean
}

type Variant = {
  id: string
  name: string
  description: string | null
  billing_type: string | null
  duration_value: number | null
  duration_unit: string | null
  min_quantity: number | null
  max_quantity: number | null
  is_active: boolean
}

type Address = {
  id: string
  user_id: string
  label: string | null
  address_line: string | null
  latitude: number | null
  longitude: number | null
}

type Payment = {
  id: string
  booking_id: string
  provider: string
  provider_order_id: string | null
  provider_payment_id: string | null
  amount: number | string
  currency: string
  status: string
  paid_at: string | null
  created_at: string
  updated_at: string
}

type Refund = {
  id: string
  payment_id: string
  booking_id: string
  amount: number | string
  currency: string
  reason: string | null
  status: string
  provider_refund_id: string | null
  failure_reason: string | null
  requested_by: string | null
  requested_at: string
  processed_at: string | null
  created_at: string
  updated_at: string
  refund_request_id: string | null
}



type RefundRequest = {
  id: string
  booking_id: string
  payment_id: string
  amount: number | string
  currency: string
  status: string
  reason: string | null
  provider_refund_id: string | null
  requested_at: string
  processed_at: string | null
  created_at: string
  updated_at: string
}

type Occurrence = {
  id: string
  booking_id: string
  worker_id: string | null
  occurrence_index: number
  occurrence_date: string
  scheduled_start: string
  scheduled_end: string
  status: string
  created_at: string
  updated_at: string
  base_amount: number | string | null
  discount_amount: number | string | null
  platform_fee: number | string | null
  tax_amount: number | string | null
  total_amount: number | string | null
  journey_started_at: string | null
  arrived_at: string | null
  started_at: string | null
  start_otp_verified_at: string | null
  completed_at: string | null
  end_otp_verified_at: string | null
  original_occurrence_date: string | null
  last_modified_at: string | null
  last_modified_by: string | null
}
type StatusHistory = {
  id: string
  booking_id: string
  old_status: string
  new_status: string
  changed_by: string | null
  created_at: string
}

type AuditLog = {
  id: string
  admin_id: string | null
  action: string
  entity_type: string
  entity_id: string
  metadata: Record<string, unknown> | null
  created_at: string
}

type EligibleWorker = {
  worker_id: string
  worker_status: string | null
  rating: number | null
  total_completed_jobs: number | null
  distance_km: number | null
}

type BookingDetailPayload = {
  booking: Booking
  customer: Customer
  worker: Worker
  service: Service
  variant: Variant
  address: Address
  payment: Payment
  refunds: Refund[]
  refund_requests: RefundRequest[]
  occurrences: Occurrence[]
  status_history: StatusHistory[]
  audit_logs: AuditLog[]
}

export default function BookingDetail() {
  const { bookingId } = useParams()

  const [detail, setDetail] =
    useState<BookingDetailPayload | null>(null)

  const [eligibleWorkers, setEligibleWorkers] =
    useState<EligibleWorker[]>([])

  const [loading, setLoading] = useState(true)
  const [loadingWorkers, setLoadingWorkers] = useState(false)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadBooking() {
    if (!bookingId) {
      setError('Booking ID is missing.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    const { data, error: rpcError } =
      await adminAction<BookingDetailPayload>(
        'admin_get_booking_detail',
        {
          p_booking_id: bookingId,
        }
      )

    if (rpcError) {
      console.error(
        'Failed to load booking detail:',
        rpcError
      )

      setError(rpcError.message)
      setLoading(false)
      return
    }

    if (!data?.booking) {
      setError('Booking not found.')
      setLoading(false)
      return
    }

    setDetail(data)
    setEligibleWorkers([])
    setLoading(false)
  }

  useEffect(() => {
    loadBooking()
  }, [bookingId])

  async function findEligibleWorkers() {
    if (!bookingId) return

    setLoadingWorkers(true)
    setError('')
    setSuccess('')

    const {
      data,
      error: rpcError,
    } = await adminAction<EligibleWorker[]>(
      'get_eligible_workers',
      {
        p_booking_id: bookingId,
      }
    )

    setLoadingWorkers(false)

    if (rpcError) {
      setError(
        `Unable to find eligible workers: ${rpcError.message}`
      )
      return
    }

    setEligibleWorkers(data || [])

    if (!data?.length) {
      setSuccess(
        'No eligible workers were found for this booking.'
      )
    }
  }

  async function assignWorker(workerId: string) {
    if (!bookingId || !workerId || !detail) {
      return
    }

    const replacing = Boolean(
      detail.booking.worker_id
    )

    const confirmed = window.confirm(
      replacing
        ? 'Reassign this booking to the selected worker?'
        : 'Assign the selected worker to this booking?'
    )

    if (!confirmed) return

    setSaving(true)
    setError('')
    setSuccess('')

    const {
      data,
      error: rpcError,
    } = await adminAction(
      'admin_assign_booking_worker',
      {
        p_booking_id: bookingId,
        p_worker_id: workerId,
      }
    )

    setSaving(false)

    if (rpcError) {
      setError(
        `Worker assignment failed: ${rpcError.message}`
      )
      return
    }

    if (
      data &&
      typeof data === 'object' &&
      'success' in data &&
      data.success === false
    ) {
      setError(
        String(
          (
            data as {
              error?: string
            }
          ).error ||
            'Worker assignment failed.'
        )
      )
      return
    }

    setSuccess(
      replacing
        ? 'Worker reassigned successfully.'
        : 'Worker assigned successfully.'
    )

    await loadBooking()
  }

  async function cancelBooking() {
    if (!bookingId || !detail) return

    if (detail.booking.status === 'cancelled') {
      setError('This booking is already cancelled.')
      return
    }

    const reason = window.prompt(
      'Enter the cancellation reason (optional):'
    )

    if (reason === null) {
      return
    }

    const confirmed = window.confirm(
      'Cancel this booking as an administrator?'
    )

    if (!confirmed) return

    setSaving(true)
    setError('')
    setSuccess('')

    const {
      data,
      error: rpcError,
    } = await adminAction(
      'admin_cancel_booking',
      {
        p_booking_id: bookingId,
        p_reason: reason.trim() || null,
      }
    )

    setSaving(false)

    if (rpcError) {
      setError(
        `Booking cancellation failed: ${rpcError.message}`
      )
      return
    }

    if (
      data &&
      typeof data === 'object' &&
      'success' in data &&
      data.success === false
    ) {
      setError(
        String(
          (
            data as {
              error?: string
            }
          ).error ||
            'Booking cancellation failed.'
        )
      )
      return
    }

    setSuccess('Booking cancelled successfully.')
    await loadBooking()
  }

  const successfulRefundTotal = useMemo(() => {
    if (!detail) return 0

    return detail.refunds
      .filter(
        refund => refund.status === 'succeeded'
      )
      .reduce(
        (sum, refund) =>
          sum + Number(refund.amount || 0),
        0
      )
  }, [detail])

  const openRefunds = useMemo(() => {
    if (!detail) return 0

    return detail.refunds.filter(
      refund =>
        refund.status === 'pending' ||
        refund.status === 'processing'
    ).length
  }, [detail])

  if (loading) {
    return (
      <div style={styles.page}>
        <Link to="/bookings" style={styles.back}>
          ← Back to bookings
        </Link>

        <div style={styles.panel}>
          <strong>Loading booking...</strong>
        </div>
      </div>
    )
  }

  if (!detail) {
    return (
      <div style={styles.page}>
        <Link to="/bookings" style={styles.back}>
          ← Back to bookings
        </Link>

        <div style={styles.error}>
          {error || 'Booking not found.'}
        </div>
      </div>
    )
  }

  const {
  booking,
  customer,
  worker,
  service,
  variant,
  address,
  payment,
  refunds,
  refund_requests: refundRequests,
  occurrences,
  status_history: statusHistory,
  audit_logs: auditLogs,
} = detail

  const isCancelled =
    booking.status === 'cancelled'

  const canAssign =
    !isCancelled &&
    (
      booking.status === 'paid' ||
      booking.status === 'searching_worker' ||
      booking.status === 'assigned'
    )

  return (
    <div style={styles.page}>
      <Link to="/bookings" style={styles.back}>
        ← Back to bookings
      </Link>

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            Booking #{booking.id.slice(0, 8)}
          </h1>

          <p style={styles.subtitle}>
            {service.name}
            {' · '}
            {formatDate(booking.created_at)}
          </p>
        </div>

        <div style={styles.actions}>
          <button
            style={styles.secondaryButton}
            onClick={loadBooking}
            disabled={loading || saving}
          >
            Refresh
          </button>

          {!isCancelled && (
            <button
              style={styles.dangerButton}
              onClick={cancelBooking}
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : 'Cancel booking'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      {success && (
        <div style={styles.success}>
          {success}
        </div>
      )}

      <div style={styles.summaryGrid}>
        <Summary
          label="Status"
          value={formatStatus(booking.status)}
        />

        <Summary
          label="Total"
          value={formatMoney(
            booking.total_amount,
            'INR'
          )}
        />

        <Summary
          label="Payment"
          value={formatStatus(
            payment?.status || 'not found'
          )}
        />

        <Summary
          label="Refunded"
          value={formatMoney(
            successfulRefundTotal,
            payment?.currency || 'INR'
          )}
        />

        <Summary
          label="Open refunds"
          value={String(openRefunds)}
        />
      </div>

      <div style={styles.grid}>
        <Panel title="Customer">
          <InfoRow
            label="Name"
            value={
              customer?.full_name ||
              'Unnamed customer'
            }
          />

          <InfoRow
            label="Email"
            value={
              customer?.email || 'Not available'
            }
          />

          <InfoRow
            label="Phone"
            value={
              customer?.phone || 'Not available'
            }
          />

          <InfoRow
            label="Customer ID"
            value={booking.customer_id}
            mono
          />
        </Panel>

        <Panel title="Worker assignment">
          {worker?.id ? (
            <>
              <InfoRow
                label="Name"
                value={
                  worker.full_name ||
                  'Unnamed worker'
                }
              />

              <InfoRow
                label="Status"
                value={
                  worker.worker_status
                    ? formatStatus(
                        worker.worker_status
                      )
                    : 'Unknown'
                }
              />

              <InfoRow
                label="Verification"
                value={
                  worker.is_verified
                    ? 'Verified'
                    : 'Not verified'
                }
              />

              <InfoRow
                label="Rating"
                value={
                  worker.rating == null
                    ? '—'
                    : `${Number(
                        worker.rating
                      ).toFixed(1)}★`
                }
              />

              <InfoRow
                label="Completed jobs"
                value={String(
                  worker.total_completed_jobs ||
                    0
                )}
              />
            </>
          ) : (
            <div style={styles.empty}>
              <strong>
                No worker assigned.
              </strong>

              <p style={styles.muted}>
                Find an eligible worker below.
              </p>
            </div>
          )}

          {canAssign && (
            <div style={styles.assignmentBox}>
              <button
                style={styles.secondaryButton}
                onClick={findEligibleWorkers}
                disabled={
                  loadingWorkers || saving
                }
              >
                {loadingWorkers
                  ? 'Finding workers...'
                  : worker?.id
                    ? 'Find replacement worker'
                    : 'Find eligible workers'}
              </button>

              {eligibleWorkers.length > 0 && (
                <select
                  defaultValue=""
                  disabled={saving}
                  onChange={event => {
                    const selected =
                      event.target.value

                    if (selected) {
                      assignWorker(selected)
                      event.target.value = ''
                    }
                  }}
                  style={styles.select}
                >
                  <option
                    value=""
                    disabled
                  >
                    Select worker
                  </option>

                  {eligibleWorkers.map(
                    eligible => (
                      <option
                        key={
                          eligible.worker_id
                        }
                        value={
                          eligible.worker_id
                        }
                      >
                        {workerLabel(
                          eligible
                        )}
                      </option>
                    )
                  )}
                </select>
              )}

              {eligibleWorkers.length === 0 &&
                !loadingWorkers && (
                  <p style={styles.muted}>
                    No worker list loaded.
                  </p>
                )}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Service">
        <div style={styles.gridFour}>
          <InfoRow
            label="Service"
            value={
              service?.name ||
              'Unknown service'
            }
          />

          <InfoRow
            label="Variant"
            value={
              variant?.name ||
              'Unknown variant'
            }
          />

          <InfoRow
            label="Billing"
            value={
              variant?.billing_type
                ? formatStatus(
                    variant.billing_type
                  )
                : '—'
            }
          />

          <InfoRow
            label="Duration"
            value={`${booking.duration_value} ${booking.duration_unit}`}
          />
        </div>

        {variant?.description && (
          <div style={styles.description}>
            {variant.description}
          </div>
        )}
      </Panel>

      <div style={styles.grid}>
        <Panel title="Schedule">
          <InfoRow
            label="Start"
            value={formatDate(
              booking.scheduled_start
            )}
          />

          <InfoRow
            label="End"
            value={formatDate(
              booking.scheduled_end
            )}
          />

          <InfoRow
            label="Fulfillment"
            value={formatStatus(
              booking.fulfillment_type
            )}
          />

          <InfoRow
            label="Worker accepted"
            value={
              booking.worker_accepted_at
                ? formatDate(
                    booking.worker_accepted_at
                  )
                : 'Not accepted'
            }
          />

          {booking.schedule_start_date && (
            <InfoRow
              label="Schedule range"
              value={`${booking.schedule_start_date} → ${
                booking.schedule_end_date ||
                '—'
              }`}
            />
          )}

          {booking.selected_weekdays &&
            booking.selected_weekdays.length > 0 && (
              <InfoRow
                label="Weekdays"
                value={booking.selected_weekdays.join(
                  ', '
                )}
              />
            )}

          {booking.total_working_hours !=
            null && (
            <InfoRow
              label="Total working hours"
              value={String(
                booking.total_working_hours
              )}
            />
          )}
        </Panel>

        <Panel title="Booking location">
          <InfoRow
            label="Label"
            value={
              address?.label || 'Address'
            }
          />

          <InfoRow
            label="Address"
            value={
              address?.address_line ||
              'Address unavailable'
            }
          />

          <InfoRow
            label="Latitude"
            value={
              address?.latitude == null
                ? '—'
                : String(address.latitude)
            }
          />

          <InfoRow
            label="Longitude"
            value={
              address?.longitude == null
                ? '—'
                : String(address.longitude)
            }
          />
        </Panel>
      </div>

      <Panel title="Financial breakdown">
        <div style={styles.gridFour}>
          <Summary
            label="Base amount"
            value={formatMoney(
              booking.base_amount,
              payment?.currency || 'INR'
            )}
          />

          <Summary
            label="Platform fee"
            value={formatMoney(
              booking.platform_fee,
              payment?.currency || 'INR'
            )}
          />

          <Summary
            label="Tax"
            value={formatMoney(
              booking.tax_amount,
              payment?.currency || 'INR'
            )}
          />

          <Summary
            label="Total"
            value={formatMoney(
              booking.total_amount,
              payment?.currency || 'INR'
            )}
          />
        </div>
      </Panel>

      <Panel title="Payment">
        {!payment?.id ? (
          <div style={styles.empty}>
            No payment record is linked to this booking.
          </div>
        ) : (
          <div style={styles.gridFour}>
            <InfoRow
              label="Provider"
              value={payment.provider}
            />

            <InfoRow
              label="Status"
              value={formatStatus(
                payment.status
              )}
            />

            <InfoRow
              label="Amount"
              value={formatMoney(
                payment.amount,
                payment.currency
              )}
            />

            <InfoRow
              label="Paid at"
              value={
                payment.paid_at
                  ? formatDate(
                      payment.paid_at
                    )
                  : 'Not paid'
              }
            />

            <InfoRow
              label="Provider order"
              value={
                payment.provider_order_id ||
                '—'
              }
              mono
            />

            <InfoRow
              label="Provider payment"
              value={
                payment.provider_payment_id ||
                '—'
              }
              mono
            />
          </div>
        )}
      </Panel>

      <Panel title="Refunds">
        {refunds.length === 0 ? (
          <div style={styles.empty}>
            No refunds recorded for this booking.
          </div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Refund</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Provider refund</th>
                  <th>Requested</th>
                  <th>Processed</th>
                </tr>
              </thead>

              <tbody>
                {refunds.map(refund => (
                  <tr key={refund.id}>
                    <td>
                      <strong>
                        {refund.id.slice(
                          0,
                          8
                        )}
                        ...
                      </strong>

                      {refund.reason && (
                        <div style={styles.muted}>
                          {refund.reason}
                        </div>
                      )}
                    </td>

                    <td>
                      {formatMoney(
                        refund.amount,
                        refund.currency
                      )}
                    </td>

                    <td>
                      <StatusBadge
                        status={
                          refund.status
                        }
                      />
                    </td>

                    <td style={styles.mono}>
                      {refund.provider_refund_id ||
                        '—'}
                    </td>

                    <td>
                      {formatDate(
                        refund.requested_at
                      )}
                    </td>

                    <td>
                      {refund.processed_at
                        ? formatDate(
                            refund.processed_at
                          )
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {refundRequests.length > 0 && (
        <Panel title="Refund requests">
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Requested</th>
                </tr>
              </thead>

              <tbody>
                {refundRequests.map(
                  request => (
                    <tr key={request.id}>
                      <td style={styles.mono}>
                        {request.id.slice(
                          0,
                          8
                        )}
                        ...
                      </td>

                      <td>
                        {formatMoney(
                          request.amount,
                          request.currency
                        )}
                      </td>

                      <td>
                        <StatusBadge
                          status={
                            request.status
                          }
                        />
                      </td>

                      <td>
                        {request.reason ||
                          '—'}
                      </td>

                      <td>
                        {formatDate(
                          request.requested_at
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {booking.notes && (
        <Panel title="Notes">
          <div style={styles.notes}>
            {booking.notes}
          </div>
        </Panel>
      )}

      <Panel title="Booking lifecycle">
        <Timeline
          label="Booking created"
          value={booking.created_at}
        />

        <Timeline
          label="Worker accepted"
          value={
            booking.worker_accepted_at
          }
        />

        <Timeline
          label="Journey started"
          value={
            booking.journey_started_at
          }
        />

        <Timeline
          label="Worker arrived"
          value={booking.arrived_at}
        />

        <Timeline
          label="Work started"
          value={booking.started_at}
        />

        <Timeline
          label="Start OTP verified"
          value={
            booking.start_otp_verified_at
          }
        />

        <Timeline
          label="Completed"
          value={booking.completed_at}
        />

        <Timeline
          label="End OTP verified"
          value={
            booking.end_otp_verified_at
          }
        />

        <Timeline
          label="Last updated"
          value={booking.updated_at}
        />
      </Panel>
      <Panel title="Status history">
  {statusHistory.length === 0 ? (
    <div style={styles.empty}>
      No status history recorded.
    </div>
  ) : (
    <div>
      {statusHistory.map(entry => (
        <div
          key={entry.id}
          style={styles.historyRow}
        >
          <div style={styles.historyStatus}>
            <StatusBadge
              status={entry.old_status}
            />

            <span style={styles.historyArrow}>
              →
            </span>

            <StatusBadge
              status={entry.new_status}
            />
          </div>

          <div style={styles.historyMeta}>
            <strong>
              {formatDate(entry.created_at)}
            </strong>

            <span style={styles.muted}>
              Changed by:{' '}
              {entry.changed_by
                ? `${entry.changed_by.slice(
                    0,
                    8
                  )}...`
                : 'System'}
            </span>
          </div>
        </div>
      ))}
    </div>
  )}
</Panel>

<Panel title="Admin audit trail">
  {auditLogs.length === 0 ? (
    <div style={styles.empty}>
      No administrative actions recorded.
    </div>
  ) : (
    <div>
      {auditLogs.map(log => (
        <div
          key={log.id}
          style={styles.auditRow}
        >
          <div>
            <strong>
              {formatStatus(log.action)}
            </strong>

            <div style={styles.muted}>
              {formatDate(log.created_at)}
            </div>
          </div>

          <div style={styles.auditAdmin}>
            <span style={styles.muted}>
              Admin
            </span>

            <span style={styles.mono}>
              {log.admin_id
                ? `${log.admin_id.slice(
                    0,
                    8
                  )}...`
                : '—'}
            </span>
          </div>

          {log.metadata &&
            Object.keys(log.metadata).length >
              0 && (
              <pre style={styles.auditMetadata}>
                {JSON.stringify(
                  log.metadata,
                  null,
                  2
                )}
              </pre>
            )}
        </div>
      ))}
    </div>
  )}
</Panel>

      {occurrences.length > 0 && (
        <Panel title="Recurring booking occurrences">
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th>Worker</th>
                  <th>Amount</th>
                </tr>
              </thead>

              <tbody>
                {occurrences.map(
                  occurrence => (
                    <tr
                      key={occurrence.id}
                    >
                      <td>
                        {occurrence.occurrence_index}
                      </td>

                      <td>
                        {occurrence.occurrence_date}
                      </td>

                      <td>
                        {formatDate(
                          occurrence.scheduled_start
                        )}
                        <div
                          style={styles.muted}
                        >
                          End:{' '}
                          {formatDate(
                            occurrence.scheduled_end
                          )}
                        </div>
                      </td>

                      <td>
                        <StatusBadge
                          status={
                            occurrence.status
                          }
                        />
                      </td>

                      <td>
                        {occurrence.worker_id
                          ? occurrence.worker_id.slice(
                              0,
                              8
                            ) + '...'
                          : 'Unassigned'}
                      </td>

                      <td>
                        {occurrence.total_amount ==
                        null
                          ? '—'
                          : formatMoney(
                              occurrence.total_amount,
                              payment?.currency ||
                                'INR'
                            )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  )
}

function Panel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section style={styles.panel}>
      <h2 style={styles.panelTitle}>
        {title}
      </h2>

      {children}
    </section>
  )
}

function Summary({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div style={styles.summary}>
      <span style={styles.muted}>
        {label}
      </span>

      <strong>{value}</strong>
    </div>
  )
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.muted}>
        {label}
      </span>

      <strong
        style={
          mono
            ? styles.mono
            : undefined
        }
      >
        {value}
      </strong>
    </div>
  )
}

function Timeline({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  return (
    <div style={styles.timelineRow}>
      <div
        style={{
          ...styles.timelineDot,
          background: value
            ? '#15803d'
            : '#cbd5e1',
        }}
      />

      <div>
        <strong>{label}</strong>

        <div style={styles.muted}>
          {value
            ? formatDate(value)
            : 'Not recorded'}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({
  status,
}: {
  status: string
}) {
  const normalized =
    status.toLowerCase()

  let background = '#e2e8f0'
  let color = '#334155'

  if (
    normalized === 'succeeded' ||
    normalized === 'completed' ||
    normalized === 'paid'
  ) {
    background = '#dcfce7'
    color = '#166534'
  }

  if (
    normalized === 'failed' ||
    normalized === 'cancelled'
  ) {
    background = '#fee2e2'
    color = '#991b1b'
  }

  if (
    normalized === 'pending' ||
    normalized === 'processing' ||
    normalized === 'searching_worker'
  ) {
    background = '#fef3c7'
    color = '#92400e'
  }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '5px 9px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background,
        color,
      }}
    >
      {formatStatus(status)}
    </span>
  )
}

function workerLabel(
  worker: EligibleWorker
) {
  const rating =
    worker.rating == null
      ? 'New'
      : `${Number(
          worker.rating
        ).toFixed(1)}★`

  const jobs =
    worker.total_completed_jobs == null
      ? 0
      : worker.total_completed_jobs

  const distance =
    worker.distance_km == null
      ? 'distance unavailable'
      : `${Number(
          worker.distance_km
        ).toFixed(1)} km`

  return `${worker.worker_id.slice(
    0,
    8
  )}... — ${distance} — ${rating} — ${jobs} jobs`
}

function formatStatus(
  value: string
) {
  return value
    .replace(/_/g, ' ')
    .replace(
      /\b\w/g,
      character =>
        character.toUpperCase()
    )
}

function formatDate(
  value: string
) {
  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '—'
  }

  return date.toLocaleString(
    'en-IN',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    }
  )
}

function formatMoney(
  value: number | string,
  currency: string
) {
  const amount = Number(value || 0)

  try {
    return new Intl.NumberFormat(
      'en-IN',
      {
        style: 'currency',
        currency:
          currency || 'INR',
        maximumFractionDigits: 2,
      }
    ).format(amount)
  } catch {
    return `₹${amount.toFixed(2)}`
  }
}

const styles: Record<
  string,
  React.CSSProperties
> = {
  page: {
    padding: 32,
    maxWidth: 1500,
    margin: '0 auto',
  },

  back: {
    display: 'inline-block',
    marginBottom: 18,
    color: '#0f766e',
    fontWeight: 700,
    textDecoration: 'none',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 20,
    alignItems: 'flex-start',
    marginBottom: 20,
  },

  title: {
    margin: 0,
    fontSize: 32,
  },

  subtitle: {
    marginTop: 6,
    color: '#64748b',
    fontSize: 13,
  },

  actions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },

  summaryGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(5, minmax(0, 1fr))',
    gap: 12,
    marginBottom: 18,
  },

  historyRow: {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 20,
  padding: '14px 0',
  borderBottom: '1px solid #f1f5f9',
  alignItems: 'center',
},

historyStatus: {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
},

historyArrow: {
  color: '#94a3b8',
  fontWeight: 700,
},

historyMeta: {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: 4,
},

auditRow: {
  display: 'grid',
  gridTemplateColumns:
    'minmax(180px, 1fr) 160px minmax(250px, 2fr)',
  gap: 18,
  padding: '14px 0',
  borderBottom: '1px solid #f1f5f9',
  alignItems: 'start',
},

auditAdmin: {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
},

auditMetadata: {
  margin: 0,
  padding: 10,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 7,
  fontSize: 11,
  overflowX: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
},

  summary: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 16,
    display: 'grid',
    gap: 8,
  },

  grid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(2, minmax(0, 1fr))',
    gap: 18,
  },

  gridFour: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(4, minmax(0, 1fr))',
    gap: 12,
  },

  panel: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 20,
    marginBottom: 18,
  },

  panelTitle: {
    margin: '0 0 16px',
    fontSize: 17,
  },

  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 20,
    padding: '11px 0',
    borderBottom:
      '1px solid #f1f5f9',
  },

  assignmentBox: {
    marginTop: 18,
    padding: 14,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
  },

  select: {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    marginTop: 10,
    padding: 10,
    border:
      '1px solid #cbd5e1',
    borderRadius: 7,
    background: '#fff',
  },

  secondaryButton: {
    padding: '10px 14px',
    border:
      '1px solid #cbd5e1',
    borderRadius: 7,
    background: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  },

  dangerButton: {
    padding: '10px 14px',
    border:
      '1px solid #fecaca',
    borderRadius: 7,
    background: '#fff1f2',
    color: '#be123c',
    fontWeight: 700,
    cursor: 'pointer',
  },

  error: {
    padding: 14,
    marginBottom: 18,
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: 8,
  },

  success: {
    padding: 14,
    marginBottom: 18,
    background: '#dcfce7',
    color: '#166534',
    borderRadius: 8,
  },

  empty: {
    padding: 16,
    background: '#f8fafc',
    borderRadius: 8,
  },

  muted: {
    color: '#64748b',
    fontSize: 13,
  },

  description: {
    marginTop: 14,
    padding: 14,
    background: '#f8fafc',
    borderRadius: 8,
    color: '#475569',
  },

  notes: {
    whiteSpace: 'pre-wrap',
    lineHeight: 1.6,
  },

  tableWrap: {
    overflowX: 'auto',
  },

  table: {
    width: '100%',
    borderCollapse:
      'collapse',
    fontSize: 13,
  },

  mono: {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: 12,
  },

  timelineRow: {
    display: 'flex',
    gap: 12,
    padding: '12px 0',
    borderBottom:
      '1px solid #f1f5f9',
    alignItems: 'flex-start',
  },

  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginTop: 5,
    flexShrink: 0,
  },
}