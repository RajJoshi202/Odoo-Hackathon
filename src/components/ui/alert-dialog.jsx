import React, { createContext, useContext } from 'react'
import { cn } from '@/utils/utils'
import { Button } from '@/components/ui/button'

const AlertDialogContext = createContext()

function AlertDialog({ open, onOpenChange, children }) {
  return (
    <AlertDialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </AlertDialogContext.Provider>
  )
}

function AlertDialogContent({ children, className }) {
  const { open, onOpenChange } = useContext(AlertDialogContext)
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className={cn(
        'relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg animate-in fade-in-0 zoom-in-95',
        className
      )}>
        {children}
      </div>
    </div>
  )
}

function AlertDialogHeader({ className, ...props }) {
  return <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />
}

function AlertDialogTitle({ className, ...props }) {
  return <h2 className={cn('text-lg font-semibold', className)} {...props} />
}

function AlertDialogDescription({ className, ...props }) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

function AlertDialogFooter({ className, ...props }) {
  return <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4', className)} {...props} />
}

function AlertDialogCancel({ children, className, ...props }) {
  const { onOpenChange } = useContext(AlertDialogContext)
  return (
    <Button variant="outline" className={className} onClick={() => onOpenChange(false)} {...props}>
      {children || 'Cancel'}
    </Button>
  )
}

function AlertDialogAction({ children, className, onClick, ...props }) {
  const { onOpenChange } = useContext(AlertDialogContext)
  return (
    <Button
      variant="destructive"
      className={className}
      onClick={(e) => { onClick?.(e); onOpenChange(false) }}
      {...props}
    >
      {children || 'Continue'}
    </Button>
  )
}

export {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
}
