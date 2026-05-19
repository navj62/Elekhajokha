import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/",
  "/api/webhook(.*)", // 👈 Changed: removed the '/' before (.*) to be safer
  "/api/cron(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // 1. Check if it's a public route first
  const isPublic = isPublicRoute(req);

  // 2. Optimization: If it's a webhook, let it through immediately
  if (req.nextUrl.pathname.startsWith("/api/webhook")) {
    return NextResponse.next();
  }

  const { userId } = await auth();

  // 3. Prevent logged-in users from seeing sign-in/up pages
  if (
    userId &&
    (req.nextUrl.pathname.startsWith("/sign-in") ||
      req.nextUrl.pathname.startsWith("/sign-up"))
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 4. Protect everything else that isn't public
  if (!isPublic) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};