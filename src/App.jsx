import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import ProtectedRoute from '@/components/ProtectedRoute'
import MainLayout from '@/layouts/MainLayout'

// Auth pages
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import VerifyOtpPage from '@/pages/VerifyOtpPage'

// Protected pages
import DashboardPage from '@/pages/DashboardPage'
import ReceiptsPage from '@/pages/ReceiptsPage'
import ReceiptDetailsPage from '@/pages/ReceiptDetailsPage'
import DeliveriesPage from '@/pages/DeliveriesPage'
import DeliveryDetailsPage from '@/pages/DeliveryDetailsPage'
import AdjustmentsPage from '@/pages/AdjustmentsPage'
import TransfersPage from '@/pages/TransfersPage'
import ProductsPage from '@/pages/ProductsPage'
import StockPage from '@/pages/StockPage'
import MoveHistoryPage from '@/pages/MoveHistoryPage'
import WarehousesPage from '@/pages/WarehousesPage'
import LocationsPage from '@/pages/LocationsPage'

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Routes>
        {/* ── Public Routes ── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />

        {/* ── Protected Routes wrapped in MainLayout ── */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />

          <Route path="operations/receipts" element={<ReceiptsPage />} />
          <Route path="operations/receipts/:id" element={<ReceiptDetailsPage />} />

          <Route path="operations/deliveries" element={<DeliveriesPage />} />
          <Route path="operations/deliveries/:id" element={<DeliveryDetailsPage />} />

          <Route path="operations/adjustments" element={<AdjustmentsPage />} />
          <Route path="operations/transfers" element={<TransfersPage />} />

          <Route path="products" element={<ProductsPage />} />

          <Route path="stock" element={<StockPage />} />
          <Route path="move-history" element={<MoveHistoryPage />} />

          <Route path="settings/warehouses" element={<WarehousesPage />} />
          <Route path="settings/locations" element={<LocationsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
