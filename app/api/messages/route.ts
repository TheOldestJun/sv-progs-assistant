/*
 * GET  /api/messages — список диалогов (последнее сообщение с каждым собеседником)
 * POST /api/messages — отправить сообщение
 *
 * Сообщения старше 3 лет автоматически удаляются при любом запросе.
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";
import { verifyCsrf } from "@/app/lib/csrf";

const RETENTION_MS = 3 * 365 * 24 * 60 * 60 * 1000; // 3 года

async function cleanupOldMessages() {
  const cutoff = new Date(Date.now() - RETENTION_MS);
  await db.message.deleteMany({ where: { createdAt: { lt: cutoff } } });
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await cleanupOldMessages();
    const userId = session.id;
    const messages = await db.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
      },
    });

    const conversationsMap = new Map<string, {
      user: { id: string; name: string };
      lastMessage: typeof messages[0];
      unreadCount: number;
    }>();

    for (const msg of messages) {
      const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      const otherName = msg.senderId === userId ? msg.receiver.name : msg.sender.name;
      if (!conversationsMap.has(otherId)) {
        conversationsMap.set(otherId, {
          user: { id: otherId, name: otherName },
          lastMessage: msg,
          unreadCount: 0,
        });
      }
      if (msg.receiverId === userId && !msg.readAt) {
        conversationsMap.get(otherId)!.unreadCount++;
      }
    }

    const conversations = Array.from(conversationsMap.values());
    return NextResponse.json(conversations);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const csrf = verifyCsrf(request);
  if (!csrf.valid) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  try {
    const { receiverId, text } = await request.json();
    if (!receiverId || !text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "receiverId and text are required" }, { status: 400 });
    }

    const receiver = await db.user.findUnique({ where: { id: receiverId } });
    if (!receiver) {
      return NextResponse.json({ error: "Receiver not found" }, { status: 404 });
    }

    const message = await db.message.create({
      data: {
        senderId: session.id,
        receiverId,
        text: text.trim(),
      },
      include: {
        sender: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
      },
    });

    await cleanupOldMessages();

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
