import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import type {
  WorkerSchedule,
  WorkerScheduleException,
  WorkerScheduleExceptionInput,
  WorkerScheduleSettingsInput,
  WorkerWeeklySchedule,
  WorkerWeeklyScheduleInput,
} from '../types/schedule'

import {
  createWorkerWeeklySchedule,
  deleteWorkerScheduleSettings,
  deleteWorkerWeeklySchedule,
  getWorkerSchedule,
  setWorkerScheduleSettings,
  updateWorkerWeeklySchedule,
  replaceWorkerWeeklySchedules,
} from '../services/schedule/workerSchedule.service'

import {
  createWorkerScheduleException,
  deleteWorkerScheduleException,
  updateWorkerScheduleException,
} from '../services/schedule/workerScheduleExceptions.service'

export type UseWorkerScheduleResult = {
  schedule: WorkerSchedule | null

  loading: boolean
  saving: boolean

  error: string | null

  refresh: () => Promise<void>

  createWeeklySchedule: (
    input: WorkerWeeklyScheduleInput,
  ) => Promise<WorkerWeeklySchedule>

  updateWeeklySchedule: (
    scheduleId: string,
    input: WorkerWeeklyScheduleInput,
  ) => Promise<WorkerWeeklySchedule>

  deleteWeeklySchedule: (
    scheduleId: string,
  ) => Promise<void>

  replaceWeeklySchedules: (
    schedules: WorkerWeeklyScheduleInput[],
  ) => Promise<WorkerWeeklySchedule[]>

  createException: (
    input: WorkerScheduleExceptionInput,
  ) => Promise<WorkerScheduleException>

  updateException: (
    exceptionId: string,
    input: WorkerScheduleExceptionInput,
  ) => Promise<WorkerScheduleException>

  deleteException: (
    exceptionId: string,
  ) => Promise<void>

  setSettings: (
    input: WorkerScheduleSettingsInput,
  ) => Promise<void>

  deleteSettings: () => Promise<void>

  clearError: () => void
}

export function useWorkerSchedule(
  autoLoad = true,
): UseWorkerScheduleResult {
  const [
    schedule,
    setSchedule,
  ] = useState<WorkerSchedule | null>(
    null,
  )

  const [
    loading,
    setLoading,
  ] = useState(
    autoLoad,
  )

  const [
    saving,
    setSaving,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  )

  const refresh =
  useCallback(
    async (): Promise<void> => {
      setLoading(true)
      setError(null)

      try {
        const currentSchedule =
          await getWorkerSchedule()

        setSchedule(
          currentSchedule,
        )
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : 'Unable to load worker schedule.'

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

  const createWeeklySchedule =
    useCallback(
      async (
        input: WorkerWeeklyScheduleInput,
      ): Promise<WorkerWeeklySchedule> => {
        setSaving(true)
        setError(null)

        try {
          const created =
            await createWorkerWeeklySchedule(
              input,
            )

          await refresh()

          return created
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to create worker schedule.'

          setError(
            message,
          )

          throw cause
        } finally {
          setSaving(false)
        }
      },
      [
        refresh,
      ],
    )

  const updateWeeklySchedule =
    useCallback(
      async (
        scheduleId: string,
        input: WorkerWeeklyScheduleInput,
      ): Promise<WorkerWeeklySchedule> => {
        setSaving(true)
        setError(null)

        try {
          const updated =
            await updateWorkerWeeklySchedule(
              scheduleId,
              input,
            )

          await refresh()

          return updated
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to update worker schedule.'

          setError(
            message,
          )

          throw cause
        } finally {
          setSaving(false)
        }
      },
      [
        refresh,
      ],
    )

  const deleteWeeklySchedule =
    useCallback(
      async (
        scheduleId: string,
      ): Promise<void> => {
        setSaving(true)
        setError(null)

        try {
          await deleteWorkerWeeklySchedule(
            scheduleId,
          )

          await refresh()
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to delete worker schedule.'

          setError(
            message,
          )

          throw cause
        } finally {
          setSaving(false)
        }
      },
      [
        refresh,
      ],
    )

  const replaceWeeklySchedules =
    useCallback(
      async (
        schedules: WorkerWeeklyScheduleInput[],
      ): Promise<WorkerWeeklySchedule[]> => {
        setSaving(true)
        setError(null)

        try {
          const replaced =
            await replaceWorkerWeeklySchedules(
              schedules,
            )

          await refresh()

          return replaced
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to replace worker schedules.'

          setError(
            message,
          )

          throw cause
        } finally {
          setSaving(false)
        }
      },
      [
        refresh,
      ],
    )

  const createException =
    useCallback(
      async (
        input: WorkerScheduleExceptionInput,
      ): Promise<WorkerScheduleException> => {
        setSaving(true)
        setError(null)

        try {
          const created =
            await createWorkerScheduleException(
              input,
            )

          await refresh()

          return created
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to create schedule exception.'

          setError(
            message,
          )

          throw cause
        } finally {
          setSaving(false)
        }
      },
      [
        refresh,
      ],
    )

  const updateException =
    useCallback(
      async (
        exceptionId: string,
        input: WorkerScheduleExceptionInput,
      ): Promise<WorkerScheduleException> => {
        setSaving(true)
        setError(null)

        try {
          const updated =
            await updateWorkerScheduleException(
              exceptionId,
              input,
            )

          await refresh()

          return updated
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to update schedule exception.'

          setError(
            message,
          )

          throw cause
        } finally {
          setSaving(false)
        }
      },
      [
        refresh,
      ],
    )

  const deleteException =
    useCallback(
      async (
        exceptionId: string,
      ): Promise<void> => {
        setSaving(true)
        setError(null)

        try {
          await deleteWorkerScheduleException(
            exceptionId,
          )

          await refresh()
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to delete schedule exception.'

          setError(
            message,
          )

          throw cause
        } finally {
          setSaving(false)
        }
      },
      [
        refresh,
      ],
    )

  const setSettings =
    useCallback(
      async (
        input: WorkerScheduleSettingsInput,
      ): Promise<void> => {
        setSaving(true)
        setError(null)

        try {
          await setWorkerScheduleSettings(
            input,
          )

          await refresh()
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to update worker schedule settings.'

          setError(
            message,
          )

          throw cause
        } finally {
          setSaving(false)
        }
      },
      [
        refresh,
      ],
    )

  const deleteSettings =
    useCallback(
      async (): Promise<void> => {
        setSaving(true)
        setError(null)

        try {
          await deleteWorkerScheduleSettings()

          await refresh()
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to delete worker schedule settings.'

          setError(
            message,
          )

          throw cause
        } finally {
          setSaving(false)
        }
      },
      [
        refresh,
      ],
    )

  const clearError =
    useCallback(
      (): void => {
        setError(null)
      },
      [],
    )

  return {
    schedule,

    loading,
    saving,

    error,

    refresh,

    createWeeklySchedule,

    updateWeeklySchedule,

    deleteWeeklySchedule,

    replaceWeeklySchedules,

    createException,

    updateException,

    deleteException,

    setSettings,

    deleteSettings,

    clearError,
  }
}