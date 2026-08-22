import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'

import { supabase } from './lib/supabase'
import LoginScreen from './screens/LoginScreen'
import WorkerDashboard from './screens/WorkerDashboard'

export default function App() {
  const [sessionReady, setSessionReady] =
    useState(false)

  const [loggedIn, setLoggedIn] =
    useState(false)

  useEffect(() => {
    let mounted = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return

        setLoggedIn(Boolean(data.session))
        setSessionReady(true)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return

        setLoggedIn(Boolean(session))
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (!sessionReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator />
      </View>
    )
  }

  if (!loggedIn) {
    return (
      <LoginScreen
        onLogin={() => setLoggedIn(true)}
      />
    )
  }

  return <WorkerDashboard />
}
