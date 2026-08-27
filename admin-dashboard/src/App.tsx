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
import AdminLayout from './layouts/AdminLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Bookings from './pages/Bookings'
import Services from './pages/Services'
import Customers from './pages/Customers'
import Payments from './pages/Payments'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={<Login />}
        />

        <Route element={<ProtectedRoute />}>
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
              element={<Payments />}
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