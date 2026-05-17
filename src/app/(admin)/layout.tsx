import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import AdminNav from '@/components/admin/AdminNav'
import AdminProviders from '@/components/admin/AdminProviders'
import '@/app/globals.css'

export const metadata: Metadata = {
  title: { default: 'Admin | Comfy Clean Co.', template: '%s | Comfy Clean Co. Admin' },
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session) redirect('/login')
  if (!session.user.active) redirect('/login?reason=deactivated')

  return (
    <html lang="en">
      <body className="bg-brand-off-white">
        <AdminProviders session={session}>
          <div className="flex h-screen overflow-hidden">
            <AdminNav
              role={session.user.role}
              userName={session.user.name}
              userEmail={session.user.email}
            />
            <div className="flex-1 flex flex-col overflow-hidden lg:pt-0 pt-14">
              <main className="flex-1 overflow-y-auto">
                {children}
              </main>
            </div>
          </div>
        </AdminProviders>
      </body>
    </html>
  )
}
