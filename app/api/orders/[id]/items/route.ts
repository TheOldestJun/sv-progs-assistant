/*
 * POST /api/orders/:id/items — добавить новую позицию в существующую заявку (только ADMIN).
 * Тело: { productId, unitId, quantity, comment? }
 * Возвращает созданную позицию с product.title и units.title.
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";
import { verifyCsrf } from "@/app/lib/csrf";

const PRODUCT_EDIT_ROLES = ["ADMIN", "HEAD_OF_SUPPLY", "SUPPLY_DEPT", "WAREHOUSE"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyCsrf(request).valid) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  const session = await getSession();
  if (!session || !session.roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;

    const order = await db.order.findUnique({ where: { id }, select: { id: true } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const body = await request.json();
    const { productId, unitId, quantity, comment } = body;

    if (!productId || !unitId || !quantity) {
      return NextResponse.json(
        { error: "productId, unitId, and quantity are required" },
        { status: 400 },
      );
    }
    if (typeof quantity !== "number" || quantity <= 0) {
      return NextResponse.json({ error: "Quantity must be a positive number" }, { status: 400 });
    }

    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    const unit = await db.unit.findUnique({ where: { id: unitId } });
    if (!unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    const item = await db.orderItem.create({
      data: {
        orderId: id,
        productId,
        unitId,
        quantity,
        comment: comment || null,
      },
      include: {
        product: { select: { title: true } },
        units: { select: { title: true } },
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("[POST /api/orders/:id/items] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
