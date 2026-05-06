import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

// Staff CAN do: add material, record purchase, receive purchase,
//               advance production, edit design files, generate reports
// Staff CANNOT do: adjust stock, update/edit job orders, archive anything

const STAFF_ALLOWED = [
  'add_material',
  'record_purchase',
  'receive_purchase',
  'advance_production',
  'edit_design_file',
  'generate_report',
  'view_details',
]

const DENIED_MESSAGES = {
  adjust_stock:    { title: 'Access Restricted', msg: 'Stock adjustment is an Admin-only action. Please ask your Administrator to adjust the stock level for this material.' },
  update_order:    { title: 'Access Restricted', msg: 'Editing job orders is an Admin-only action. Please ask your Administrator to update this order.' },
  archive:         { title: 'Access Restricted', msg: 'Archiving records is an Admin-only action. Please ask your Administrator to perform this action.' },
  restore:         { title: 'Access Restricted', msg: 'Restoring archived records is an Admin-only action. Please ask your Administrator to perform this action.' },
  delete_record:   { title: 'Access Restricted', msg: 'Permanently deleting records is an Admin-only action. Please contact your Administrator.' },
  settings:        { title: 'Access Restricted', msg: 'System settings can only be modified by an Administrator.' },
  clear_data:      { title: 'Access Restricted', msg: 'Clearing system data is an Admin-only action.' },
  update_material: { title: 'Access Restricted', msg: 'Updating material details is an Admin-only action. Please ask your Administrator to make changes to this material.' },
}

export function usePermission() {
  const { currentUser } = useAuth()
  const [denied, setDenied] = useState(null) // { title, msg }

  const isAdmin = currentUser?.role === 'Admin'
  const isStaff = currentUser?.role === 'Staff'

  const can = (action) => {
    if (isAdmin) return true
    return STAFF_ALLOWED.includes(action)
  }

  const guard = (action, callback) => {
    if (can(action)) {
      callback()
    } else {
      const info = DENIED_MESSAGES[action] || { title: 'Access Restricted', msg: 'You do not have permission to perform this action. Please contact your Administrator.' }
      setDenied(info)
    }
  }

  const clearDenied = () => setDenied(null)

  return { isAdmin, isStaff, can, guard, denied, clearDenied }
}
