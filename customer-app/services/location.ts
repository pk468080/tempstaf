import * as Location from 'expo-location'

export async function getCurrentLocation() {
  const permission = await Location.requestForegroundPermissionsAsync()
  if (permission.status !== 'granted') {
    throw new Error('LOCATION_PERMISSION_DENIED')
  }

  const current = await Location.getCurrentPositionAsync({})
  return {
    latitude: current.coords.latitude,
    longitude: current.coords.longitude,
    label: `${current.coords.latitude.toFixed(5)}, ${current.coords.longitude.toFixed(5)}`,
  }
}
