import React, { createContext, useContext, useState, useRef, useEffect } from 'react'
import { cn } from '@/utils/utils'
import { ChevronDown, Check } from 'lucide-react'

const SelectContext = createContext()

function Select({ value, onValueChange, children }) {
  const [open, setOpen] = useState(false)
  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  )
}

function SelectTrigger({ children, className, placeholder }) {
  const { value, open, setOpen } = useContext(SelectContext)
  const ref = useRef()

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (ref.current && !ref.current.parentElement.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open, setOpen])

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => setOpen((o) => !o)}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      <span className={cn(!value && 'text-muted-foreground')}>
        {children || placeholder || 'Select...'}
      </span>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  )
}

function SelectContent({ children, className }) {
  const { open } = useContext(SelectContext)
  if (!open) return null

  return (
    <div className={cn(
      'absolute z-50 mt-1 w-full min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95',
      className,
    )}>
      {children}
    </div>
  )
}

function SelectItem({ value: itemValue, children, className }) {
  const { value, onValueChange, setOpen } = useContext(SelectContext)
  const isSelected = value === itemValue

  return (
    <div
      role="option"
      aria-selected={isSelected}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
        isSelected && 'bg-accent',
        className,
      )}
      onClick={() => {
        onValueChange(itemValue)
        setOpen(false)
      }}
    >
      {isSelected && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <Check className="h-4 w-4" />
        </span>
      )}
      {children}
    </div>
  )
}

function SelectValue({ placeholder }) {
  const { value } = useContext(SelectContext)
  return <>{value || placeholder}</>
}

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue }
