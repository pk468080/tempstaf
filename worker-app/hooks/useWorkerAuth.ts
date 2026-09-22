import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import type { Session } from '@supabase/supabase-js'

import {
  getWorkerAuthState,
  getCurrentWorkerProfile,
  registerWorkerAuth,
  refreshWorkerSession,
  signInWorker,
  signOutWorker,
  subscribeToWorkerAuthChanges,
} from '../services/auth/workerAuth.service'

import type {
  WorkerAuthState,
  WorkerAuthResult,
  WorkerRegistrationResult,
} from '../services/auth/workerAuth.service'

import type {
  WorkerProfile,
} from '../types/worker'

export type UseWorkerAuthResult = {
  session: Session | null
  worker: WorkerProfile | null

  authState: WorkerAuthState | null

  loading: boolean
  error: string | null

  isAuthenticated: boolean
  needsRegistration: boolean

  refresh: () => Promise<void>

  signIn: (
    email: string,
    password: string,
  ) => Promise<WorkerAuthResult>

  register: (
    email: string,
    password: string,
    fullName: string,
    phone: string,
  ) => Promise<WorkerRegistrationResult>

  signOut: () => Promise<void>

  clearError: () => void
}

export function useWorkerAuth(): UseWorkerAuthResult {
  const [
    session,
    setSession,
  ] = useState<Session | null>(null)

  const [
    worker,
    setWorker,
  ] = useState<WorkerProfile | null>(null)

  const [
    authState,
    setAuthState,
  ] = useState<WorkerAuthState | null>(
    null,
  )

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  )

    const loadAuth = useCallback(
    async (
      nextSession?: Session | null,
    ): Promise<void> => {
      setLoading(true)
      setError(null)

      try {
        const resolvedSession =
          nextSession !== undefined
            ? nextSession
            : await refreshWorkerSession()

        setSession(
          resolvedSession,
        )

        if (!resolvedSession) {
          setWorker(null)
          setAuthState({
            authenticated: false,
            needsRegistration: true,
            email: '',
          })

          return
        }

        const [
          nextAuthState,
          nextWorker,
        ] = await Promise.all([
          getWorkerAuthState(),
          getCurrentWorkerProfile(),
        ])

        setAuthState(
          nextAuthState,
        )

        setWorker(
          nextWorker,
        )
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : 'Unable to load worker authentication state.'

        setError(
          message,
        )

        setSession(null)
        setWorker(null)
        setAuthState(null)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    let mounted = true

    const initialize =
      async (): Promise<void> => {
        if (!mounted) {
          return
        }

        await loadAuth()
      }

    void initialize()

    const {
  data: {
    subscription,
  },
} =
  subscribeToWorkerAuthChanges(
    (
      nextSession,
    ) => {
      if (!mounted) {
        return
      }

      void loadAuth(
        nextSession,
      )
    },
  )
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [
    loadAuth,
  ])

  const refresh =
    useCallback(
      async (): Promise<void> => {
        await loadAuth()
      },
      [
        loadAuth,
      ],
    )

  const signIn =
    useCallback(
      async (
        email: string,
        password: string,
      ): Promise<WorkerAuthResult> => {
        setLoading(true)
        setError(null)

        try {
          const result =
            await signInWorker(
              email,
              password,
            )

          if (!result.success) {
            setError(
              result.error,
            )
            return result
          }

          await loadAuth(
            result.session,
          )

          return result
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to sign in.'

          setError(
            message,
          )

          return {
            success: false,
            error: message,
          }
        } finally {
          setLoading(false)
        }
      },
      [
        loadAuth,
      ],
    )

  const register =
    useCallback(
      async (
        email: string,
        password: string,
        fullName: string,
        phone: string,
      ): Promise<WorkerRegistrationResult> => {
        setLoading(true)
        setError(null)

        try {
          const result =
            await registerWorkerAuth(
              email,
              password,
              fullName,
              phone,
            )

          if (!result.success) {
            setError(
              result.error,
            )
            return result
          }

          await loadAuth(
            result.session,
          )

          return result
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to create the worker account.'

          setError(
            message,
          )

          return {
            success: false,
            error: message,
          }
        } finally {
          setLoading(false)
        }
      },
      [
        loadAuth,
      ],
    )

  const signOut =
    useCallback(
      async (): Promise<void> => {
        setLoading(true)
        setError(null)

        try {
          await signOutWorker()

          setSession(null)
          setWorker(null)
          setAuthState({
            authenticated:
              false,
            needsRegistration:
              true,
            email: '',
          })
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : 'Unable to sign out.'

          setError(
            message,
          )

          throw cause
        } finally {
          setLoading(false)
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
    session,
    worker,

    authState,

    loading,
    error,

    isAuthenticated:
      authState?.authenticated ===
      true,

    needsRegistration:
      authState?.needsRegistration ===
      true,

    refresh,

    signIn,
    register,
    signOut,

    clearError,
  }
}