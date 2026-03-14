import React, { createContext, useContext, useState } from 'react'
import { cn } from '@/utils/utils'

const DropdownMenuContext = createContext()

function DropdownMenu({ children }) {
  const [open, setOpen] = useState(false)
  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block text-left">{children}</div>
    </DropdownMenuContext.Provider>
  )
}

function DropdownMenuTrigger({ children, asChild, className }) {
  const { open, setOpen } = useContext(DropdownMenuContext)
  const handleClick = (e) => {
    e.stopPropagation()
    setOpen((o) => !o)
  }

  // close on outside click
  React.useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [open, setOpen])

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { onClick: handleClick, className: cn(children.props.className, className) })
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  )
}

function DropdownMenuContent({ children, className, align = 'start', sideOffset = 4 }) {
  const { open } = useContext(DropdownMenuContext)
  if (!open) return null

  return (
    <div
      className={cn(
        'absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95',
        align === 'end' ? 'right-0' : 'left-0',
        className,
      )}
      style={{ marginTop: `${sideOffset}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
}

function DropdownMenuItem({ children, className, onClick, ...props }) {
  const { setOpen } = useContext(DropdownMenuContext)
  return (
    <div
      role="menuitem"
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
        className,
      )}
      onClick={(e) => {
        onClick?.(e)
        setOpen(false)
      }}
      {...props}
    >
      {children}
    </div>
  )
}

function DropdownMenuSeparator({ className }) {
  return <div className={cn('-mx-1 my-1 h-px bg-muted', className)} />
}

function DropdownMenuLabel({ children, className }) {
  return <div className={cn('px-2 py-1.5 text-sm font-semibold', className)}>{children}</div>
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
}
