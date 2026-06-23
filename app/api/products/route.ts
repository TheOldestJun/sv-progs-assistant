/*
 * API: /api/products
 * GET  — список всех продуктов (сортировка по title)
 * POST — создание продукта (title → UPPERCASE, проверка на дубликат)
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

  const products = await db.product.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  return NextResponse.json(products);
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

  const existing = await db.product.findFirst({
    where: { title },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Product already exists", product: existing },
      { status: 409 },
    );
  }

  const product = await db.product.create({
    data: { title },
    select: { id: true, title: true },
  });

  return NextResponse.json(product, { status: 201 });
}
