import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const apiKey = request.cookies.get("apiKey")?.value;

  if (!apiKey) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/invoices/:path*"],
};
