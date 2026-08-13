/*
 * PATCH /api/dishes/:id — обновление блюда (название/тип/цена)
 * DELETE /api/dishes/:id — удаление блюда (только ADMIN)
 * Только снабжение + админ.
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";
import { Role, DishType } from "@prisma/client";
import { verifyCsrf } from "@/app/lib/csrf";
import { handleApiError } from "@/app/lib/api-errors";

const WRITE_ROLES: Role[] = [Role.ADMIN, Role.HEAD_OF_SUPPLY, Role.SUPPLY_DEPT];

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

    const data: { name?: string; price?: number; type?: DishType } = {};

    if (body?.name !== undefined) {
      const raw: string = body.name;
      if (typeof raw !== "string" || !raw.trim()) {
        return NextResponse.json({ error: "Название блюда обязательно" }, { status: 400 });
      }
      const name = raw.trim().toUpperCase();
      const dup = await db.dish.findFirst({ where: { name, NOT: { id } } });
      if (dup) {
        return NextResponse.json(
          { error: "Блюдо с таким названием уже существует" },
          { status: 409 },
        );
      }
      data.name = name;
    }

    if (body?.type !== undefined) {
      const typeRaw: unknown = body.type;
      if (typeof typeRaw !== "string" || !(typeRaw in DishType)) {
        return NextResponse.json({ error: "Некорректный тип блюда" }, { status: 400 });
      }
      data.type = typeRaw as DishType;
    }

    if (body?.price !== undefined) {
      const priceRaw: unknown = body.price;
      if (typeof priceRaw !== "number" || !Number.isFinite(priceRaw) || priceRaw < 0) {
        return NextResponse.json({ error: "Некорректная цена" }, { status: 400 });
      }
      data.price = priceRaw;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 });
    }

    const dish = await db.dish.update({
      where: { id },
      data,
      select: { id: true, name: true, type: true, price: true, active: true },
    });

    return NextResponse.json({ dish });
  } catch (error) {
    return handleApiError(error, "dishes / [id]");
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
    // Блюда не имеют внешних связей в БД (недельное меню хранится в localStorage),
    // поэтому удаление безопасно. Устаревшие id в сохранённых меню просто
    // игнорируются (dishById.get(id) → undefined).
    await db.dish.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "dishes / [id] DELETE");
  }
}
