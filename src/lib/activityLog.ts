// C-10: Master ActivityLog event type constants
// All phases must import from here — no raw strings

export const ACTIVITY_EVENTS = {
  // Leads
  LEAD_SUBMITTED:           'lead_submitted',
  LEAD_CONTACTED:           'lead_contacted',
  LEAD_CALL_LOGGED:         'lead_call_logged',
  LEAD_QUOTE_SENT:          'lead_quote_sent',
  LEAD_CONVERTED:           'lead_converted',
  LEAD_LOST:                'lead_lost',
  LEAD_REOPENED:            'lead_reopened',
  LEAD_DUPLICATE:           'lead_duplicate',
  LEAD_CREATED_MANUAL:      'lead_created_manual',

  // Clients
  CLIENT_CREATED:           'client_created',
  CLIENT_UPDATED:           'client_updated',
  CLIENT_DEACTIVATED:       'client_deactivated',
  CLIENT_REACTIVATED:       'client_reactivated',
  CLIENT_NOTES_UPDATED:     'client_notes_updated',

  // Cleaners
  CLEANER_CREATED:          'cleaner_created',
  CLEANER_UPDATED:          'cleaner_updated',
  CLEANER_DEACTIVATED:      'cleaner_deactivated',
  CLEANER_REACTIVATED:      'cleaner_reactivated',
  CLEANER_PIN_RESET:        'cleaner_pin_reset',
  CLEANER_PIN_UNLOCKED:     'cleaner_pin_unlocked',
  CLEANER_TIMECLOCK_EDITED: 'cleaner_timeclock_edited',

  // Jobs
  JOB_CREATED:              'job_created',
  JOB_EDITED:               'job_edited',
  JOB_CANCELLED:            'job_cancelled',
  JOB_BUMPED:               'job_bumped',
  JOB_LOCK_OUT:             'job_lock_out',
  JOB_COMPLETED:            'job_completed',
  CLEANER_ASSIGNED:         'cleaner_assigned',
  CLEANER_REMOVED:          'cleaner_removed',

  // Invoices and Payments
  INVOICE_SENT:             'invoice_sent',
  INVOICE_RESENT:           'invoice_resent',
  INVOICE_OVERDUE:          'invoice_overdue',
  INVOICE_VOIDED:           'invoice_voided',
  INVOICE_WRITTEN_OFF:      'invoice_written_off',
  INVOICE_GENERATION_SKIP:  'invoice_generation_skipped',
  PAYMENT_LINK_CLICKED:     'payment_link_clicked',
  PAYMENT_CONFIRMED:        'payment_confirmed',
  APPOINTMENT_CONFIRMED:    'appointment_confirmed',
  RECEIPT_SENT:             'receipt_sent',

  // Reviews
  REVIEW_REQUEST_QUEUED:    'review_request_queued',
  REVIEW_REQUEST_SKIPPED:   'review_request_skipped',
  REVIEW_REQUEST_SENT:      'review_request_sent',
  REVIEW_LINK_CLICKED:      'review_link_clicked',
  REVIEW_RECEIVED:          'review_received',
  NEGATIVE_REVIEW_RECEIVED: 'negative_review_received',
  NEGATIVE_REVIEW_ACK:      'negative_review_acknowledged',
  REVIEW_AUTO_MATCHED:      'review_auto_matched',
  REVIEW_MANUAL_MATCHED:    'review_manual_matched',

  // Users
  USER_INVITED:             'user_invited',
  USER_INVITE_ACCEPTED:     'user_invite_accepted',
  USER_INVITE_RESENT:       'user_invite_resent',
  USER_ROLE_CHANGED:        'user_role_changed',
  USER_DEACTIVATED:         'user_deactivated',
  USER_REACTIVATED:         'user_reactivated',

  // Settings
  SETTINGS_UPDATED:         'settings_updated',
  BLACKOUT_ADDED:           'blackout_date_added',
  BLACKOUT_REMOVED:         'blackout_date_removed',

  // Automations
  AUTOMATION_TOGGLED:       'automation_toggled',
  GLOBAL_PAUSE_ENABLED:     'global_pause_enabled',
  GLOBAL_PAUSE_DISABLED:    'global_pause_disabled',
  REMINDERS_SENT:           'appointment_reminders_sent',
  STALE_LEAD_ALERT:         'stale_lead_alert_sent',
  OVERDUE_INVOICE_ALERT:    'overdue_invoice_alert_sent',
  OPEN_CLOCK_ALERT:         'open_clock_entry_alert_sent',
  CAPACITY_WARNING:         'capacity_warning_sent',

  // SMS Opt-In
  SMS_OPT_IN_CONFIRMED:     'sms_opt_in_confirmed',
  SMS_OPT_OUT:              'sms_opted_out',
  SMS_OPT_IN_OVERRIDE:      'sms_opt_in_admin_override',

  // Cleaner Portal (Portal Phase 1+)
  CLEANER_DEVICE_RESET:     'cleaner_device_reset',
  CLEANER_PIN_LOCKED_PORTAL:'cleaner_pin_locked_portal',
  CLEANER_CLOCKED_IN:       'cleaner_clocked_in',
  CLEANER_CLOCKED_OUT:      'cleaner_clocked_out',
} as const

export type ActivityEventType = typeof ACTIVITY_EVENTS[keyof typeof ACTIVITY_EVENTS]

// Helper to write an activity log entry
import { db } from './db'

interface LogActivityParams {
  eventType: ActivityEventType
  description: string
  linkPath?: string
  actorName?: string
  actorId?: string
}

export async function logActivity(params: LogActivityParams) {
  await db.activityLog.create({
    data: {
      eventType: params.eventType,
      description: params.description,
      linkPath: params.linkPath ?? null,
      actorName: params.actorName ?? null,
      actorId: params.actorId ?? null,
    },
  })
}
