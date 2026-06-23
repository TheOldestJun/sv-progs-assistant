/*
 * API: /api/units
 * GET  — список всех единиц измерения (сортировка по title)
 * POST — создание новой единицы (title → UPPERCASE, проверка на дубликат)
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

  const units = await db.unit.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  return NextResponse.json(units);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const raw: string | undefined = body?.title;

  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const title = raw.trim().toUpperCase();

  const existing = await db.unit.findFirst({
    where: { title },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Unit already exists", unit: existing },
      { status: 409 },
    );
  }

  const unit = await db.unit.create({
    data: { title },
    select: { id: true, title: true },
  });

  return NextResponse.json(unit, { status: 201 });
}
