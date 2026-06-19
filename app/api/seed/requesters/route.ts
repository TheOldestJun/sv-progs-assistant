import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

const REQUESTERS = [
  "Иванов Иван Иванович",
  "Петров Пётр Петрович",
  "Сидорова Анна Сергеевна",
];

export async function GET() {
  const created: string[] = [];

  for (const name of REQUESTERS) {
    const existing = await db.requester.findFirst({ where: { name } });
    if (!existing) {
      await db.requester.create({ data: { name } });
      created.push(name);
    }
  }

  const message =
    created.length > 0
      ? `Requesters created: ${created.join(", ")}`
      : "All requesters already exist";

  return NextResponse.json({ message });
}
