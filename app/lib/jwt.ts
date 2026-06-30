/*
 * Shared JWT utilities для auth.ts и proxy.ts
 */
import { jwtVerify, SignJWT } from "jose";
import { Role } from "@/app/generated/prisma/enums";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET не задан в .env");
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  roles: Role[];
}

export function getJwtSecret(): Uint8Array {
  return JWT_SECRET;
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const roles = (payload.roles as Role[]) || [];
    return {
      id: payload.sub as string,
      name: (payload.name as string) || "",
      email: payload.email as string,
      roles: roles.includes("ADMIN" as Role) ? (Object.values(Role) as Role[]) : roles,
    };
  } catch {
    return null;
  }
}

export async function signToken(
  payload: { sub: string; name: string; email: string; roles: Role[] },
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}
