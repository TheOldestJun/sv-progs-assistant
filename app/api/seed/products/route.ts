import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

const PRODUCTS = [
  "МУКА ПШЕНИЧНАЯ",
  "САХАРНЫЙ ПЕСОК",
  "МАСЛО ПОДСОЛНЕЧНОЕ",
  "РИС ШЛИФОВАННЫЙ",
  "ГРЕЧКА",
];

export async function GET() {
  const created: string[] = [];

  for (const title of PRODUCTS) {
    const existing = await db.product.findFirst({ where: { title } });
    if (!existing) {
      await db.product.create({ data: { title } });
      created.push(title);
    }
  }

  const message =
    created.length > 0
      ? `Products created: ${created.join(", ")}`
      : "All products already exist";

  return NextResponse.json({ message });
}
