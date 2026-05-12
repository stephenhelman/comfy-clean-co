// Phase 12: Role definitions and permission matrix
// Stub enforcement — real middleware wired in Phase 12

export const ROLES = {
  OWNER:      'owner',
  MANAGER:    'manager',
  BOOKKEEPER: 'bookkeeper',
  DISPATCHER: 'dispatcher',
  VIEWER:     'viewer',
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

export const ROLE_LABELS: Record<Role, string> = {
  owner:      'Owner',
  manager:    'Manager',
  bookkeeper: 'Bookkeeper',
  dispatcher: 'Dispatcher',
  viewer:     'Viewer',
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner:      'Full access to everything. Manages users, settings, and all financial data.',
  manager:    'Day-to-day operations. Manages clients, jobs, cleaners, and leads. No financial reports or payroll.',
  bookkeeper: 'Finance access only. Views invoices, payments, and exports payroll. Cannot touch scheduling.',
  dispatcher: 'Scheduling only. Creates and assigns jobs. Cannot see any financial data.',
  viewer:     'Read-only access to jobs and schedule. Cannot make any changes.',
}

export const PERMISSIONS = {
  // Dashboard sections
  'dashboard.financial':        ['owner', 'bookkeeper'],
  'dashboard.leads_card':       ['owner', 'manager'],
  'dashboard.payments_card':    ['owner', 'bookkeeper'],
  'dashboard.schedule':         ['owner', 'manager', 'dispatcher', 'viewer'],
  'dashboard.alerts.financial': ['owner', 'bookkeeper'],
  'dashboard.alerts.ops':       ['owner', 'manager', 'dispatcher'],

  // Leads
  'leads.view':                 ['owner', 'manager'],
  'leads.create':               ['owner', 'manager'],
  'leads.edit':                 ['owner', 'manager'],
  'leads.convert':              ['owner', 'manager'],
  'leads.mark_lost':            ['owner', 'manager'],

  // Clients
  'clients.view':               ['owner', 'manager', 'bookkeeper', 'dispatcher', 'viewer'],
  'clients.create':             ['owner', 'manager'],
  'clients.edit':               ['owner', 'manager'],
  'clients.deactivate':         ['owner', 'manager'],

  // Cleaners
  'cleaners.view':              ['owner', 'manager', 'dispatcher', 'viewer'],
  'cleaners.view_rate':         ['owner', 'bookkeeper'],
  'cleaners.create':            ['owner'],
  'cleaners.edit':              ['owner'],
  'cleaners.edit_timeclock':    ['owner', 'manager'],
  'cleaners.deactivate':        ['owner'],
  'cleaners.reset_pin':         ['owner', 'manager'],

  // Calendar and Jobs
  'jobs.view':                  ['owner', 'manager', 'bookkeeper', 'dispatcher', 'viewer'],
  'jobs.create':                ['owner', 'manager', 'dispatcher'],
  'jobs.edit':                  ['owner', 'manager', 'dispatcher'],
  'jobs.cancel':                ['owner', 'manager'],
  'jobs.assign_cleaner':        ['owner', 'manager', 'dispatcher'],
  'jobs.view_financial':        ['owner', 'bookkeeper'],
  'jobs.confirm_payment':       ['owner', 'manager', 'bookkeeper'],

  // Time Clock Records
  'timeclock.view':             ['owner', 'manager', 'bookkeeper'],
  'timeclock.edit_entry':       ['owner', 'manager'],

  // Invoices and Payments
  'invoices.view':              ['owner', 'bookkeeper'],
  'invoices.confirm_payment':   ['owner', 'manager', 'bookkeeper'],
  'invoices.resend':            ['owner', 'manager', 'bookkeeper'],
  'invoices.write_off':         ['owner', 'bookkeeper'],
  'invoices.void':              ['owner'],

  // Reports
  'reports.financial':          ['owner', 'bookkeeper'],
  'reports.operations':         ['owner', 'manager', 'bookkeeper', 'dispatcher', 'viewer'],
  'reports.payroll':            ['owner', 'bookkeeper'],
  'reports.clients':            ['owner', 'manager', 'bookkeeper'],
  'reports.export':             ['owner', 'bookkeeper'],

  // Reviews
  'reviews.view':               ['owner', 'manager', 'bookkeeper', 'viewer'],
  'reviews.acknowledge':        ['owner', 'manager'],
  'reviews.match':              ['owner', 'manager'],

  // Settings
  'settings.view':              ['owner'],
  'settings.edit':              ['owner'],

  // Communications
  'communications.view':        ['owner', 'manager', 'bookkeeper', 'viewer'],
  'communications.retry':       ['owner', 'manager'],

  // Users
  'users.view':                 ['owner'],
  'users.invite':               ['owner'],
  'users.edit_role':            ['owner'],
  'users.deactivate':           ['owner'],
} as const

export type Permission = keyof typeof PERMISSIONS

export function hasPermission(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role)
}

// Nav visibility per role
export const NAV_PERMISSIONS: Record<string, Permission> = {
  '/leads':          'leads.view',
  '/clients':        'clients.view',
  '/cleaners':       'cleaners.view',
  '/calendar':       'jobs.view',
  '/jobs':           'jobs.view',
  '/timeclock':      'timeclock.view',
  '/invoices':       'invoices.view',
  '/reports':        'reports.operations',
  '/reviews':        'reviews.view',
  '/settings':       'settings.view',
  '/communications': 'communications.view',
  '/users':          'users.view',
}
