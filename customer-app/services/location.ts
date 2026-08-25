import * as Location from 'expo-location'

export async function getCurrentLocation() {
  const permission =
    await Location.requestForegroundPermissionsAsync()

  if (permission.status !== 'granted') {
    throw new Error('LOCATION_PERMISSION_DENIED')
  }

  // First try the emulator/device's last known location.
  // This prevents the app from waiting indefinitely for a fresh GPS fix.
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

  // If there is no cached location, request a fresh location.
  const current =
    await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    })

  return {
    latitude: current.coords.latitude,
    longitude: current.coords.longitude,
    label: `${current.coords.latitude.toFixed(5)}, ${current.coords.longitude.toFixed(5)}`,
  }
}