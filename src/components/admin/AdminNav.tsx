'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState } from 'react'
import {
  LayoutDashboard, UserPlus, Users, Sparkles, Calendar, Briefcase,
  Clock, FileText, BarChart2, Star, MessageSquare, Settings, Shield,
  ChevronRight, LogOut, Menu, X,
} from 'lucide-react'
import { hasPermission } from '@/lib/permissions'
import type { Role, Permission } from '@/lib/permissions'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  permission?: Permission
}

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: '',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Business',
    items: [
      { href: '/leads',    label: 'Leads',    icon: UserPlus,  permission: 'leads.view' },
      { href: '/clients',  label: 'Clients',  icon: Users,     permission: 'clients.view' },
      { href: '/cleaners', label: 'Cleaners', icon: Sparkles,  permission: 'cleaners.view' },
    ],
  },
  {
    label: 'Scheduling',
    items: [
      { href: '/calendar',  label: 'Calendar',   icon: Calendar,  permission: 'jobs.view' },
      { href: '/jobs',      label: 'Jobs',        icon: Briefcase, permission: 'jobs.view' },
      { href: '/timeclock', label: 'Time Clock',  icon: Clock,     permission: 'timeclock.view' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/invoices', label: 'Invoices', icon: FileText,  permission: 'invoices.view' },
      { href: '/reports',  label: 'Reports',  icon: BarChart2, permission: 'reports.operations' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/reviews',        label: 'Reviews',        icon: Star,         permission: 'reviews.view' },
      { href: '/communications', label: 'Communications', icon: MessageSquare, permission: 'communications.view' },
      { href: '/settings',       label: 'Settings',       icon: Settings,      permission: 'settings.view' },
      { href: '/users',          label: 'Users',          icon: Shield,        permission: 'users.view' },
    ],
  },
]

interface Props {
  role: string
  userName: string | null | undefined
  userEmail: string | null | undefined
}

export default function AdminNav({ role, userName, userEmail }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  function canView(permission?: Permission) {
    if (!permission) return true
    return hasPermission(role as Role, permission)
  }

  async function handleSignOut() {
    await signOut({ redirect: false })
    router.push('/login')
  }

  const sidebar = (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight" style={{ fontFamily: 'var(--font-poppins)' }}>
              Comfy Clean Co.
            </p>
            <p className="text-white/50 text-xs">Admin Portal</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-4 space-y-6 px-3">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => canView(item.permission))
          if (visibleItems.length === 0) return null
          return (
            <div key={section.label || 'main'}>
              {section.label && (
                <p className="text-white/40 text-xs font-semibold uppercase tracking-wider px-2 mb-1">
                  {section.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active = isActive(item.href)
                  const Icon = item.icon
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group ${
                          active
                            ? 'bg-white/15 text-white'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-brand-green' : 'text-white/50 group-hover:text-white/80'}`} />
                        <span className="flex-1">{item.label}</span>
                        {active && <ChevronRight className="w-3 h-3 text-white/40" />}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-brand-green/30 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">
              {userName?.charAt(0)?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{userName ?? 'Admin'}</p>
            <p className="text-white/40 text-xs truncate">{userEmail}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </nav>
  )

  return (
    <>
      {/* Mobile header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-brand-navy-dark flex items-center justify-between px-4 h-14 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-brand-green rounded flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <span className="text-white text-sm font-semibold" style={{ fontFamily: 'var(--font-poppins)' }}>
            Comfy Clean Co.
          </span>
        </div>
        <button onClick={() => setMobileOpen((v) => !v)} className="text-white p-1">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed top-14 left-0 bottom-0 z-40 w-64 bg-brand-navy-dark transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebar}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-brand-navy-dark shrink-0">
        {sidebar}
      </aside>
    </>
  )
}
