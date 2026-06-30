/*
 * API route factory — создаёт типовые GET/POST обработчики
 * для справочных моделей (Product, Unit, Requester).
 * Сокращает дублирование между /api/products, /api/units, /api/requesters.
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";

type DbModel = "product" | "unit" | "requester";

interface FactoryOptions {
  model: DbModel;
  /** Как называется поле в БД (title для Product/Unit, name для Requester) */
  field: "title" | "name";
  /** Нужно ли UPPERCASE значение */
  uppercase?: boolean;
  /** Возвращать ли в формате AutocompleteItem ({ id, title }) */
  asAutocompleteItem?: boolean;
}

export function createHandlers(opts: FactoryOptions) {
  const { model, field, uppercase, asAutocompleteItem } = opts;

  const dbModel = db[model] as unknown as {
    findMany: (args: {
      select?: Record<string, boolean>;
      orderBy?: Record<string, string>;
    }) => Promise<Record<string, unknown>[]>;
    findFirst: (args: { where: Record<string, string> }) => Promise<Record<string, unknown> | null>;
    create: (args: {
      data: Record<string, string>;
      select: Record<string, boolean>;
    }) => Promise<Record<string, unknown>>;
  };

  const errorLabel = model.charAt(0).toUpperCase() + model.slice(1);
  const conflictMsg = `${errorLabel} already exists`;

  return {
    async GET() {
      const session = await getSession();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const items = await dbModel.findMany({
        select: { id: true, [field]: true },
        orderBy: { [field]: "asc" },
      });

      if (asAutocompleteItem) {
        const mapped = (items as Record<string, unknown>[]).map((i) => ({
          id: i.id as string,
          title: i[field] as string,
        }));
        return NextResponse.json(mapped);
      }

      return NextResponse.json(items);
    },

    async POST(request: Request) {
      const session = await getSession();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const raw: string | undefined = body?.[field];

      if (!raw || typeof raw !== "string" || !raw.trim()) {
        return NextResponse.json(
          { error: `${field.charAt(0).toUpperCase() + field.slice(1)} is required` },
          { status: 400 },
        );
      }

      const value = uppercase ? raw.trim().toUpperCase() : raw.trim();

      const existing = await dbModel.findFirst({ where: { [field]: value } });
      if (existing) {
        const existingItem = (existing as Record<string, unknown>);
        return NextResponse.json(
          {
            error: conflictMsg,
            [model]: asAutocompleteItem
              ? { id: existingItem.id, title: existingItem[field] }
              : existing,
          },
          { status: 409 },
        );
      }

      const created = await dbModel.create({
        data: { [field]: value },
        select: { id: true, [field]: true },
      });

      const result = asAutocompleteItem
        ? { id: created.id as string, title: created[field] as string }
        : created;

      return NextResponse.json(result, { status: 201 });
    },
  };
}
