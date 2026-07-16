/*
 * PATCH /api/units/:id — переименование единицы измерения
 * DELETE /api/units/:id — удаление единицы измерения (только ADMIN)
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";
import { Role } from "@prisma/client";

const ALLOWED_ROLES: Role[] = [
  Role.ADMIN,
  Role.HEAD_OF_SUPPLY,
  Role.SUPPLY_DEPT,
  Role.WAREHOUSE,
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.roles.some((r) => ALLOWED_ROLES.includes(r as Role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const raw: string | undefined = body?.title;

    if (!raw || typeof raw !== "string" || !raw.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const value = raw.trim().toUpperCase();

    const dup = await db.unit.findFirst({
      where: { title: value, NOT: { id } },
    });
    if (dup) {
      return NextResponse.json(
        { error: "Единица измерения с таким названием уже существует" },
        { status: 409 },
      );
    }

    const updated = await db.unit.update({
      where: { id },
      data: { title: value },
      select: { id: true, title: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.roles.includes(Role.ADMIN)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;

    const inUse = await db.orderItem.count({ where: { unitId: id } });
    if (inUse > 0) {
      return NextResponse.json(
        { error: `Единица измерения используется в ${inUse} позициях заявок. Сначала удалите или замените их.` },
        { status: 409 },
      );
    }

    await db.unit.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
