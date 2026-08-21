import { BookingProvider } from './context/BookingContext'
import AppNavigator from './navigation/AppNavigator'

export default function App() {
  return (
    <BookingProvider>
      <AppNavigator />
    </BookingProvider>
  )
}
