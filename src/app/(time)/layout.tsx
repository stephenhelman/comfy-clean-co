// PC-03: Single root layout — no session check, no bottom nav, no install prompt.
// Session check lives in each protected page. PIN page gets this layout only.
// PC-21: Bottom nav is rendered per protected page, not here.

export const metadata = {
  title: 'Comfy Clean',
  description: 'Comfy Clean cleaner portal',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default' as const,
    title: 'Comfy Clean',
  },
}

export default function TimeLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Comfy Clean" />
        <meta name="theme-color" content="#0D9488" />
        <link rel="apple-touch-icon" href="/images/brand/pwa-icon-192.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-gray-50 max-w-md mx-auto min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  )
}
