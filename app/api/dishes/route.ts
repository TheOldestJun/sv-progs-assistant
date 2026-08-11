/*
 * /api/dishes — справочник блюд для кухни (MenuPlanner).
 * GET  — список всех блюд (для любого авторизованного)
 * POST — создание блюда (только снабжение + админ)
 * Имена нормализуются в верхний регистр, дубликаты отклоняются (409).
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";
import { Role, DishType } from "@prisma/client";
import { verifyCsrf } from "@/app/lib/csrf";
import { handleApiError } from "@/app/lib/api-errors";

const WRITE_ROLES: Role[] = [Role.ADMIN, Role.HEAD_OF_SUPPLY, Role.SUPPLY_DEPT];

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dishes = await db.dish.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        price: true,
        active: true,
      },
    });
    return NextResponse.json({ dishes });
  } catch (error) {
    return handleApiError(error, "dishes / GET");
  }
}

export async function POST(request: Request) {
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
    const body = await request.json();
    const raw: string | undefined = body?.name;
    if (!raw || typeof raw !== "string" || !raw.trim()) {
      return NextResponse.json({ error: "Название блюда обязательно" }, { status: 400 });
    }

    const name = raw.trim().toUpperCase();

    const dup = await db.dish.findFirst({ where: { name } });
    if (dup) {
      return NextResponse.json(
        { error: "Блюдо с таким названием уже существует" },
        { status: 409 },
      );
    }

    const typeRaw: string | undefined = body?.type;
    const type = typeRaw && typeRaw in DishType ? (typeRaw as DishType) : DishType.SOUP;
    const priceRaw: unknown = body?.price;
    const price =
      typeof priceRaw === "number" && Number.isFinite(priceRaw) && priceRaw >= 0
        ? priceRaw
        : 0;

    const dish = await db.dish.create({
      data: { name, type, price },
      select: { id: true, name: true, type: true, price: true, active: true },
    });

    return NextResponse.json({ dish }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "dishes / POST");
  }
}
