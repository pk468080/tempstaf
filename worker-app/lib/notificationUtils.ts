import type { WorkerNotificationType } from '../types/notifications'

export function isBookingNotification(
  type: WorkerNotificationType | null,
): boolean {
  return (
    type === 'booking' ||
    type === 'booking_offer' ||
    type === 'booking_update' ||
    type === 'booking_reminder'
  )
}

export function isOfferNotification(
  type: WorkerNotificationType | null,
): boolean {
  return type === 'booking_offer'
}

export function getNotificationTypeLabel(
  type: WorkerNotificationType | null,
): string {
  switch (type) {
    case 'booking':
      return 'Booking'

    case 'booking_offer':
      return 'Booking Offer'

    case 'booking_update':
      return 'Booking Update'

    case 'booking_reminder':
      return 'Booking Reminder'

    case 'payment':
      return 'Payment'

    case 'earnings':
      return 'Earnings'

    case 'account':
      return 'Account'

    case 'support':
      return 'Support'

    case 'system':
      return 'System'

    default:
      return 'Notification'
  }
}

export function formatNotificationDate(
  value: string | null | undefined,
): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatNotificationTime(
  value: string | null | undefined,
): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatNotificationDateTime(
  value: string | null | undefined,
): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getRelativeNotificationTime(
  value: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  const differenceMs = now.getTime() - date.getTime()

  if (differenceMs < 0) {
    return 'Just now'
  }

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (differenceMs < minute) {
    return 'Just now'
  }

  if (differenceMs < hour) {
    const minutes = Math.floor(differenceMs / minute)
    return `${minutes}m ago`
  }

  if (differenceMs < day) {
    const hours = Math.floor(differenceMs / hour)
    return `${hours}h ago`
  }

  if (differenceMs < 7 * day) {
    const days = Math.floor(differenceMs / day)
    return `${days}d ago`
  }

  return formatNotificationDate(value)
}

export function getUnreadNotificationCount(
  notifications: Array<{ isRead: boolean }>,
): number {
  return notifications.filter(
    (notification) => !notification.isRead,
  ).length
}

export function sortNotifications<T extends {
  createdAt: string
}>(
  notifications: T[],
): T[] {
  return [...notifications].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime(),
  )
}