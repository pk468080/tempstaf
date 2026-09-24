import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import BookingDetail from './pages/BookingDetail'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Bookings from './pages/Bookings'
import Workers from './pages/Workers'
import WorkerDetail from './pages/WorkerDetail'
import Customers from './pages/Customers'
import Services from './pages/Services'
import ServiceAreas from './pages/ServiceAreas'
import Payments from './pages/Payments'
import Reviews from './pages/Reviews'
import Notifications from './pages/Notifications'
import OffersUpdates from './pages/OffersUpdates'
import ServiceDiscounts from './pages/ServiceDiscounts'

import AdminLayout from './layouts/AdminLayout'
import AdminGuard from './components/AdminGuard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={<Login />}
        />

        <Route element={<AdminGuard />}>
          <Route element={<AdminLayout />}>

            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            <Route
              path="/bookings"
              element={<Bookings />}
            />

            <Route
              path="/bookings/:bookingId"
              element={<BookingDetail />}
            />

            <Route
              path="/workers"
              element={<Workers />}
            />

            <Route
              path="/workers/:workerId"
              element={<WorkerDetail />}
            />

            <Route
              path="/customers"
              element={<Customers />}
            />

            <Route
              path="/services"
              element={<Services />}
            />

            <Route
              path="/service-areas"
              element={<ServiceAreas />}
            />

            <Route
              path="/offers-updates"
              element={<OffersUpdates />}
            />

            <Route
              path="/duration-discounts"
              element={<ServiceDiscounts />}
            />

            <Route
              path="/payments"
              element={<Payments />}
            />

            <Route
              path="/reviews"
              element={<Reviews />}
            />

            <Route
              path="/notifications"
              element={<Notifications />}
            />

          </Route>
        </Route>

        <Route
          path="/"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}