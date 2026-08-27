import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ProtectedRoute() {
  const location = useLocation()

  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let mounted = true

    async function checkAccess() {
      setChecking(true)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        if (mounted) {
          setAllowed(false)
          setChecking(false)
        }

        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, role, is_active')
        .eq('id', session.user.id)
        .maybeSingle()

      const isAllowed =
        !error &&
        profile?.role === 'admin' &&
        profile?.is_active === true

      if (mounted) {
        setAllowed(isAllowed)
        setChecking(false)
      }
    }

    checkAccess()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkAccess()
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (checking) {
    return (
      <div className="page-content">
        <div className="bookings-empty">
          <strong>Checking administrator access...</strong>
          <span>Please wait.</span>
        </div>
      </div>
    )
  }

  if (!allowed) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  return <Outlet />
}