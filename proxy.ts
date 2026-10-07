import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Routes that don't require authentication at all
const publicRoutes = ["/sign-in", "/sign-up", "/error", "/judgingportal"];

// API routes that should be accessible without auth
const publicApiRoutes = ["/api/auth"];

// Routes accessible to authenticated but not-yet-approved users
const pendingRoutes = ["/pending-approval"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow auth API routes
  if (publicApiRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow pending-approval route (authenticated users who aren't approved yet)
  if (pendingRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check for session using Better Auth's cookie helper
  const sessionCookie = getSessionCookie(request);

  // If no session, redirect to sign-in
  if (!sessionCookie) {
    if (
      pathname.startsWith("/api/registration") ||
      pathname === "/api/qr" ||
      pathname.startsWith("/api/participants/")
    ) {
      return NextResponse.json({ error: "Forbidden", message: "Forbidden" }, { status: 403 });
    }
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Session exists - let the request through.
  // Approval status is checked server-side in the (protected) layout
  // because middleware can't do DB queries on the Edge.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
