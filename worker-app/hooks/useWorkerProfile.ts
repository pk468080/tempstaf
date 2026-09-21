import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  getWorkerProfile,
  updateWorkerName,
  updateWorkerPhone,
} from '../services/worker/workerProfile.service'

import type {
  UpdateWorkerProfileInput,
} from '../services/worker/workerProfile.service'

import type {
  WorkerProfile,
} from '../types/worker'

export type UseWorkerProfileResult = {
  worker: WorkerProfile | null

  loading: boolean
  saving: boolean

  error: string | null

  refresh: () => Promise<void>

  update: (
    input: UpdateWorkerProfileInput,
  ) => Promise<WorkerProfile>

  updateName: (
    fullName: string,
  ) => Promise<WorkerProfile>

  updatePhone: (
    phone: string,
  ) => Promise<WorkerProfile>

  clearError: () => void
}

export function useWorkerProfile(
  autoLoad = true,
): UseWorkerProfileResult {
  const [
    worker,
    setWorker,
  ] = useState<WorkerProfile | null>(
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
          const profile =
            await getWorkerProfile()

          setWorker(
            profile,
          )
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to load worker profile.'

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

  const update =
    useCallback(
      async (
        input: UpdateWorkerProfileInput,
      ): Promise<WorkerProfile> => {
        setSaving(true)
        setError(null)

        try {
          const updated =
            await updateWorkerProfile(
              input,
            )

          setWorker(
            updated,
          )

          return updated
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to update worker profile.'

          setError(
            message,
          )

          throw cause
        } finally {
          setSaving(false)
        }
      },
      [],
    )

  const updateName =
    useCallback(
      async (
        fullName: string,
      ): Promise<WorkerProfile> => {
        setSaving(true)
        setError(null)

        try {
          const updated =
            await updateWorkerName(
              fullName,
            )

          setWorker(
            updated,
          )

          return updated
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to update worker name.'

          setError(
            message,
          )

          throw cause
        } finally {
          setSaving(false)
        }
      },
      [],
    )

  const updatePhone =
    useCallback(
      async (
        phone: string,
      ): Promise<WorkerProfile> => {
        setSaving(true)
        setError(null)

        try {
          const updated =
            await updateWorkerPhone(
              phone,
            )

          setWorker(
            updated,
          )

          return updated
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to update worker phone number.'

          setError(
            message,
          )

          throw cause
        } finally {
          setSaving(false)
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
    worker,

    loading,
    saving,

    error,

    refresh,

    update,
    updateName,
    updatePhone,

    clearError,
  }
}