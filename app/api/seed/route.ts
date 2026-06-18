/*
 * API-роут для первичного создания администратора.
 * Безопасен: создаёт admin@mail.com только если его ещё нет.
 * Назначает все роли: ADMIN, HEAD_OF_SUPPLY, SUPPLY_DEPT, WAREHOUSE.
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/app/lib/db";

export async function GET() {
  const existing = await db.user.findUnique({
    where: { email: "admin@mail.com" },
  });

  if (existing) {
    return NextResponse.json({ message: "Admin already exists" });
  }

  const hashed = await bcrypt.hash("admin123", 12);
  await db.user.create({
    data: {
      name: "Admin",
      email: "admin@mail.com",
      password: hashed,
      roles: {
        create: [
          { role: "ADMIN" },
          { role: "HEAD_OF_SUPPLY" },
          { role: "SUPPLY_DEPT" },
          { role: "WAREHOUSE" },
        ],
      },
    },
  });

  return NextResponse.json({ message: "Admin created successfully" });
}
