import { createServiceRoleClient } from '@/lib/supabase/service-role'

interface AuditEntry {
  subsystem: string
  action: string
  item_type: string
  item_id?: string
  item_key?: string
  success: boolean
  error_message?: string
  metadata?: Record<string, unknown>
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const supabase = createServiceRoleClient()
    const { error } = await supabase.from('admin_audit_log').insert({
      ...entry,
      metadata: entry.metadata ?? {},
    })

    if (error) {
      console.error('[audit] Failed to write audit log:', error.message)
    }
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err)
  }
}
