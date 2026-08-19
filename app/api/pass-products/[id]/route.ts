/*
 * PATCH /api/pass-products/:id — переименование ТМЦ пропусков
 * DELETE /api/pass-products/:id — удаление (только ADMIN, проверка связей не нужна — связей нет)
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";
import { Role } from "@prisma/client";
import { verifyCsrf } from "@/app/lib/csrf";
import { handleApiError } from "@/app/lib/api-errors";

const WRITE_ROLES: Role[] = [
  Role.ADMIN,
  Role.HEAD_OF_SUPPLY,
  Role.SUPPLY_DEPT,
  Role.WAREHOUSE,
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const csrf = verifyCsrf(request);
  if (!csrf.valid) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.roles.some((r) => WRITE_ROLES.includes(r as Role))) {
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

    const dup = await db.passProduct.findFirst({
      where: { title: value, NOT: { id } },
    });
    if (dup) {
      return NextResponse.json(
        { error: "ТМЦ с таким названием уже существует" },
        { status: 409 },
      );
    }

    const updated = await db.passProduct.update({
      where: { id },
      data: { title: value },
      select: { id: true, title: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error, "pass-products / [id]");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const csrf = verifyCsrf(request);
  if (!csrf.valid) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.roles.includes(Role.ADMIN)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await db.passProduct.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "pass-products / [id] DELETE");
  }
}
