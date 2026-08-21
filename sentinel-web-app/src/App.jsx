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
import CommandCenter from './pages/CommandCenter';
import ManageGeoFences from './pages/ManageGeoFences';
import LiveMap from './pages/LiveMap';

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

// Admin Route wrapper — requires ADMIN role
function AdminRoute({ children }) {
  const { currentUser, isAdmin, loading } = useAuth();

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

  if (!isAdmin) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-surface">
        <div className="text-center px-8">
          <span className="material-symbols-outlined text-error text-6xl mb-4">admin_panel_settings</span>
          <h1 className="text-2xl font-bold text-on-surface mb-2">Admin Access Required</h1>
          <p className="text-on-surface-variant mb-6">
            You need ADMIN privileges to access the Command Center.
          </p>
          <button
            onClick={() => window.history.back()}
            className="h-12 px-6 bg-primary text-white font-semibold rounded-xl shadow-md"
          >
            Go Back
          </button>
        </div>
      </div>
    );
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
      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <LiveMap />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <CommandCenter />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/geofences"
        element={
          <AdminRoute>
            <ManageGeoFences />
          </AdminRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { useEffect, useRef } from 'react';
import { db } from './firebase';
import { ref, onChildAdded } from 'firebase/database';

function GlobalNotificationListener() {
  const navigate = useNavigate();
  const mountTime = useRef(Date.now());
  
  useEffect(() => {
    const sosRef = ref(db, 'sos_alerts');
    
    // Listen for new alerts
    const unsubAdded = onChildAdded(sosRef, (snapshot) => {
      const alert = snapshot.val();
      
      if (alert && alert.active) {
        // Only show toast if the alert was created AFTER the page loaded
        if (alert.timestamp && alert.timestamp > mountTime.current - 5000) {
          
          // 1. In-App Toast Notification (Premium UI)
          toast.custom(
            (t) => (
              <div
                className={`${
                  t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-full bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 overflow-hidden border-l-4 border-l-[#ff0033]`}
              >
                <div className="flex-1 w-0 p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                      <div className="h-10 w-10 rounded-full bg-[#ff0033]/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#ff0033] animate-pulse">
                          emergency
                        </span>
                      </div>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
                        Nearby Emergency
                      </p>
                      <p className="mt-1 text-sm text-gray-500 font-medium">
                        SOS triggered by device <span className="text-gray-900 font-bold">{alert.deviceId}</span>
                      </p>
                      <button
                        onClick={() => {
                          toast.dismiss(t.id);
                          navigate('/admin');
                        }}
                        className="mt-3 w-full bg-gradient-to-r from-[#ff0033] to-[#cc0000] text-white py-2 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[16px]">map</span>
                        View Admin Dashboard
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex border-l border-gray-100">
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-sm font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-50 focus:outline-none transition-colors"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>
            ),
            { duration: 10000, position: 'top-center' }
          );

          // 2. Native OS Push Notification (if granted)
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🚨 SentinelMesh Emergency', {
              body: `SOS triggered by device ${alert.deviceId}. Please check the map.`,
              icon: '/vite.svg', // generic icon
              vibrate: [200, 100, 200, 100, 500]
            });
          }
        }
      }
    });

    // Request native notification permission on mount
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    return () => {
      unsubAdded();
    };
  }, [navigate]);
  
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <DeviceProvider>
        <Toaster />
        <GlobalNotificationListener />
        <AppRoutes />
      </DeviceProvider>
    </AuthProvider>
  );
}
