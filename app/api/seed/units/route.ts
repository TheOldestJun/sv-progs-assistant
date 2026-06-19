import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

const UNITS = ["шт", "кг", "л", "м", "уп"];

export async function GET() {
  const created: string[] = [];

  for (const title of UNITS) {
    const existing = await db.unit.findFirst({ where: { title } });
    if (!existing) {
      await db.unit.create({ data: { title } });
      created.push(title);
    }
  }

  const message =
    created.length > 0
      ? `Units created: ${created.join(", ")}`
      : "All units already exist";

  return NextResponse.json({ message });
}
