
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Workers from './pages/Workers'
import WorkerDetail from './pages/WorkerDetail'
import Placeholder from './pages/Placeholder'
import AdminLayout from './layouts/AdminLayout'
import AdminGuard from './components/AdminGuard'
import Customers from './pages/Customers'
import Services from './pages/Services'
import ServiceAreas from './pages/ServiceAreas'
import Bookings from './pages/Bookings'
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

            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            <Route
              path="/bookings"
              element={<Bookings />}
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
              path="/payments"
              element={<Placeholder />}
            />

            <Route
              path="/reviews"
              element={<Placeholder />}
            />
          <Route
  path="/service-areas"
  element={<ServiceAreas />}
/>
            <Route
              path="/notifications"
              element={<Placeholder />}
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