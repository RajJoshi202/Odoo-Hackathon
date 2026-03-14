import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ShieldAlert } from 'lucide-react'

/**
 * ProtectedRoute
 * ==============
 * Guards routes behind authentication and optionally a specific role.
 *
 * Props:
 *   requiredRole?: 'manager' | 'staff'
 *     If provided, only users with that role (or higher) can access the route.
 *     'manager' = manager only.
 *     'staff'   = both manager and staff (since manager > staff).
 *
 * Usage:
 *   // Auth-only (any role):
 *   <ProtectedRoute><MyPage /></ProtectedRoute>
 *
 *   // Manager-only:
 *   <ProtectedRoute requiredRole="manager"><SettingsPage /></ProtectedRoute>
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const { session, role, loading } = useAuthStore()

  // ── Still initializing ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading session…</p>
      </div>
    )
  }

  // ── Not logged in ──
  if (!session) {
    return <Navigate to="/login" replace />
  }

  // ── Logged in but wrong role ──
  if (requiredRole && requiredRole === 'manager' && role !== 'manager') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-red-100">
              <ShieldAlert className="h-10 w-10 text-red-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-muted-foreground">
            This page is restricted to <span className="font-semibold text-red-600">Manager</span> accounts only.
          </p>
          <p className="text-sm text-muted-foreground">
            Your current role is: <span className="font-semibold capitalize">{role ?? 'unknown'}</span>
          </p>
          <a
            href="/"
            className="inline-block mt-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  return children
}
