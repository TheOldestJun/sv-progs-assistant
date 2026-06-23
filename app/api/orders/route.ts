/*
 * API: /api/orders
 * POST — создание заявки с позициями (requesterId + items[{productId, unitId, quantity}])
 * Валидация входных данных, создание Order + OrderItem через вложенный create.
 * Требуется аутентификация.
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { requesterId, items, notes } = body;

  if (!requesterId || !items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "requesterId and items are required" },
      { status: 400 },
    );
  }

  for (const item of items) {
    if (!item.productId || !item.unitId || !item.quantity) {
      return NextResponse.json(
        { error: "Each item must have productId, unitId, and quantity" },
        { status: 400 },
      );
    }
  }

  try {
    const order = await db.order.create({
      data: {
        requesterId,
        notes: notes || null,
        items: {
          create: items.map((item: { productId: string; unitId: string; quantity: number }) => ({
            productId: item.productId,
            unitId: item.unitId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        requester: { select: { name: true } },
        items: {
          include: {
            product: { select: { title: true } },
            units: { select: { title: true } },
          },
        },
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
