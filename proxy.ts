/*
 * Middleware:
 * - /admin/* — только ADMIN
 * - /change-password, /dashboard — любой аутентифицированный пользователь
 * Редиректит на /login при отсутствии/невалидности токена.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./app/lib/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("session")?.value;
  const session = token ? await verifyToken(token) : null;

  if (pathname === "/change-password" || pathname === "/dashboard") {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  if (!pathname.startsWith("/admin")) return NextResponse.next();

  if (!session || !session.roles.includes("ADMIN" as never)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/change-password", "/dashboard"],
};
