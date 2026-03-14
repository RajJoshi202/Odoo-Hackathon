import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/supabase/client'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({ email })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success('OTP code sent to your email')
    navigate('/verify-otp', { state: { email } })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">CoreInventory</CardTitle>
          <CardDescription>Reset your password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending OTP…
                </>
              ) : (
                'Send OTP'
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <Link to="/login" className="text-primary hover:underline">
                Back to Sign In
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
