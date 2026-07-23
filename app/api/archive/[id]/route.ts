/*
 * DELETE /api/archive/:id — полное удаление записи из архива (только ADMIN)
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";
import { verifyCsrf } from "@/app/lib/csrf";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const csrf = verifyCsrf(request);
  if (!csrf.valid) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  const session = await getSession();
  if (!session || !session.roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await db.archivedOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
