import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/forgot-password(.*)",
  "/",
  "/api/webhook(.*)",

   "/view(.*)", // ✅ customer portal
  "/api/portal-status(.*)", // ✅ polling API
  
  "/api/cron(.*)",
]);

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);
const isApiRoute = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const authObject = await auth();
  const { userId, sessionClaims } = authObject; 
  
  const isPublic = isPublicRoute(req);
  const isVisitingOnboarding = isOnboardingRoute(req);
  const isApi = isApiRoute(req);

  if (req.nextUrl.pathname.startsWith("/api/webhook")) {
    return NextResponse.next();
  }

  if (!isPublic && !userId) {
    await auth.protect(); 
  }

  if (userId) {
    const hasOnboarded = (sessionClaims?.metadata as { onboardingComplete?: boolean })?.onboardingComplete === true;

    if (
      req.nextUrl.pathname.startsWith("/sign-in") ||
      req.nextUrl.pathname.startsWith("/sign-up")
    ) {
      const redirectUrl = hasOnboarded ? "/dashboard" : "/onboarding";
      return NextResponse.redirect(new URL(redirectUrl, req.url));
    }

    if (isApi) {
      return NextResponse.next();
    }

    if (hasOnboarded && isVisitingOnboarding) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (!hasOnboarded && !isVisitingOnboarding && !isPublic) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};