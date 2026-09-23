import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  useWorkerRuntime,
} from '../context/WorkerRuntimeContext'

import type {
  WorkerNotification,
  WorkerNotificationList,
  WorkerPushPlatform,
  WorkerPushToken,
} from '../types/notifications'

import {
  getWorkerNotification,
  getWorkerNotificationList,
  getWorkerNotifications,
  getWorkerNotificationsForBooking,
  getWorkerPushTokens,
  getWorkerUnreadNotificationCount,
  registerWorkerPushToken,
  deactivateWorkerPushToken,
  deactivateWorkerPushTokenById,
} from '../services/notifications/workerNotifications.service'

export type UseWorkerNotificationsResult = {
  notifications: WorkerNotification[]

  unreadCount: number

  pushTokens: WorkerPushToken[]

  loading: boolean
  updating: boolean

  error: string | null

  refresh: (
    limit?: number,
  ) => Promise<void>

  refreshUnreadCount: () => Promise<void>

  refreshPushTokens: () => Promise<void>

  getNotification: (
    notificationId: string,
  ) => Promise<WorkerNotification | null>

  getForBooking: (
    bookingId: string,
    limit?: number,
  ) => Promise<WorkerNotification[]>

  getNotificationList: (
    limit?: number,
  ) => Promise<WorkerNotificationList>

  registerPushToken: (
    token: string,
    platform?: WorkerPushPlatform | null,
  ) => Promise<WorkerPushToken>

  deactivatePushToken: (
    token: string,
  ) => Promise<WorkerPushToken | null>

  deactivatePushTokenById: (
    tokenId: string,
  ) => Promise<WorkerPushToken | null>

  clearError: () => void
}

export function useWorkerNotifications(
  autoLoad = true,
): UseWorkerNotificationsResult {
  const {
    notificationRevision,
  } = useWorkerRuntime()

  const [
    notifications,
    setNotifications,
  ] = useState<WorkerNotification[]>(
    [],
  )

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0)

  const [
    pushTokens,
    setPushTokens,
  ] = useState<WorkerPushToken[]>(
    [],
  )

  const [
    loading,
    setLoading,
  ] = useState(
    autoLoad,
  )

  const [
    updating,
    setUpdating,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  )

  const refresh =
    useCallback(
      async (
        limit = 50,
      ): Promise<void> => {
        setLoading(true)
        setError(null)

        try {
          const [
            notificationList,
            nextPushTokens,
          ] = await Promise.all([
            getWorkerNotificationList(
              limit,
            ),
            getWorkerPushTokens(),
          ])

          setNotifications(
            notificationList.notifications,
          )

          setUnreadCount(
            notificationList.unreadCount,
          )

          setPushTokens(
            nextPushTokens,
          )
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to load worker notifications.'

          setError(
            message,
          )
        } finally {
          setLoading(false)
        }
      },
      [],
    )

  useEffect(() => {
    if (!autoLoad) {
      return
    }

    void refresh()
  }, [
    autoLoad,
    refresh,
  ])

  useEffect(() => {
    if (
      notificationRevision === 0
    ) {
      return
    }

    void refresh()
  }, [
    notificationRevision,
    refresh,
  ])

  const refreshUnreadCount =
    useCallback(
      async (): Promise<void> => {
        try {
          const count =
            await getWorkerUnreadNotificationCount()

          setUnreadCount(
            count,
          )
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to load unread notification count.'

          setError(
            message,
          )
        }
      },
      [],
    )

  const refreshPushTokens =
    useCallback(
      async (): Promise<void> => {
        setUpdating(true)
        setError(null)

        try {
          const nextPushTokens =
            await getWorkerPushTokens()

          setPushTokens(
            nextPushTokens,
          )
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to load worker push tokens.'

          setError(
            message,
          )
        } finally {
          setUpdating(false)
        }
      },
      [],
    )

  const getNotification =
    useCallback(
      async (
        notificationId: string,
      ): Promise<WorkerNotification | null> => {
        setError(null)

        try {
          return await getWorkerNotification(
            notificationId,
          )
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to load worker notification.'

          setError(
            message,
          )

          throw cause
        }
      },
      [],
    )

  const getForBooking =
    useCallback(
      async (
        bookingId: string,
        limit = 50,
      ): Promise<WorkerNotification[]> => {
        setError(null)

        try {
          return await getWorkerNotificationsForBooking(
            bookingId,
            limit,
          )
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to load booking notifications.'

          setError(
            message,
          )

          throw cause
        }
      },
      [],
    )

  const getNotificationList =
    useCallback(
      async (
        limit = 50,
      ): Promise<WorkerNotificationList> => {
        setError(null)

        try {
          const notificationList =
            await getWorkerNotificationList(
              limit,
            )

          setNotifications(
            notificationList.notifications,
          )

          setUnreadCount(
            notificationList.unreadCount,
          )

          return notificationList
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to load worker notification list.'

          setError(
            message,
          )

          throw cause
        }
      },
      [],
    )

  const registerPushToken =
    useCallback(
      async (
        token: string,
        platform?: WorkerPushPlatform | null,
      ): Promise<WorkerPushToken> => {
        setUpdating(true)
        setError(null)

        try {
          const registered =
            await registerWorkerPushToken(
              token,
              platform,
            )

          setPushTokens(
            (current) => {
              const withoutDuplicate =
                current.filter(
                  (item) =>
                    item.id !==
                    registered.id &&
                    item.token !==
                    registered.token,
                )

              return [
                registered,
                ...withoutDuplicate,
              ]
            },
          )

          return registered
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to register worker push token.'

          setError(
            message,
          )

          throw cause
        } finally {
          setUpdating(false)
        }
      },
      [],
    )

  const deactivatePushToken =
    useCallback(
      async (
        token: string,
      ): Promise<WorkerPushToken | null> => {
        setUpdating(true)
        setError(null)

        try {
          const deactivated =
            await deactivateWorkerPushToken(
              token,
            )

          if (deactivated) {
            setPushTokens(
              (current) =>
                current.map(
                  (item) =>
                    item.id ===
                    deactivated.id
                      ? deactivated
                      : item,
                ),
            )
          }

          return deactivated
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to deactivate worker push token.'

          setError(
            message,
          )

          throw cause
        } finally {
          setUpdating(false)
        }
      },
      [],
    )

  const deactivatePushTokenById =
    useCallback(
      async (
        tokenId: string,
      ): Promise<WorkerPushToken | null> => {
        setUpdating(true)
        setError(null)

        try {
          const deactivated =
            await deactivateWorkerPushTokenById(
              tokenId,
            )

          if (deactivated) {
            setPushTokens(
              (current) =>
                current.map(
                  (item) =>
                    item.id ===
                    deactivated.id
                      ? deactivated
                      : item,
                ),
            )
          }

          return deactivated
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to deactivate worker push token.'

          setError(
            message
          )

          throw cause
        } finally {
          setUpdating(false)
        }
      },
      [],
    )

  const clearError =
    useCallback(
      (): void => {
        setError(null)
      },
      [],
    )

  return {
    notifications,

    unreadCount,

    pushTokens,

    loading,
    updating,

    error,

    refresh,

    refreshUnreadCount,

    refreshPushTokens,

    getNotification,

    getForBooking,

    getNotificationList,

    registerPushToken,

    deactivatePushToken,

    deactivatePushTokenById,

    clearError,
  }
}