import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import type { Role, Permission } from "@/lib/permissions";

// ─── i18n middleware for the marketing site ───────────────────────────────────
const intlMiddleware = createMiddleware({
  locales: ["en", "es"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

// ─── Role-protected admin routes ──────────────────────────────────────────────
const ROLE_PROTECTED_ROUTES: Record<string, Permission> = {
  "/leads": "leads.view",
  "/clients": "clients.view",
  "/cleaners": "cleaners.view",
  "/calendar": "jobs.view",
  "/jobs": "jobs.view",
  "/timeclock": "timeclock.view",
  "/invoices": "invoices.view",
  "/reports": "reports.operations",
  "/reviews": "reviews.view",
  "/settings": "settings.view",
  "/communications": "communications.view",
  "/users": "users.view",
};

function getRoleFallback(role: Role): string {
  switch (role) {
    case "bookkeeper":
      return "/invoices";
    case "dispatcher":
      return "/calendar";
    case "viewer":
      return "/calendar";
    default:
      return "/dashboard";
  }
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get("host") ?? "";

  // Strip port for local dev (localhost:3000 → localhost)
  const host = hostname.split(":")[0];

  // ─── admin.comfycleanco.com → /admin/* ─────────────────────────────────────
  if (host.startsWith("admin.")) {
    const session = await auth();

    // Public admin routes (no auth required)
    const publicPaths = ["/login", "/accept-invite", "/api/auth"];
    const isPublic = publicPaths.some((p) => url.pathname.startsWith(p));

    if (!session && !isPublic) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (session) {
      // Block deactivated users immediately
      if (!session.user.active) {
        return NextResponse.redirect(
          new URL("/login?reason=deactivated", request.url),
        );
      }

      // Redirect admin root — avoids conflict with marketing site's src/app/page.tsx
      if (url.pathname === "/") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }

      // Role-based route protection
      const userRole = session.user.role as Role;
      const matchedRoute = Object.keys(ROLE_PROTECTED_ROUTES)
        .filter((route) => url.pathname.startsWith(route))
        .sort((a, b) => b.length - a.length)[0];

      if (matchedRoute) {
        const required = ROLE_PROTECTED_ROUTES[matchedRoute];
        if (!hasPermission(userRole, required)) {
          const fallback = getRoleFallback(userRole);
          return NextResponse.redirect(new URL(fallback, request.url));
        }
      }
    }

    return NextResponse.next();
  }

  // ─── time.comfycleanco.com → app/(time)/ route group ──────────────────────
  if (host === "time.comfycleanco.com" || host === "time.localhost") {
    const pathname = url.pathname

    // Check session cookie for all protected routes
    if (pathname !== '/pin' && !pathname.startsWith('/_next') && !pathname.startsWith('/api')) {
      const sessionCookie = request.cookies.get('cleaner-session')?.value
      if (!sessionCookie) {
        const pinUrl = new URL(request.url)
        pinUrl.pathname = '/pin'
        return NextResponse.redirect(pinUrl)
      }
    }

    // Next.js route group strips (time) — routes resolve at /home, /calendar, /hours, /pin
    return NextResponse.next()
  }

  // ─── pay.comfycleanco.com → /pay-redirect/* (C-19) ────────────────────────
  if (host === "pay.comfycleanco.com" || host === "pay.localhost") {
    return NextResponse.rewrite(
      new URL(`/pay-redirect${url.pathname}`, request.url),
    );
  }

  // ─── review.comfycleanco.com → /review-redirect/* (C-24: SINGULAR) ────────
  if (host === "review.comfycleanco.com" || host === "review.localhost") {
    return NextResponse.rewrite(
      new URL(`/review-redirect${url.pathname}`, request.url),
    );
  }

  // ─── comfycleanco.com → marketing site with i18n ──────────────────────────
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
