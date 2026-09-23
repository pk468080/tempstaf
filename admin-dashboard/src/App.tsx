
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

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

import AdminLayout from './layouts/AdminLayout'
import AdminGuard from './components/AdminGuard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Authentication */}
        <Route
          path="/login"
          element={<Login />}
        />

        {/* Protected Admin Application */}
        <Route element={<AdminGuard />}>
          <Route element={<AdminLayout />}>

            {/* Dashboard */}
            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            {/* Operations */}
            <Route
              path="/bookings"
              element={<Bookings />}
            />

            {/* Workforce */}
            <Route
              path="/workers"
              element={<Workers />}
            />

            <Route
              path="/workers/:workerId"
              element={<WorkerDetail />}
            />

            {/* Customers */}
            <Route
              path="/customers"
              element={<Customers />}
            />

            {/* Catalog */}
            <Route
              path="/services"
              element={<Services />}
            />

            <Route
              path="/service-areas"
              element={<ServiceAreas />}
            />

            {/* Finance */}
            <Route
              path="/payments"
              element={<Payments />}
            />

            {/* Reviews */}
            <Route
              path="/reviews"
              element={<Reviews />}
            />

            {/* Notifications */}
            <Route
              path="/notifications"
              element={<Notifications />}
            />

          </Route>
        </Route>

        {/* Default */}
        <Route
          path="/"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

        {/* Unknown route */}
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
