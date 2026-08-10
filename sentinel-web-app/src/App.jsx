/*
 * SentinelMesh — Main App Component
 *
 * Sets up routing and auth-protected routes.
 * Wraps everything in AuthProvider for Firebase auth state.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DeviceProvider } from './contexts/DeviceContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PairDevice from './pages/PairDevice';
import SOSActive from './pages/SOSActive';
import Alerts from './pages/Alerts';
import FindServices from './pages/FindServices';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import EmergencyContacts from './pages/EmergencyContacts';

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
          <p className="text-on-surface-variant">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Public Route wrapper (redirects to home if already logged in)
function PublicRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) return null;
  if (currentUser) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pair-device"
        element={
          <ProtectedRoute>
            <PairDevice />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sos-active"
        element={
          <ProtectedRoute>
            <SOSActive />
          </ProtectedRoute>
        }
      />
      <Route
        path="/alerts"
        element={
          <ProtectedRoute>
            <Alerts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/find-hospital"
        element={
          <ProtectedRoute>
            <FindServices type="hospital" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/find-police"
        element={
          <ProtectedRoute>
            <FindServices type="police" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/emergency-contacts"
        element={
          <ProtectedRoute>
            <EmergencyContacts />
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DeviceProvider>
        <AppRoutes />
      </DeviceProvider>
    </AuthProvider>
  );
}
