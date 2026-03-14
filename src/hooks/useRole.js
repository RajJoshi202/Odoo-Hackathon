/**
 * useRole — Role-based access control helpers
 * ============================================
 * Provides a clean API for checking the currently logged-in user's role.
 *
 * Usage:
 *   const { role, isManager, isStaff, can } = useRole()
 *
 *   // Guard a button:
 *   {isManager && <Button>Delete</Button>}
 *
 *   // Guard an action:
 *   if (!can('manage_products')) return
 */

import { useAuthStore } from '@/store/authStore'

// Permission → role mapping
// Add new permissions here as the app grows
const PERMISSIONS = {
  manage_products:    ['manager'],
  manage_warehouses:  ['manager'],
  manage_locations:   ['manager'],
  view_ai_insights:   ['manager', 'staff'],
  create_receipts:    ['manager', 'staff'],
  create_deliveries:  ['manager', 'staff'],
  create_transfers:   ['manager', 'staff'],
  create_adjustments: ['manager'],
  view_stock:         ['manager', 'staff'],
  view_move_history:  ['manager', 'staff'],
}

export function useRole() {
  const role = useAuthStore((s) => s.role)

  const isManager = role === 'manager'
  const isStaff   = role === 'staff'

  /**
   * Check if the current user has permission to perform an action.
   * @param {keyof typeof PERMISSIONS} permission
   * @returns {boolean}
   */
  const can = (permission) => {
    const allowed = PERMISSIONS[permission]
    if (!allowed) return false
    return allowed.includes(role)
  }

  return { role, isManager, isStaff, can }
}
