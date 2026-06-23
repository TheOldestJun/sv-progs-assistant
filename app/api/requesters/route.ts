/*
 * API: /api/requesters
 * GET  — список заявителей (возвращается как AutocompleteItem[])
 * POST — создание нового заявителя (проверка на дубликат)
 * Требуется аутентификация.
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requesters = await db.requester.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const mapped = requesters.map((r) => ({ id: r.id, title: r.name }));

  return NextResponse.json(mapped);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const raw: string | undefined = body?.name;

  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const name = raw.trim();

  const existing = await db.requester.findFirst({
    where: { name },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Requester already exists", requester: { id: existing.id, title: existing.name } },
      { status: 409 },
    );
  }

  const requester = await db.requester.create({
    data: { name },
    select: { id: true, name: true },
  });

  return NextResponse.json({ id: requester.id, title: requester.name }, { status: 201 });
}
