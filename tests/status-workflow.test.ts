import { describe, it, expect } from "vitest";

// Типы и константы, дублирующие бизнес-логику из PATCH /api/orders/:id/items/:itemId
// для тестирования правил transition без БД.
type OrderItemStatus = "ACCEPTED" | "INVOICE_RECEIVED" | "INVOICE_PAID" | "SHIPPED" | "RECEIVED";
type Role = "ADMIN" | "HEAD_OF_SUPPLY" | "SUPPLY_DEPT" | "WAREHOUSE" | "REQUESTER";

const STATUS_ORDER: OrderItemStatus[] = [
  "ACCEPTED",
  "INVOICE_RECEIVED",
  "INVOICE_PAID",
  "SHIPPED",
  "RECEIVED",
];

function isSequentialTransition(from: OrderItemStatus, to: OrderItemStatus): boolean {
  const fromIdx = STATUS_ORDER.indexOf(from);
  const toIdx = STATUS_ORDER.indexOf(to);
  return toIdx === fromIdx + 1;
}

interface TransitionRule {
  /** Можно ли перейти из from в to */
  canTransition: boolean;
  /** Причина отказа */
  reason?: string;
}

function validateTransition(
  currentStatus: OrderItemStatus,
  newStatus: OrderItemStatus,
  roles: Role[],
  warehouseMode: boolean,
): TransitionRule {
  // Нельзя менять после RECEIVED
  if (currentStatus === "RECEIVED") {
    return { canTransition: false, reason: "Нельзя изменить статус после получения товара на склад" };
  }

  // Тот же статус — не ошибка, но и не переход
  if (currentStatus === newStatus) {
    return { canTransition: false, reason: "Новый статус совпадает с текущим" };
  }

  // Warehouse mode: только WAREHOUSE, только RECEIVED
  if (warehouseMode) {
    if (!roles.includes("WAREHOUSE")) {
      return { canTransition: false, reason: "Только кладовщик может подтвердить получение товара" };
    }
    if (newStatus !== "RECEIVED") {
      return { canTransition: false, reason: "Кладовщик может только подтвердить получение товара (RECEIVED)" };
    }
  }

  // Не-warehouse: RECEIVED запрещён для всех, кроме WAREHOUSE
  if (!warehouseMode && newStatus === "RECEIVED") {
    return { canTransition: false, reason: "Только кладовщик может подтвердить получение товара" };
  }

  // Sequential check
  if (!isSequentialTransition(currentStatus, newStatus)) {
    return { canTransition: false, reason: `Нельзя перескочить статус: ${currentStatus} → ${newStatus}` };
  }

  return { canTransition: true };
}

describe("Status workflow", () => {
  describe("sequential transitions", () => {
    it("allows ACCEPTED → INVOICE_RECEIVED", () => {
      const result = validateTransition("ACCEPTED", "INVOICE_RECEIVED", ["ADMIN"], false);
      expect(result.canTransition).toBe(true);
    });

    it("allows INVOICE_RECEIVED → INVOICE_PAID", () => {
      const result = validateTransition("INVOICE_RECEIVED", "INVOICE_PAID", ["ADMIN"], false);
      expect(result.canTransition).toBe(true);
    });

    it("allows INVOICE_PAID → SHIPPED", () => {
      const result = validateTransition("INVOICE_PAID", "SHIPPED", ["ADMIN"], false);
      expect(result.canTransition).toBe(true);
    });

    it("allows SHIPPED → RECEIVED (warehouse mode)", () => {
      const result = validateTransition("SHIPPED", "RECEIVED", ["WAREHOUSE"], true);
      expect(result.canTransition).toBe(true);
    });

    it("rejects skipping a step: ACCEPTED → INVOICE_PAID", () => {
      const result = validateTransition("ACCEPTED", "INVOICE_PAID", ["ADMIN"], false);
      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain("перескочить");
    });

    it("rejects ACCEPTED → RECEIVED (skip + non-warehouse)", () => {
      const result = validateTransition("ACCEPTED", "RECEIVED", ["ADMIN"], false);
      expect(result.canTransition).toBe(false);
    });

    it("rejects going backwards: INVOICE_PAID → INVOICE_RECEIVED", () => {
      const result = validateTransition("INVOICE_PAID", "INVOICE_RECEIVED", ["ADMIN"], false);
      expect(result.canTransition).toBe(false);
    });
  });

  describe("role restrictions", () => {
    it("rejects RECEIVED without warehouse mode and non-warehouse role", () => {
      const result = validateTransition("SHIPPED", "RECEIVED", ["ADMIN"], false);
      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain("Только кладовщик");
    });

    it("rejects RECEIVED in warehouse mode but without WAREHOUSE role", () => {
      const result = validateTransition("SHIPPED", "RECEIVED", ["ADMIN"], true);
      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain("Только кладовщик");
    });

    it("allows RECEIVED with WAREHOUSE role in warehouse mode", () => {
      const result = validateTransition("SHIPPED", "RECEIVED", ["WAREHOUSE"], true);
      expect(result.canTransition).toBe(true);
    });

    it("rejects non-RECEIVED status in warehouse mode", () => {
      const result = validateTransition("ACCEPTED", "INVOICE_RECEIVED", ["WAREHOUSE"], true);
      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain("может только подтвердить получение");
    });
  });

  describe("edge cases", () => {
    it("rejects change after RECEIVED", () => {
      const result = validateTransition("RECEIVED", "SHIPPED", ["ADMIN"], false);
      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain("после получения");
    });

    it("rejects same status (no-op)", () => {
      const result = validateTransition("ACCEPTED", "ACCEPTED", ["ADMIN"], false);
      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain("совпадает");
    });

    it("allows full lifecycle for non-warehouse roles", () => {
      const steps: [OrderItemStatus, OrderItemStatus][] = [
        ["ACCEPTED", "INVOICE_RECEIVED"],
        ["INVOICE_RECEIVED", "INVOICE_PAID"],
        ["INVOICE_PAID", "SHIPPED"],
      ];
      for (const [from, to] of steps) {
        const result = validateTransition(from, to, ["ADMIN"], false);
        expect(result.canTransition).toBe(true);
      }
    });
  });
});
