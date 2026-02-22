import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;

    // If admin tries to access /dashboard, redirect to /admin
    if (req.nextUrl.pathname.startsWith("/dashboard") && token?.role === "admin") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    // If user tries to access /admin, redirect to /dashboard
    if (req.nextUrl.pathname.startsWith("/admin") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
