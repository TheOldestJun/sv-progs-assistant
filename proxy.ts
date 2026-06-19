/*
 * Middleware:
 * - /admin/* — только ADMIN
 * - /change-password, /dashboard — любой аутентифицированный пользователь
 * Редиректит на /login при отсутствии/невалидности токена.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET не задан в .env");
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

async function requireAuth(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("session")?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * /change-password и /dashboard — защищённые маршруты,
   * доступны любому аутентифицированному пользователю.
   */
  if (pathname === "/change-password" || pathname === "/dashboard") {
    const authed = await requireAuth(request);
    if (!authed) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const token = request.cookies.get("session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const roles = (payload.roles as string[]) || [];
    if (!roles.includes("ADMIN")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/change-password", "/dashboard"],
};
