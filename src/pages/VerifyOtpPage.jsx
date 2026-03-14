import React, { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { supabase } from '@/supabase/client'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function VerifyOtpPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const email = location.state?.email

  const [otp, setOtp] = useState(Array(6).fill(''))
  const [loading, setLoading] = useState(false)
  const [verified, setVerified] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef([])

  // If no email in state, redirect back
  if (!email) {
    return <Navigate to="/forgot-password" replace />
  }

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return // only digits
    const next = [...otp]
    next[index] = value
    setOtp(next)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    const token = otp.join('')
    if (token.length !== 6) {
      toast.error('Please enter all 6 digits')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    })

    if (error) {
      toast.error('Invalid or expired code. Try again.')
      setLoading(false)
      return
    }

    toast.success('Code verified!')
    setVerified(true)
    setLoading(false)
  }

  const handleResend = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('New code sent to your email')
    setResendCooldown(60)
    setOtp(Array(6).fill(''))
  }

  const handleSetPassword = async (e) => {
    e.preventDefault()

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setResettingPassword(true)

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      toast.error(error.message)
      setResettingPassword(false)
      return
    }

    toast.success('Password updated! You can now sign in.')
    navigate('/login')
  }

  // ── Set New Password form ──
  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">CoreInventory</CardTitle>
            <CardDescription>Set a new password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={resettingPassword}>
                {resettingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating…
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── OTP Entry form ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">CoreInventory</CardTitle>
          <CardDescription>
            Enter the 6-digit code sent to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="flex justify-center gap-2">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="h-12 w-12 rounded-md border border-input bg-background text-center text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              ))}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                'Verify Code'
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              {resendCooldown > 0 ? (
                <span>Resend code in {resendCooldown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-primary hover:underline"
                >
                  Resend code
                </button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
