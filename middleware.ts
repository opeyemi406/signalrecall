import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const isLoggedIn = Boolean(req.auth);

  const protectedPrefixes = [
    "/dashboard",
    "/signals",
    "/history",
    "/track-record",
    "/memory",
    "/alerts",
  ];

  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(`${pathname}${search}`);
    const signInUrl = new URL(
      `/auth/signin?callbackUrl=${callbackUrl}`,
      req.nextUrl.origin
    );
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
