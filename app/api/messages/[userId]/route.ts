/*
 * GET /api/messages/:userId — переписка с конкретным пользователем
 *
 * Сообщения старше 3 лет автоматически удаляются при любом запросе.
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";
import { handleApiError } from "@/app/lib/api-errors";

const RETENTION_MS = 3 * 365 * 24 * 60 * 60 * 1000;

async function cleanupOldMessages() {
  const cutoff = new Date(Date.now() - RETENTION_MS);
  await db.message.deleteMany({ where: { createdAt: { lt: cutoff } } });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await cleanupOldMessages();
    const { userId } = await params;
    const messages = await db.message.findMany({
      where: {
        OR: [
          { senderId: session.id, receiverId: userId },
          { senderId: userId, receiverId: session.id },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    return handleApiError(error, "messages / [userId]");
  }
}