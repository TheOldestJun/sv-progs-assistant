/*
 * PATCH /api/messages/read — отметить сообщения от конкретного пользователя как прочитанные
 * Body: { senderId: string }
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";
import { verifyCsrf } from "@/app/lib/csrf";
import { handleApiError } from "@/app/lib/api-errors";

export async function PATCH(request: Request) {
  const csrf = verifyCsrf(request);
  if (!csrf.valid) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { senderId } = await request.json();
    if (!senderId) {
      return NextResponse.json({ error: "senderId is required" }, { status: 400 });
    }

    await db.message.updateMany({
      where: { senderId, receiverId: session.id, readAt: null },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "messages / read");
  }
}