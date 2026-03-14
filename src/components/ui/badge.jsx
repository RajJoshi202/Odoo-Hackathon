import React from 'react'
import { cn } from '@/utils/utils'

const variants = {
  default: 'border-transparent bg-primary text-primary-foreground',
  secondary: 'border-transparent bg-secondary text-secondary-foreground',
  destructive: 'border-transparent bg-destructive text-destructive-foreground',
  outline: 'text-foreground',
  gray: 'border-transparent bg-gray-100 text-gray-700',
  blue: 'border-transparent bg-blue-100 text-blue-700',
  green: 'border-transparent bg-green-100 text-green-700',
  red: 'border-transparent bg-red-100 text-red-700',
  yellow: 'border-transparent bg-yellow-100 text-yellow-700',
}

function Badge({ className, variant = 'default', children, ...props }) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Badge }
