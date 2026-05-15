export const COMM_EVENT_TYPES = {
  // Lead events
  SMS_OPT_IN:               'sms_opt_in',
  SMS_WELCOME:              'sms_welcome',

  // Job / Invoice events
  INVOICE_SENT:             'invoice_sent',
  INVOICE_RESENT:           'invoice_resent',
  APPOINTMENT_CONFIRMED:    'appointment_confirmed',
  APPOINTMENT_REMINDER:     'appointment_reminder',
  CLEANER_ON_THE_WAY:       'cleaner_on_the_way',
  PAYMENT_RECEIPT:          'payment_receipt',

  // Review events
  REVIEW_REQUEST:           'review_request',

  // Admin alerts
  ADMIN_NEW_LEAD:           'admin_new_lead',
  ADMIN_NEGATIVE_REVIEW:    'admin_negative_review',
  ADMIN_OVERDUE_INVOICE:    'admin_overdue_invoice',
  ADMIN_OPEN_CLOCK_ENTRY:   'admin_open_clock_entry',
  ADMIN_STALE_LEAD:         'admin_stale_lead',
  ADMIN_PIN_LOCKED:         'admin_pin_locked',

  // Inbound
  SMS_REPLY_OPTIN:          'sms_reply_optin',
  SMS_REPLY_OPTOUT:         'sms_reply_optout',
  SMS_REPLY_OTHER:          'sms_reply_other',
} as const

export type CommEventType = typeof COMM_EVENT_TYPES[keyof typeof COMM_EVENT_TYPES]

// Human-readable display labels for the admin UI
export const COMM_EVENT_LABELS: Record<string, string> = {
  sms_opt_in:             'SMS Opt-In Request',
  sms_welcome:            'SMS Welcome Message',
  invoice_sent:           'Invoice Sent',
  invoice_resent:         'Invoice Resent',
  appointment_confirmed:  'Appointment Confirmed',
  appointment_reminder:   'Appointment Reminder',
  cleaner_on_the_way:     'Cleaner On The Way',
  payment_receipt:        'Payment Receipt',
  review_request:         'Review Request',
  admin_new_lead:         'Admin — New Lead Alert',
  admin_negative_review:  'Admin — Negative Review Alert',
  admin_overdue_invoice:  'Admin — Overdue Invoice Alert',
  admin_open_clock_entry: 'Admin — Open Clock Entry',
  admin_stale_lead:       'Admin — Stale Lead Alert',
  admin_pin_locked:       'Admin — PIN Locked',
  sms_reply_optin:        'SMS Reply — Opted In',
  sms_reply_optout:       'SMS Reply — Opted Out',
  sms_reply_other:        'SMS Inbound Reply',
}

// sendSms() appends "\n\nReply STOP to unsubscribe." automatically — never include it here
export const SMS_TEMPLATES = {

  OPT_IN: () =>
    `Comfy Clean Co.: Reply YES to receive appointment updates and cleaning reminders via text. Msg & data rates may apply.`,

  WELCOME: () =>
    `Welcome to Comfy Clean Co.! We're excited to work with you. We'll keep you updated on your appointments right here. — Comfy Clean Team`,

  INVOICE_SENT: (params: {
    firstName: string
    date: string
    amount: string
    payLink: string
  }) =>
    `Hi ${params.firstName}, your Comfy Clean appointment on ${params.date} is ready. Pay $${params.amount} here: ${params.payLink}`,

  APPOINTMENT_CONFIRMED: (params: {
    firstName: string
    date: string
    time: string
  }) =>
    `Your Comfy Clean appointment on ${params.date} at ${params.time} is confirmed. See you then! — Comfy Clean Co.`,

  PAYMENT_RECEIPT: (params: {
    firstName: string
    amount: string
    date: string
  }) =>
    `Payment received! $${params.amount} for your ${params.date} cleaning. Thank you for choosing Comfy Clean Co.`,

  // C-28: review.comfycleanco.com — SINGULAR, never reviews.
  REVIEW_REQUEST: (params: {
    firstName: string
    date: string
    reviewLink: string
  }) =>
    `Hi ${params.firstName}! How was your Comfy Clean service on ${params.date}? We'd love a review: ${params.reviewLink}`,

  CLEANER_ON_THE_WAY: (params: {
    firstName: string
    cleanerName: string
  }) =>
    `Hi ${params.firstName}, your Comfy Clean cleaner ${params.cleanerName} is on the way! — Comfy Clean Co.`,

  APPOINTMENT_REMINDER: (params: {
    firstName: string
    date: string
    time: string
  }) =>
    `Reminder: Your Comfy Clean appointment is tomorrow, ${params.date} at ${params.time}. — Comfy Clean Co.`,

  ADMIN_NEW_LEAD: (params: {
    name: string
    phone: string
    type: string
  }) =>
    `New lead: ${params.name} — ${params.phone} — ${params.type} cleaning.`,

  ADMIN_NEGATIVE_REVIEW: (params: {
    rating: number
    author: string
  }) =>
    `New ${params.rating}-star review from ${params.author}. Check admin for details.`,

  ADMIN_OVERDUE_INVOICE: (params: {
    clientName: string
    invoiceNumber: string
    amount: string
  }) =>
    `Invoice ${params.invoiceNumber} overdue — ${params.clientName} owes $${params.amount}.`,

  ADMIN_OPEN_CLOCK_ENTRY: (params: {
    cleanerName: string
    jobAddress: string
  }) =>
    `${params.cleanerName} never clocked out of ${params.jobAddress}. Check admin.`,

  ADMIN_STALE_LEAD: (params: {
    name: string
    hoursAgo: number
  }) =>
    `Lead from ${params.name} has been waiting ${params.hoursAgo} hours with no contact.`,
}
