/*
 * GET /api/auth/me — возвращает имя текущего пользователя из сессии
 */
import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ name: session.name });
}
