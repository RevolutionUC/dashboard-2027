import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Routes that don't require authentication at all
const publicRoutes = ["/sign-in", "/sign-up", "/error", "/judgingportal", "/auth"];

// Routes accessible to authenticated but not-yet-approved users
const pendingRoutes = ["/pending-approval"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Refresh the Supabase session cookies on every request
  const { response, user } = await updateSession(request);

  // Signed-in users don't need the sign-in / sign-up pages
  if (user && (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up"))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return response;
  }

  // Allow pending-approval route (authenticated users who aren't approved yet)
  if (pendingRoutes.some((route) => pathname.startsWith(route))) {
    return response;
  }

  // If no Supabase user, redirect to sign-in
  if (!user) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Session exists - let the request through.
  // Approval status is checked server-side in the (protected) layout
  // because middleware can't do DB queries on the Edge.
  return response;
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
