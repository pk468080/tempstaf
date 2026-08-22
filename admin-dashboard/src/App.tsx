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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Authentication */}
        <Route
          path="/login"
          element={<Login />}
        />

        {/* Admin application */}
        <Route element={<AdminLayout />}>

          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          <Route
            path="/bookings"
            element={<Placeholder />}
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
            element={<Placeholder />}
          />

          <Route
            path="/services"
            element={<Placeholder />}
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
            path="/notifications"
            element={<Placeholder />}
          />

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