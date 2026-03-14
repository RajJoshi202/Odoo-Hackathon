import React, { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Package,
  ChevronDown,
  Menu,
  X,
  LayoutDashboard,
  ClipboardList,
  Truck,
  ArrowLeftRight,
  ArrowRightLeft,
  Boxes,
  History,
  Warehouse,
  MapPin,
  Settings,
  LogOut,
  User,
  ShoppingCart,
} from 'lucide-react'
import { cn } from '@/utils/utils'

const navLinkClass = ({ isActive }) =>
  cn(
    'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary text-primary-foreground'
      : 'text-foreground/70 hover:text-foreground hover:bg-accent',
  )

export default function MainLayout() {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  const userMeta = user?.user_metadata
  const displayName = userMeta?.full_name || user?.email || ''
  const avatarLetter = (displayName[0] || '?').toUpperCase()
  const userEmail = user?.email || ''
  const userRole = userMeta?.role || 'staff'

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  // ── Shared nav content ──
  const NavContent = ({ mobile = false }) => (
    <>
      {/* Dashboard */}
      <NavLink
        to="/"
        end
        className={navLinkClass}
        onClick={() => mobile && setMobileOpen(false)}
      >
        <LayoutDashboard className="h-4 w-4" />
        Dashboard
      </NavLink>

      {/* Operations dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-accent transition-colors">
            <ClipboardList className="h-4 w-4" />
            Operations
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => { navigate('/operations/receipts'); mobile && setMobileOpen(false) }}>
            <Truck className="h-4 w-4 mr-2" /> Receipts
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { navigate('/operations/deliveries'); mobile && setMobileOpen(false) }}>
            <ArrowRightLeft className="h-4 w-4 mr-2" /> Deliveries
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { navigate('/operations/adjustments'); mobile && setMobileOpen(false) }}>
            <ArrowLeftRight className="h-4 w-4 mr-2" /> Adjustments
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { navigate('/operations/transfers'); mobile && setMobileOpen(false) }}>
            <ArrowLeftRight className="h-4 w-4 mr-2" /> Transfers
          </DropdownMenuItem>

        </DropdownMenuContent>
      </DropdownMenu>

      {/* Products */}
      <NavLink
        to="/products"
        className={navLinkClass}
        onClick={() => mobile && setMobileOpen(false)}
      >
        <ShoppingCart className="h-4 w-4" />
        Products
      </NavLink>

      {/* Stock */}
      <NavLink
        to="/stock"
        className={navLinkClass}
        onClick={() => mobile && setMobileOpen(false)}
      >
        <Boxes className="h-4 w-4" />
        Stock
      </NavLink>

      {/* Move History */}
      <NavLink
        to="/move-history"
        className={navLinkClass}
        onClick={() => mobile && setMobileOpen(false)}
      >
        <History className="h-4 w-4" />
        Move History
      </NavLink>

      {/* Settings dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-accent transition-colors">
            <Settings className="h-4 w-4" />
            Settings
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => { navigate('/settings/warehouses'); mobile && setMobileOpen(false) }}>
            <Warehouse className="h-4 w-4 mr-2" /> Warehouses
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { navigate('/settings/locations'); mobile && setMobileOpen(false) }}>
            <MapPin className="h-4 w-4 mr-2" /> Locations
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 md:px-6">
          {/* Left side: user avatar */}
          <div className="flex items-center gap-2 mr-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
                  {avatarLetter}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{userEmail}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">Role: {userRole}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mr-6">
            <Package className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold hidden sm:inline-block">CoreInventory</span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            <NavContent />
          </nav>

          {/* Right side: Mobile hamburger */}
          <div className="ml-auto flex items-center gap-2">
            <button
              className="md:hidden ml-2 p-2 rounded-md hover:bg-accent transition-colors"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile slide-in sidebar ── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          {/* Sidebar */}
          <aside className="fixed inset-y-0 left-0 z-30 w-64 bg-background border-r p-4 flex flex-col gap-1 md:hidden overflow-y-auto animate-in slide-in-from-left">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">CoreInventory</span>
            </div>
            <NavContent mobile />
          </aside>
        </>
      )}

      {/* ── Page content ── */}
      <main>
        <Outlet />
      </main>
    </div>
  )
}
