import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/supabase/client'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select'
import { Loader2, ShieldCheck, User } from 'lucide-react'

const signupSchema = z
  .object({
    login_id: z
      .string()
      .min(6, 'Login ID must be at least 6 characters')
      .max(12, 'Login ID must be at most 12 characters')
      .regex(/^[a-zA-Z0-9]+$/, 'Only letters and numbers allowed'),
    full_name: z.string().min(1, 'Full Name is required'),
    email: z.string().email('Invalid email format'),
    role: z.enum(['manager', 'staff'], { required_error: 'Select a role' }),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[^a-zA-Z0-9]/, 'Must contain a special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export default function SignupPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: 'staff' },
  })

  const onSubmit = async (values) => {
    setLoading(true)

    // Check if login_id already exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('login_id', values.login_id)
      .maybeSingle()

    if (existing) {
      toast.error('Login ID already taken')
      setLoading(false)
      return
    }

    // Sign up — pass role in user_metadata so the DB trigger can use it
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          login_id: values.login_id,
          full_name: values.full_name,
          role: values.role,           // ← role now passed to metadata
        },
      },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    // Also update the profiles table directly in case the trigger
    // doesn't use the role from metadata (trigger default is 'staff')
    if (signUpData?.user) {
      await supabase
        .from('profiles')
        .update({ role: values.role })
        .eq('id', signUpData.user.id)
    }

    toast.success('Account created! Check your email to confirm.')
    setLoading(false)
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">CoreInventory</CardTitle>
          <CardDescription>Create a new account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Login ID */}
            <div className="space-y-2">
              <Label htmlFor="login_id">Login ID</Label>
              <Input id="login_id" placeholder="e.g. john42" {...register('login_id')} />
              {errors.login_id && (
                <p className="text-sm text-destructive">{errors.login_id.message}</p>
              )}
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" placeholder="John Doe" {...register('full_name')} />
              {errors.full_name && (
                <p className="text-sm text-destructive">{errors.full_name.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Role selector */}
            <div className="space-y-2">
              <Label>Role</Label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="role">
                      {field.value === 'manager' ? (
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-violet-600" /> Manager
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-500" /> Staff
                        </span>
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-violet-600" />
                          Manager — Full access
                        </span>
                      </SelectItem>
                      <SelectItem value="staff">
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-500" />
                          Staff — Limited access
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role && (
                <p className="text-sm text-destructive">{errors.role.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Manager can manage products, warehouses, and settings. Staff can handle day-to-day operations.
              </p>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Re-enter Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                'Sign Up'
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Sign In
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
