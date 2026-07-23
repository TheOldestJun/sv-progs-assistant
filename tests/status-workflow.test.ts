import { describe, it, expect } from "vitest";
import type { OrderItemStatus, Role } from "@prisma/client";

// Типы и константы, дублирующие бизнес-логику из PATCH /api/orders/:id/items/:itemId
// для тестирования правил transition без БД.

const STATUS_ORDER: OrderItemStatus[] = [
  "ACCEPTED",
  "INVOICE_RECEIVED",
  "INVOICE_PAID",
  "SHIPPED",
  "RECEIVED",
  "SENT_TO_REQUESTER",
  "ORDER_CONFIRMED",
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

// Статусы, которые может менять только склад (или админ)
const WAREHOUSE_ONLY_STATUSES: OrderItemStatus[] = ["RECEIVED", "SENT_TO_REQUESTER", "ORDER_CONFIRMED"];

function validateTransition(
  currentStatus: OrderItemStatus,
  newStatus: OrderItemStatus,
  roles: Role[],
  warehouseMode: boolean,
): TransitionRule {
  // Нельзя менять после ORDER_CONFIRMED (финальный статус)
  if (currentStatus === "ORDER_CONFIRMED") {
    return { canTransition: false, reason: "Нельзя изменить статус после подтверждения получения заказчиком" };
  }

  // Тот же статус — не ошибка, но и не переход
  if (currentStatus === newStatus) {
    return { canTransition: false, reason: "Новый статус совпадает с текущим" };
  }

  // Warehouse mode: только WAREHOUSE, только WAREHOUSE_ONLY_STATUSES
  if (warehouseMode) {
    if (!roles.includes("WAREHOUSE")) {
      return { canTransition: false, reason: "Только кладовщик может выполнять это действие" };
    }
    if (!WAREHOUSE_ONLY_STATUSES.includes(newStatus)) {
      return { canTransition: false, reason: "Кладовщик может только RECEIVE, SENT_TO_REQUESTER или ORDER_CONFIRMED" };
    }
  }

  // Не-warehouse: WAREHOUSE_ONLY_STATUSES запрещены для всех, кроме WAREHOUSE и ADMIN
  if (!warehouseMode && WAREHOUSE_ONLY_STATUSES.includes(newStatus) && !roles.includes("ADMIN")) {
    return { canTransition: false, reason: "Только кладовщик может выполнять это действие" };
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

    it("allows RECEIVED → SENT_TO_REQUESTER (warehouse mode)", () => {
      const result = validateTransition("RECEIVED", "SENT_TO_REQUESTER", ["WAREHOUSE"], true);
      expect(result.canTransition).toBe(true);
    });

    it("allows SENT_TO_REQUESTER → ORDER_CONFIRMED (warehouse mode)", () => {
      const result = validateTransition("SENT_TO_REQUESTER", "ORDER_CONFIRMED", ["WAREHOUSE"], true);
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

    it("rejects skipping from SHIPPED to SENT_TO_REQUESTER", () => {
      const result = validateTransition("SHIPPED", "SENT_TO_REQUESTER", ["WAREHOUSE"], true);
      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain("перескочить");
    });
  });

  describe("role restrictions", () => {
    it("rejects RECEIVED without warehouse mode and non-warehouse, non-admin role", () => {
      const result = validateTransition("SHIPPED", "RECEIVED", ["SUPPLY_DEPT"], false);
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

    it("rejects non-warehouse status in warehouse mode", () => {
      const result = validateTransition("ACCEPTED", "INVOICE_RECEIVED", ["WAREHOUSE"], true);
      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain("Кладовщик");
    });

    it("rejects SENT_TO_REQUESTER without warehouse mode and non-admin", () => {
      const result = validateTransition("RECEIVED", "SENT_TO_REQUESTER", ["SUPPLY_DEPT"], false);
      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain("Только кладовщик");
    });

    it("allows SENT_TO_REQUESTER without warehouse mode but with ADMIN role", () => {
      const result = validateTransition("RECEIVED", "SENT_TO_REQUESTER", ["ADMIN"], false);
      expect(result.canTransition).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("rejects change after ORDER_CONFIRMED", () => {
      const result = validateTransition("ORDER_CONFIRMED", "SHIPPED", ["ADMIN"], false);
      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain("подтверждения получения заказчиком");
    });

    it("rejects same status (no-op)", () => {
      const result = validateTransition("ACCEPTED", "ACCEPTED", ["ADMIN"], false);
      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain("совпадает");
    });

    it("allows full lifecycle for warehouse", () => {
      const steps: [OrderItemStatus, OrderItemStatus][] = [
        ["SHIPPED", "RECEIVED"],
        ["RECEIVED", "SENT_TO_REQUESTER"],
        ["SENT_TO_REQUESTER", "ORDER_CONFIRMED"],
      ];
      for (const [from, to] of steps) {
        const result = validateTransition(from, to, ["WAREHOUSE"], true);
        expect(result.canTransition).toBe(true);
      }
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
