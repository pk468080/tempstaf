import * as Location from 'expo-location'

export async function getCurrentLocation() {
  const permission =
    await Location.requestForegroundPermissionsAsync()

  if (permission.status !== 'granted') {
    throw new Error('LOCATION_PERMISSION_DENIED')
  }

  const servicesEnabled =
    await Location.hasServicesEnabledAsync()

  if (!servicesEnabled) {
    throw new Error('LOCATION_SERVICES_DISABLED')
  }

  // Try the emulator/device cached location first.
  const lastKnown =
    await Location.getLastKnownPositionAsync({
      maxAge: 5 * 60 * 1000,
      requiredAccuracy: 1000,
    })

  if (lastKnown) {
    return {
      latitude: lastKnown.coords.latitude,
      longitude: lastKnown.coords.longitude,
      label: `${lastKnown.coords.latitude.toFixed(5)}, ${lastKnown.coords.longitude.toFixed(5)}`,
    }
  }

  // Request a fresh GPS location.
  const locationPromise =
    Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    })

  // Never allow the app to wait forever for GPS.
  const timeoutPromise = new Promise<never>(
    (_, reject) => {
      setTimeout(() => {
        reject(new Error('LOCATION_TIMEOUT'))
      }, 15000)
    }
  )

  const current = await Promise.race([
    locationPromise,
    timeoutPromise,
  ])

  return {
    latitude: current.coords.latitude,
    longitude: current.coords.longitude,
    label: `${current.coords.latitude.toFixed(5)}, ${current.coords.longitude.toFixed(5)}`,
  }
}